import dotenv from "dotenv";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Load environment variables
dotenv.config();

// Validate required API keys
const requiredKeys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY"];
for (const key of requiredKeys) {
  if (!process.env[key]) {
    throw new Error(`${key} is required but not found in environment variables`);
  }
}

// Initialize API clients
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Google API client will be added when implementing Google's API

// Default configurations for models
export const defaultModelConfigs = {
  openai: {
    model: "gpt-4o", // Latest model as of May 13, 2024
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
  },
  anthropic: {
    model: "claude-3-5-sonnet-20241022", // Latest model as of October 22, 2024
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
  },
  google: {
    model: "gemini-pro",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
  },
};

// Expose API keys for client-side validation (but not the actual keys)
export const hasValidApiKeys = {
  openai: Boolean(process.env.OPENAI_API_KEY),
  anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  google: Boolean(process.env.GOOGLE_API_KEY),
};