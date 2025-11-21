import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { plcDataSimulator } from "./simulator-service";

const app = express();

// Log database connection info on startup (redacted)
console.log('=== Database Connection Info ===');
const dbUrl = process.env.DATABASE_URL || '';
const dbParts = dbUrl.match(/postgresql:\/\/[^@]+@([^\/]+)\/(.+?)(\?|$)/);
if (dbParts) {
  console.log(`Database Host: ${dbParts[1]}`);
  console.log(`Database Name: ${dbParts[2]}`);
} else {
  console.log('Database URL format not recognized');
}

// URL rewrite middleware MUST be before any other middleware
// This handles /api/v1/* and duplicate /api/api/* paths
app.use((req, res, next) => {
  // Fix duplicate /api/api/ paths
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  // Map /api/v1/* to /api/* for versioning support
  if (req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace('/api/v1/', '/api/');
  }
  next();
});

// Set request size limits for gateway data uploads (25MB for gateway endpoints)
// JSON parsing MUST come after URL rewrites but before routes
app.use(express.json({
  limit: '25mb',
  type: ['application/json', 'application/*+json'],
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for potential gzip handling
    if (req.headers['content-encoding'] === 'gzip') {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({
  extended: false,
  limit: '25mb'
}));

// Trust proxy for custom domains
app.set('trust proxy', 1);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register API routes first
  const server = await registerRoutes(app);

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", async () => {
    log(`Server running on port ${PORT}`);
    
    // Auto-start the PLC data simulator for testing
    try {
      const result = await plcDataSimulator.start();
      if (result.success) {
        console.log('[SIMULATOR] Auto-started PLC data simulator:', result.message);
      } else {
        console.error('[SIMULATOR] Failed to auto-start simulator:', result.message);
      }
    } catch (error) {
      console.error('[SIMULATOR] Error auto-starting simulator:', error);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Only serve static files in production mode
    // In development, Vite handles all static file serving
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // const port = 5000; // This is already defined and used in server.listen above.
  // server.listen({
  //   port,
  //   host: "0.0.0.0",
  //   reusePort: true,
  // }, () => {
  //   log(`serving on port ${port}`);
  // });
})();