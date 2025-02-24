import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  generateMetaPromptRequestSchema,
  evaluationRequestSchema,
} from "@shared/schema";
import {
  generateMetaPrompt,
  generateVariations,
  generateTestCases,
  evaluateResponse,
} from "./ai-providers";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Test endpoint to verify API is working
  router.get("/debug", (req, res) => {
    console.log("[Debug] API request received:", {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body
    });
    res.json({ 
      status: "API is working",
      timestamp: new Date().toISOString(),
      path: req.path
    });
  });

  // API Keys endpoint
  router.get("/keys", (req, res) => {
    try {
      const apiKeys = {
        VITE_OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        VITE_ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        VITE_GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      };

      res.header('Access-Control-Expose-Headers', 'X-API-Keys');
      res.header('X-API-Keys', JSON.stringify(apiKeys));
      res.json({ status: "ok" });
    } catch (error) {
      console.error("[API Keys] Error:", error);
      res.status(500).json({ 
        error: "Failed to process API keys",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Meta Prompts endpoint
  router.post("/meta-prompts", async (req, res) => {
    try {
      console.log("[Meta Prompt] Request received:", {
        body: req.body,
        headers: req.headers,
        url: req.originalUrl
      });

      // Validate request data
      const { basePrompt, modelConfig } = generateMetaPromptRequestSchema.parse(req.body);
      console.log("[Meta Prompt] Validated input:", { basePrompt, modelConfig });

      // Generate meta prompt
      const generatedPrompt = await generateMetaPrompt(basePrompt, modelConfig);
      console.log("[Meta Prompt] Generated prompt:", { generatedPrompt });

      // Save to storage
      const metaPrompt = await storage.createMetaPrompt({
        basePrompt,
        generatedPrompt,
        modelConfig,
      });

      console.log("[Meta Prompt] Created successfully:", { id: metaPrompt.id });
      res.json({ 
        id: metaPrompt.id,
        generatedPrompt: metaPrompt.generatedPrompt
      });
    } catch (error) {
      console.error("[Meta Prompt] Error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Variations endpoint
  router.post("/variations", async (req, res) => {
    try {
      const { metaPrompt, modelConfig } = req.body;
      const variations = await generateVariations(metaPrompt, modelConfig);
      res.json({ variations });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to generate variations",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test Cases endpoint
  router.post("/test-cases", async (req, res) => {
    try {
      const { metaPrompt, modelConfig } = req.body;
      const testCases = await generateTestCases(metaPrompt, modelConfig);
      res.json({ testCases });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to generate test cases",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Evaluation endpoint
  router.post("/evaluate", async (req, res) => {
    try {
      const { response, criterion, modelConfig } = req.body;
      const score = await evaluateResponse(response, criterion, modelConfig);
      res.json({ score });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to evaluate response",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Mount all routes under /api
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}