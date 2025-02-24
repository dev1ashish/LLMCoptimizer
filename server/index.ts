import express, { type Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Load environment variables first
dotenv.config();

// Validate required environment variables - only validate server-side keys
const requiredEnvVars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    log(`Warning: Missing environment variable: ${envVar}`);
  }
}

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-API-Keys');
  res.header('Access-Control-Expose-Headers', 'X-API-Keys');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

(async () => {
  try {
    // Register API routes first
    const server = await registerRoutes(app);

    // API Error handling middleware - only for /api routes
    app.use('/api', (err: Error, req: Request, res: Response, _next: NextFunction) => {
      log(`API Error: ${err.message}\n${err.stack}`);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal Server Error',
        timestamp: new Date().toISOString(),
      });
    });

    // API 404 handler - only for /api routes
    app.use('/api', (req: Request, res: Response) => {
      res.status(404).json({
        error: `API Not Found: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Setup Vite last - after all API routes
    // This will handle all non-API routes including "/"
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen({
      port,
      host: '0.0.0.0',
      reusePort: true,
    }, () => {
      log(`Server started on port ${port}`);
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();