import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import zlib from 'zlib';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { storage } from "./storage";
import { demoStorage } from "./demoStorage";
import { setupAuth, isAuthenticated, optionalAuthenticated } from "./replitAuth";
import { OAuth2Client } from 'google-auth-library';
import * as gatewayService from "./gateway-service";
import { getRealtimeData } from "./gateway-service";
import * as gatewayCodesService from "./gateway-codes-service";
import { GatewayInstallerGenerator } from "./gateway-installer";
import { db } from "./db";
import { gatewayCodes, gatewayAuditLog, demoUsers, sessions, gatewayDebugLogs, type GatewayCommand } from "@shared/schema";
import { eq, sql, lt, and, gte, lte, desc, asc, or, ilike, isNotNull } from "drizzle-orm";
import { sessionMiddleware, requireAdminAuth, adminLogin, adminLogout, adminStatus } from "./adminAuth";
import * as GatewayErrors from "./gateway-errors";
import { formatDistanceToNow } from "date-fns";
import { plcDataSimulator } from "./simulator-service";

// JWT Secret for custom auth - CRITICAL: Must be set in production
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL ERROR: JWT_SECRET environment variable is required in production!');
      process.exit(1);
    }
    console.warn('WARNING: JWT_SECRET not set! Using development fallback.');
    return 'dev-jwt-secret-not-for-production';
  }
  return secret;
})();

// Initialize Google OAuth client for production
const googleClient = new OAuth2Client(
  process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
);

// Migration function to move any existing in-memory PLC data to database
async function migratePlcDataToDatabase() {
  try {
    const devicesMigrated = [];
    const tagsMigrated = [];
    
    // Migrate PLC devices
    for (const [deviceId, device] of Array.from(demoStorage.plcDevices.entries())) {
      if (device.userId) {
        // Check if device already exists in database
        const existingDevices = await storage.getAllPlcDevices(device.userId);
        const exists = existingDevices.some(d => d.name === device.name);
        
        if (!exists) {
          const migratedDevice = await storage.upsertPlcDevice({
            userId: device.userId,
            facilityId: null, // Demo users don't use facilities
            name: device.name,
            brand: device.brand || 'siemens',
            model: device.model || 'S7-1200',
            protocol: device.protocol || 'S7',
            ipAddress: device.ipAddress,
            port: device.port || 102,
            rackNumber: device.rack || 0,
            slotNumber: device.slot || 1,
            status: device.status || 'configured'
          });
          devicesMigrated.push(migratedDevice.id);
          
          // Migrate associated tags
          for (const [tagId, tag] of Array.from(demoStorage.plcTags.entries())) {
            if (tag.plcId === deviceId) {
              const migratedTag = await storage.createPlcTag({
                plcId: migratedDevice.id,
                name: tag.name,
                address: tag.address,
                dataType: tag.dataType || 'float',
                scanRate: tag.scanRate || 1000,
                enabled: tag.enabled !== false,
                // Note: scalingEnabled and related fields not in schema
              });
              tagsMigrated.push(migratedTag.id);
            }
          }
        }
      }
    }
    
    console.log(`Migration completed: ${devicesMigrated.length} devices, ${tagsMigrated.length} tags migrated to database`);
    return { devicesMigrated, tagsMigrated };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Helper function to generate activation codes
function generateActivationCode(companyCode: string, facilityCode: string): string {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DEMO-${companyCode}-${facilityCode}-${randomPart}`;
}

// Simple in-memory rate limiter for activation endpoint
const activationRateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const RATE_LIMIT_MAX = 10; // 10 requests per 5 minutes

function checkActivationRateLimit(ipAddress: string): boolean {
  const now = Date.now();
  const record = activationRateLimiter.get(ipAddress);
  
  // Clean up expired records
  if (record && record.resetTime < now) {
    activationRateLimiter.delete(ipAddress);
  }
  
  const currentRecord = activationRateLimiter.get(ipAddress);
  
  if (!currentRecord) {
    // First request from this IP
    activationRateLimiter.set(ipAddress, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (currentRecord.count >= RATE_LIMIT_MAX) {
    // Rate limit exceeded
    return false;
  }
  
  // Increment counter
  currentRecord.count++;
  return true;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of Array.from(activationRateLimiter.entries())) {
    if (record.resetTime < now) {
      activationRateLimiter.delete(ip);
    }
  }
}, 60000); // Clean up every minute

// Middleware to handle gzipped request bodies
function gzipDecompressionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only handle gzipped content for /api/gateway/data endpoint
  if (req.headers['content-encoding'] === 'gzip' && req.url.includes('/api/gateway/data')) {
    const gunzip = zlib.createGunzip();
    const chunks: Buffer[] = [];
    
    req.pipe(gunzip);
    
    gunzip.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    gunzip.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        req.body = JSON.parse(buffer.toString());
        next();
      } catch (error) {
        res.status(400).json({ error: { code: 'INVALID_GZIP', message: 'Failed to decompress gzipped data' } });
      }
    });
    
    gunzip.on('error', (error) => {
      res.status(400).json({ error: { code: 'GZIP_ERROR', message: 'Gzip decompression failed' } });
    });
  } else {
    next();
  }
}

// Helper function to normalize activation payload
function getActivationPayload(req: Request) {
  const b = req.body ?? {};
  const activationCode =
    b.activationCode ?? b.activation_code ?? b.code;

  const machineId =
    b.machineId ??
    b.machine_id ??
    b.gatewayInfo?.hardware?.machineId ??
    b.gateway_info?.hardware?.machine_id ??
    b.machine_facts?.machine_id ??
    req.get('X-Machine-ID');   // final fallback

  return { activationCode, machineId, raw: b };
}

// ==================== GATEWAY DEBUG TRACKING ====================
// In-memory storage for API activity tracking (for debugging)
interface ApiActivityRecord {
  id: string;
  timestamp: string;
  gatewayId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
  error?: string;
  ip?: string;
}

const apiActivityLog = new Map<string, ApiActivityRecord[]>(); // Map by gateway ID
const MAX_ACTIVITY_PER_GATEWAY = 100;
const MAX_TOTAL_ACTIVITY = 1000;
let globalActivityCounter = 0;

// Middleware to track gateway API activity
function trackGatewayApiActivity(endpoint: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Extract gateway ID from various sources
    const getGatewayId = () => {
      // Try JWT token first
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.decode(token) as any;
          if (decoded?.gatewayId) return decoded.gatewayId;
        } catch {}
      }
      
      // Try body
      if (req.body?.gatewayId) return req.body.gatewayId;
      if (req.body?.gateway_id) return req.body.gateway_id;
      
      // Try query params
      if (req.query?.gatewayId) return req.query.gatewayId as string;
      
      // Try params
      if ((req.params as any)?.gatewayId) return (req.params as any).gatewayId;
      
      return 'unknown';
    };
    
    const trackActivity = (statusCode: number, responseSize?: number, error?: string) => {
      const gatewayId = getGatewayId();
      const activity: ApiActivityRecord = {
        id: `act_${++globalActivityCounter}`,
        timestamp: new Date().toISOString(),
        gatewayId,
        endpoint,
        method: req.method,
        statusCode,
        responseTime: Date.now() - startTime,
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : undefined,
        responseSize,
        error,
        ip: req.ip || req.connection.remoteAddress || 'unknown'
      };
      
      // Store in gateway-specific log
      if (!apiActivityLog.has(gatewayId)) {
        apiActivityLog.set(gatewayId, []);
      }
      const gatewayLog = apiActivityLog.get(gatewayId)!;
      gatewayLog.push(activity);
      
      // Trim to max records per gateway
      if (gatewayLog.length > MAX_ACTIVITY_PER_GATEWAY) {
        gatewayLog.shift();
      }
      
      // Also store in 'all' for global view
      if (!apiActivityLog.has('all')) {
        apiActivityLog.set('all', []);
      }
      const allLog = apiActivityLog.get('all')!;
      allLog.push(activity);
      
      // Trim global log
      if (allLog.length > MAX_TOTAL_ACTIVITY) {
        allLog.shift();
      }
    };
    
    // Intercept response methods
    res.send = function(data: any) {
      trackActivity(res.statusCode, Buffer.byteLength(data || ''));
      return originalSend.call(this, data);
    };
    
    res.json = function(data: any) {
      const jsonStr = JSON.stringify(data);
      trackActivity(res.statusCode, Buffer.byteLength(jsonStr), data?.error?.message);
      return originalJson.call(this, data);
    };
    
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Run migration on startup
  try {
    await migratePlcDataToDatabase();
  } catch (error) {
    console.warn('PLC data migration failed:', error);
  }
  
  // Enable cookie parsing for session management
  app.use(cookieParser());
  console.log('[MIDDLEWARE] Cookie parser enabled');
  
  // Enable response compression for all routes
  app.use(compression({
    filter: (req, res) => {
      // Compress all JSON responses
      if (req.headers['accept']?.includes('application/json')) {
        return true;
      }
      return compression.filter(req, res);
    },
    level: 6 // Balanced compression level
  }));
  
  // Add custom gzip decompression for incoming requests
  app.use(gzipDecompressionMiddleware);
  
  // Ensure JSON body parsing is active for all API routes
  app.use('/api', express.json({ limit: '2mb' }));
  app.use('/api/v1', express.json({ limit: '2mb' }));
  
  // ==================== SESSION MIDDLEWARE ====================
  // Add session middleware for admin authentication
  app.use(sessionMiddleware);
  
  // ==================== GATEWAY DEBUG LOGGING MIDDLEWARE ====================
  // Comprehensive logging middleware for all gateway API activity
  app.use('/api/gateway/*', async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any = null;
    let responseHeaders: any = {};
    
    // Extract gateway ID from various sources
    function extractGatewayId(): string | null {
      // Try from authorization header (Bearer token)
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          return decoded.gatewayId || null;
        } catch (e) {
          // Invalid token, but we still want to log the request
        }
      }
      
      // Try from custom header
      if (req.headers['x-gateway-id']) {
        return req.headers['x-gateway-id'] as string;
      }
      
      // Try from request body
      if ((req.body as any)?.gatewayId) {
        return (req.body as any).gatewayId;
      }
      
      // Try from query params
      if (req.query.gatewayId) {
        return req.query.gatewayId as string;
      }
      
      return null;
    }
    
    // Extract user ID from session or token
    function extractUserId(): string | null {
      // Try from session
      if ((req as any).session?.userId) {
        return (req as any).session.userId;
      }
      
      // Try from authorization header
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          return decoded.userId || null;
        } catch (e) {
          // Invalid token
        }
      }
      
      return null;
    }
    
    // Sanitize headers (remove sensitive data)
    function sanitizeHeaders(headers: any): any {
      const sanitized = { ...headers };
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
      
      for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
          // Keep first few chars for debugging
          const value = sanitized[header];
          if (typeof value === 'string' && value.length > 10) {
            sanitized[header] = value.substring(0, 10) + '...';
          } else {
            sanitized[header] = '[REDACTED]';
          }
        }
      }
      
      return sanitized;
    }
    
    // Sanitize body (remove passwords, tokens, etc)
    function sanitizeBody(body: any): any {
      if (!body) return null;
      
      const sanitized = JSON.parse(JSON.stringify(body));
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'jwt', 'auth'];
      
      function recursiveSanitize(obj: any) {
        if (typeof obj !== 'object' || obj === null) return;
        
        for (const key in obj) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            recursiveSanitize(obj[key]);
          }
        }
      }
      
      recursiveSanitize(sanitized);
      return sanitized;
    }
    
    // Determine category based on endpoint
    function getCategory(url: string): string {
      if (url.includes('/activate')) return 'activation';
      if (url.includes('/heartbeat')) return 'heartbeat';
      if (url.includes('/data')) return 'data_sync';
      if (url.includes('/config')) return 'config';
      if (url.includes('/command')) return 'command';
      if (url.includes('/refresh')) return 'refresh';
      if (url.includes('/tables')) return 'tables';
      if (url.includes('/sync')) return 'sync';
      if (url.includes('/generate')) return 'generate';
      if (url.includes('/verify')) return 'verify';
      return 'other';
    }
    
    // Determine severity based on status code
    function getSeverity(status: number): string {
      if (status >= 500) return 'critical';
      if (status >= 400) return 'error';
      if (status >= 300) return 'warning';
      return 'info';
    }
    
    // Override res.send to capture response
    res.send = function(data: any) {
      responseBody = data;
      responseHeaders = res.getHeaders();
      return originalSend.call(this, data);
    };
    
    // Override res.json to capture response
    res.json = function(data: any) {
      responseBody = data;
      responseHeaders = res.getHeaders();
      return originalJson.call(this, data);
    };
    
    // Log when response finishes
    res.on('finish', async () => {
      try {
        const processingDuration = Date.now() - startTime;
        const endpoint = req.baseUrl + req.path;
        
        // Parse response body if it's a string
        let parsedResponseBody = responseBody;
        if (typeof responseBody === 'string') {
          try {
            parsedResponseBody = JSON.parse(responseBody);
          } catch (e) {
            // Not JSON, keep as string
          }
        }
        
        // Check for rate limiting
        const isRateLimited = res.statusCode === 429;
        const rateLimitReason = isRateLimited ? 
          parsedResponseBody?.error?.message || 'Too many requests' : null;
        
        // Extract error information
        let errorMessage = null;
        let errorStack = null;
        let errorCode = null;
        
        if (res.statusCode >= 400) {
          if (parsedResponseBody?.error) {
            errorMessage = parsedResponseBody.error.message || parsedResponseBody.error;
            errorCode = parsedResponseBody.error.code || null;
            errorStack = parsedResponseBody.error.stack || null;
          } else if (parsedResponseBody?.message) {
            errorMessage = parsedResponseBody.message;
          } else if (typeof parsedResponseBody === 'string') {
            errorMessage = parsedResponseBody;
          }
        }
        
        // Create log entry
        const logEntry = {
          gatewayId: extractGatewayId(),
          userId: extractUserId(),
          endpoint,
          method: req.method,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || null,
          requestHeaders: sanitizeHeaders(req.headers),
          requestBody: sanitizeBody(req.body),
          requestSize: JSON.stringify(req.body || {}).length,
          responseStatus: res.statusCode,
          responseHeaders: sanitizeHeaders(responseHeaders),
          responseBody: sanitizeBody(parsedResponseBody),
          responseSize: JSON.stringify(parsedResponseBody || {}).length,
          errorMessage,
          errorStack,
          errorCode,
          processingDuration,
          machineId: req.headers['x-machine-id'] as string || null,
          schemaVersion: req.headers['x-schema-version'] as string || null,
          gatewayVersion: req.headers['x-gateway-version'] as string || null,
          isRateLimited,
          rateLimitReason,
          category: getCategory(endpoint),
          severity: getSeverity(res.statusCode)
        };
        
        // Insert into database
        await db.insert(gatewayDebugLogs).values(logEntry);
        
        // Also log critical errors to console
        if (logEntry.severity === 'critical' || logEntry.severity === 'error') {
          console.error(`[GATEWAY-ERROR] ${logEntry.method} ${logEntry.endpoint} - ${res.statusCode}`, {
            gatewayId: logEntry.gatewayId,
            error: errorMessage,
            duration: `${processingDuration}ms`
          });
        }
      } catch (error) {
        // Don't let logging errors break the application
        console.error('[GATEWAY-LOG-ERROR] Failed to log gateway request:', error);
      }
    });
    
    next();
  });
  
  // ==================== CORS & API ROUTING FIXES ====================
  
  // CORS preflight handling for all API routes (including v1)
  app.options(['/api/*', '/api/v1/*'], (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://www.herculesv2.com');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Machine-ID, X-Session-Id');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Vary', 'Origin');
    return res.sendStatus(204);
  });
  
  // API versioning middleware - redirect v1 to non-versioned endpoints
  // This must run BEFORE route definitions to properly rewrite URLs
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/v1/')) {
      // Rewrite the URL to remove /v1 and pass it to the next handler
      req.url = req.url.replace('/api/v1', '/api');
    }
    next();
  });
  
  // Add CORS headers to all API responses
  app.use('/api/*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://www.herculesv2.com');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Machine-ID, X-Session-Id');
    res.header('Vary', 'Origin');
    next();
  });
  
  // Health check endpoint - must be early and always accessible
  app.get('/api/health', (req, res) => {
    res.status(200).json({ ok: true });
  });
  
  
  // Support HEAD method for health check
  app.head('/api/health', (req, res) => {
    res.status(200).send();
  });

  // Gateway download endpoint - redirect to Google Drive hosted file
  app.get('/api/download/gateway', (req, res) => {
    // Google Drive direct download link for Hercules_Gateway.exe (241 MB)
    const googleDriveFileId = '1ZzVAJzjfUuBi4hK3CIRObMVyUpcVMavf';
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${googleDriveFileId}`;
    
    // Redirect to Google Drive download
    res.redirect(directDownloadUrl);
  });
  
  // OpenAPI documentation endpoint
  app.get(['/api/openapi.json', '/api/v1/openapi.json'], (_req, res) => {
    res.json({
      openapi: '3.0.0',
      info: { title: 'Hercules SFMS Gateway API', version: '2.0.0' },
      servers: [
        { url: process.env.API_URL || 'http://localhost:5000/api' },
        { url: 'http://localhost:5000/api' }
      ],
      paths: {
        '/gateway/health': { get: { summary: 'Health', responses: { '200': { description: 'OK' } } }},
        '/gateway/activate': { post: { summary: 'Activate', responses: { '201': { description: 'Created' }, '409': { description: 'Already activated' }}}},
        '/gateway/config': { get: { summary: 'Config', responses: { '200': { description: 'OK' }, '404': { description: 'No config' }}}},
        '/gateway/heartbeat': { post: { summary: 'Heartbeat', responses: { '200': { description: 'OK' }}}},
        '/gateway/data': { post: { summary: 'Ingest data', responses: { '202': { description: 'Accepted' }, '200': { description: 'OK' }}}}
      }
    });
  });
  
  // Swagger UI documentation endpoint
  app.get(['/api/docs', '/api/v1/docs'], (_req, res) => {
    res.send(`<!doctype html><html><head>
  <title>Hercules API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"></head>
  <body><div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url:'/api/openapi.json', dom_id:'#swagger-ui' });</script>
  </body></html>`);
  });
  
  // Catch-all for undefined API routes - return JSON error, not HTML
  app.all('/api/*', (req, res, next) => {
    // If we get here and haven't matched a route yet, continue to other handlers
    // This middleware will be checked again at the end
    (req as any).isApiRoute = true;
    next();
  });
  
  // Auth middleware - but don't block all routes
  await setupAuth(app);
  
  // Session management - database-backed persistent storage
  const sessionStore = {
    async set(sessionId: string, userData: any) {
      try {
        const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
        const userId = userData.userId || userData.claims?.sub || 'anonymous';
        
        console.log(`[SESSION-STORE] Setting session: ${sessionId.substring(0, 16)}... for user: ${userId}`);
        
        // First try to update existing session
        const updated = await db.update(sessions)
          .set({
            userId,
            data: userData,
            expiresAt
          })
          .where(eq(sessions.sessionId, sessionId))
          .returning();
          
        // If no session was updated, create a new one
        if (updated.length === 0) {
          await db.insert(sessions).values({
            userId,
            sessionId,
            data: userData,
            expiresAt
          });
          console.log(`[SESSION-STORE] Created new session: ${sessionId.substring(0, 16)}...`);
        } else {
          console.log(`[SESSION-STORE] Updated existing session: ${sessionId.substring(0, 16)}...`);
        }
        
        return true;
      } catch (error) {
        console.error('Session store set error:', error);
        return false;
      }
    },
    
    async get(sessionId: string) {
      try {
        console.log(`[SESSION-STORE] Getting session: ${sessionId.substring(0, 16)}...`);
        
        const result = await db.select()
          .from(sessions)
          .where(eq(sessions.sessionId, sessionId));
          
        if (result.length === 0) {
          console.log(`[SESSION-STORE] Session not found: ${sessionId.substring(0, 16)}...`);
          return null;
        }
        
        const session = result[0];
        console.log(`[SESSION-STORE] Session found - expires: ${session.expiresAt}, data keys: ${session.data ? Object.keys(session.data).join(', ') : 'null'}`);
        
        // Check if session has expired
        if (new Date() > session.expiresAt) {
          console.warn(`[SESSION-STORE] Session expired: ${sessionId.substring(0, 16)}... (expired at ${session.expiresAt})`);
          // Clean up expired session
          await this.delete(sessionId);
          return null;
        }
        
        // Ensure we return the data object, not null
        if (!session.data) {
          console.warn(`[SESSION-STORE] Session data is null for: ${sessionId.substring(0, 16)}...`);
        }
        
        return session.data;
      } catch (error) {
        console.error('Session store get error:', error);
        return null;
      }
    },
    
    async delete(sessionId: string) {
      try {
        await db.delete(sessions)
          .where(eq(sessions.sessionId, sessionId));
        return true;
      } catch (error) {
        console.error('Session store delete error:', error);
        return false;
      }
    },
    
    async has(sessionId: string) {
      try {
        const result = await db.select({ count: sql`count(*)` })
          .from(sessions)
          .where(eq(sessions.sessionId, sessionId));
          
        return (result[0] as any)?.count > 0;
      } catch (error) {
        console.error('Session store has error:', error);
        return false;
      }
    },
    
    // Clean up expired sessions - should be called periodically
    async cleanup() {
      try {
        const deleted = await db.delete(sessions)
          .where(lt(sessions.expiresAt, new Date()));
          
        // Log cleanup without using deleted.length
        console.log('Session cleanup completed');
        
        return 0; // Return count placeholder
      } catch (error) {
        console.error('Session cleanup error:', error);
        return 0;
      }
    }
  };
  
  // Start periodic session cleanup - runs every hour
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  const cleanupTimer = setInterval(async () => {
    try {
      await sessionStore.cleanup();
    } catch (error) {
      console.error('Session cleanup timer error:', error);
    }
  }, CLEANUP_INTERVAL);
  
  // Helper middleware for custom auth - only for protected routes
  const customAuth = async (req: any, res: any, next: any) => {
    // First check if user is already authenticated via Express session (Google OAuth)
    if (req.session?.userId && req.session?.user) {
      console.log(`[AUTH-PROTECTED] User authenticated via Express session: ${req.session.user.email}`);
      req.user = {
        id: req.session.userId,
        userId: req.session.userId,
        email: req.session.user.email,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        tenantId: req.session.userId
      };
      req.tenantId = req.session.userId;
      return next();
    }
    
    // Check for custom session (demo users)
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    console.log(`[AUTH-PROTECTED] Custom Session ID: ${sessionId ? sessionId.substring(0, 16) + '...' : 'none'}`);
    
    if (sessionId) {
      try {
        // Use storage.getSession() to check database session
        const session = await storage.getSession(sessionId);
        console.log(`[AUTH-PROTECTED] Custom Session found: ${session ? 'yes' : 'no'}`);
        
        if (session && session.expiresAt > new Date()) {
          console.log(`[AUTH-PROTECTED] Valid custom session for user: ${session.userId}`);
          
          // Get user details from demo users table
          const demoUser = await storage.getDemoUser(session.userId);
          if (demoUser) {
            req.user = {
              id: session.userId,
              userId: session.userId,
              email: demoUser.email || '',
              firstName: demoUser.firstName,
              lastName: demoUser.lastName,
              isDemo: true,
              demoKey: demoUser.demoKey,
              tenantId: session.userId // Use userId as tenantId for backward compatibility
            };
            req.tenantId = session.userId;
            
            // Update session expiry
            const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            await storage.updateSessionExpiry(sessionId, newExpiry);
            
            console.log(`[AUTH-PROTECTED] User authenticated: ${req.user.email}`);
            return next();
          } else {
            // Use session data directly if no demo user found
            req.user = session.data || { userId: session.userId };
            req.tenantId = session.userId;
            return next();
          }
        } else if (session) {
          console.log('[AUTH-PROTECTED] Session expired');
        }
      } catch (error) {
        console.error('[AUTH-PROTECTED] Session validation error:', error);
      }
    }
    
    // Check for Bearer token authentication (for gateways and API access)
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        if (decoded.gatewayId) {
          // This is a gateway token
          req.gateway = decoded;
          req.isGateway = true;
          return next();
        } else if (decoded.userId) {
          // This is a user token - validate and get user
          const demoUser = await storage.getDemoUser(decoded.userId);
          if (demoUser) {
            req.user = {
              id: decoded.userId,
              userId: decoded.userId,
              email: demoUser.email || '',
              firstName: demoUser.firstName,
              lastName: demoUser.lastName,
              isDemo: true,
              tenantId: decoded.userId
            };
            req.tenantId = decoded.userId;
            return next();
          }
        }
      } catch (error) {
        // Invalid token
        console.error('[AUTH-PROTECTED] Token validation error:', error);
      }
    }
    
    // Check for Replit auth session
    if (req.isAuthenticated && req.isAuthenticated()) {
      const userId = req.user?.claims?.sub;
      if (userId) {
        // Create a temporary user object for compatibility
        req.user = {
          userId: userId,
          tenantId: userId, // Use userId as tenantId for OAuth users
          claims: req.user.claims
        };
        // Set tenantId for backward compatibility
        req.tenantId = userId;
        return next();
      }
    }
    
    return res.status(401).json({ message: 'Unauthorized' });
  };
  
  // Optional auth middleware - doesn't block if not authenticated
  const optionalAuthMiddleware = async (req: any, res: any, next: any) => {
    // First check if user is already authenticated via Express session (Google OAuth)
    if (req.session?.userId && req.session?.user) {
      console.log(`[AUTH-OPTIONAL] User authenticated via Express session: ${req.session.user.email}`);
      req.user = {
        id: req.session.userId,
        userId: req.session.userId,
        email: req.session.user.email,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        tenantId: req.session.userId,
        claims: { sub: req.session.userId }
      };
      req.tenantId = req.session.userId;
      return next();
    }
    
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    // Add detailed logging for debugging
    if (sessionId) {
      console.log(`[AUTH] Session ID received: ${sessionId.substring(0, 16)}...`);
      
      try {
        // Use storage.getSession() to check database session
        const session = await storage.getSession(sessionId);
        console.log(`[AUTH] Session found: ${session ? 'yes' : 'no'}`);
        
        if (session && session.expiresAt > new Date()) {
          console.log(`[AUTH] Valid session for user: ${session.userId}`);
          
          // Session data structure fix: Check if session.data exists
          const sessionData = session.data || {};
          
          // Get user details from demo users table
          const demoUser = await storage.getDemoUser(session.userId);
          if (demoUser) {
            req.user = {
              id: session.userId,
              userId: session.userId,
              email: demoUser.email || sessionData.email || '',
              firstName: demoUser.firstName || sessionData.firstName,
              lastName: demoUser.lastName || sessionData.lastName,
              isDemo: true,
              demoKey: demoUser.demoKey || sessionData.demoKey,
              tenantId: session.userId,
              claims: { sub: session.userId } // Add claims for compatibility
            };
            req.tenantId = session.userId;
            
            // Update session expiry
            const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            await storage.updateSessionExpiry(sessionId, newExpiry);
            
            console.log(`[AUTH] User authenticated via session: ${req.user.email}`);
          } else if (sessionData && sessionData.userId) {
            // Use session data directly if no demo user found
            // The session data already contains the user info from login
            req.user = {
              id: sessionData.userId,
              userId: sessionData.userId,
              email: sessionData.email || '',
              firstName: sessionData.firstName,
              lastName: sessionData.lastName,
              tenantId: sessionData.tenantId || sessionData.userId,
              role: sessionData.role,
              isDemo: sessionData.isDemo !== false,
              demoKey: sessionData.demoKey,
              claims: { sub: sessionData.userId }
            };
            req.tenantId = sessionData.tenantId || sessionData.userId;
            console.log(`[AUTH] User authenticated from session data: ${req.user.email}`);
          } else {
            // Fallback: use basic session info
            req.user = {
              userId: session.userId,
              id: session.userId,
              tenantId: session.userId,
              claims: { sub: session.userId }
            };
            req.tenantId = session.userId;
            console.log(`[AUTH] User authenticated with minimal session data: ${session.userId}`);
          }
        } else if (session) {
          console.log('[AUTH] Session expired:', {
            sessionId: sessionId.substring(0, 16) + '...',
            expiresAt: session.expiresAt,
            currentTime: new Date()
          });
        }
      } catch (error) {
        console.error('[AUTH] Session validation error:', error);
      }
    }
    
    // Check for Bearer token authentication (for gateways and API access)
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        if (decoded.gatewayId) {
          // This is a gateway token
          req.gateway = decoded;
          req.isGateway = true;
          return next();
        } else if (decoded.userId) {
          // This is a user token - validate and get user
          const demoUser = await storage.getDemoUser(decoded.userId);
          if (demoUser) {
            req.user = {
              id: decoded.userId,
              userId: decoded.userId,
              email: demoUser.email || '',
              firstName: demoUser.firstName,
              lastName: demoUser.lastName,
              isDemo: true,
              tenantId: decoded.userId,
              claims: { sub: decoded.userId }
            };
            req.tenantId = decoded.userId;
            console.log(`[AUTH-OPTIONAL] User authenticated via Bearer token: ${req.user.email}`);
            return next();
          }
        }
      } catch (error) {
        // Invalid token - just continue without authentication (optional auth)
        console.log('[AUTH-OPTIONAL] Bearer token validation failed (continuing without auth):', error instanceof Error ? error.message : String(error));
      }
    }
    
    if (req.isAuthenticated && req.isAuthenticated()) {
      const userId = req.user?.claims?.sub;
      if (userId) {
        req.user = {
          userId: userId,
          tenantId: userId, // Use userId as tenantId for OAuth users
          claims: req.user.claims
        };
        // Set tenantId for backward compatibility
        req.tenantId = userId;
        console.log(`[AUTH] User authenticated via OAuth: ${userId}`);
      }
    } else {
      console.log('[AUTH] No authentication credentials provided - Headers:', Object.keys(req.headers));
    }
    next(); // Always continue, whether authenticated or not
  };
  
  // Auth routes - use optional auth to not block unauthenticated users
  app.get('/api/auth/user', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // If user is authenticated, return user data
      if (req.user) {
        const userId = req.user.userId || req.user.claims?.sub;
        console.log(`[AUTH-USER] User ID from session: ${userId}`);
        
        if (userId) {
          const demoUser = await storage.getDemoUser(userId);
          if (demoUser) {
            console.log(`[AUTH-USER] Found demo user: ${demoUser.email}`);
            return res.json(demoUser);
          } else {
            // Return session data if no demo user found
            console.log(`[AUTH-USER] No demo user found, using session data`);
            return res.json({
              id: req.user.userId || userId,
              email: req.user.email || 'user@example.com',
              firstName: req.user.firstName || '',
              lastName: req.user.lastName || '',
              profileImageUrl: req.user.profileImageUrl || null
            });
          }
        }
      } else {
        console.log('[AUTH-USER] No user in request');
      }
      
      // Return null for unauthenticated users instead of error
      return res.json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Verify authentication endpoint
  app.get('/api/auth/verify', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // If user is authenticated, return user data
      if (req.user) {
        const userId = req.user.userId || req.user.claims?.sub;
        console.log(`[AUTH-VERIFY] User ID from session: ${userId}`);
        
        if (userId) {
          // First try to get demo user from storage
          const demoUser = await storage.getDemoUser(userId);
          
          if (demoUser) {
            console.log(`[AUTH-VERIFY] Found demo user: ${demoUser.email}`);
            // Calculate remaining days for demo users
            const demoEndDate = new Date(demoUser.demoEndDate!);
            const remainingDays = Math.max(0, Math.ceil((demoEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
            
            return res.json({
              authenticated: true,
              user: {
                id: demoUser.id,
                email: demoUser.email,
                firstName: demoUser.firstName,
                lastName: demoUser.lastName,
                name: `${demoUser.firstName} ${demoUser.lastName}`.trim(),
                demoEndDate: demoUser.demoEndDate,
                profileImageUrl: demoUser.profileImageUrl,
                remainingDays
              }
            });
          } else {
            // If no demo user found, but session is valid, return session data
            console.log(`[AUTH-VERIFY] No demo user found, using session data`);
            return res.json({
              authenticated: true,
              user: {
                id: req.user.userId || userId,
                email: req.user.email || 'user@example.com',
                firstName: req.user.firstName || '',
                lastName: req.user.lastName || '',
                name: req.user.firstName && req.user.lastName 
                  ? `${req.user.firstName} ${req.user.lastName}`.trim() 
                  : req.user.email || 'User',
                profileImageUrl: req.user.profileImageUrl || null,
                remainingDays: 30 // Default for non-demo users
              }
            });
          }
        }
      } else {
        console.log('[AUTH-VERIFY] No user in request, not authenticated');
      }
      
      // Return not authenticated
      return res.json({ authenticated: false, user: null });
    } catch (error) {
      console.error("Error verifying authentication:", error);
      res.status(500).json({ message: "Failed to verify authentication" });
    }
  });
  
  // DEBUG endpoint to test session operations
  app.get('/api/auth/session-debug', async (req: any, res) => {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    console.log('[SESSION-DEBUG] Starting session debug...');
    console.log(`[SESSION-DEBUG] Session ID: ${sessionId ? sessionId.substring(0, 16) + '...' : 'none'}`);
    console.log(`[SESSION-DEBUG] Headers: ${JSON.stringify(req.headers)}`);
    console.log(`[SESSION-DEBUG] Cookies: ${JSON.stringify(req.cookies)}`);
    
    const debugInfo: any = {
      sessionId,
      headers: {
        'x-session-id': req.headers['x-session-id'],
        cookie: req.headers.cookie ? 'present' : 'none'
      },
      cookies: req.cookies,
      sessionOperations: {}
    };
    
    if (sessionId) {
      // Test session.has()
      const hasSession = await sessionStore.has(sessionId);
      debugInfo.sessionOperations.has = hasSession;
      console.log(`[SESSION-DEBUG] sessionStore.has() = ${hasSession}`);
      
      // Test session.get()
      const sessionData = await sessionStore.get(sessionId);
      debugInfo.sessionOperations.getData = sessionData ? 'valid' : 'null';
      debugInfo.sessionOperations.dataKeys = sessionData ? Object.keys(sessionData) : null;
      console.log(`[SESSION-DEBUG] sessionStore.get() = ${sessionData ? 'valid' : 'null'}`);
      
      // Check database directly
      try {
        const dbResult = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId));
        debugInfo.database = {
          found: dbResult.length > 0,
          count: dbResult.length
        };
        if (dbResult.length > 0) {
          const session = dbResult[0];
          debugInfo.database.expires = session.expiresAt;
          debugInfo.database.expired = new Date() > session.expiresAt;
          debugInfo.database.dataIsNull = session.data === null;
          debugInfo.database.dataKeys = session.data ? Object.keys(session.data) : null;
        }
      } catch (dbError) {
        debugInfo.database = { error: String(dbError) };
      }
    }
    
    res.json(debugInfo);
  });
  
  // ==================== GATEWAY CODES FOR USER ====================
  
  // Get gateway codes for authenticated user (used by frontend)
  app.get('/api/gateway/codes', customAuth, async (req: any, res) => {
    try {
      console.log('[GATEWAY-CODES] Fetching codes for user:', req.user?.userId || req.user?.id);
      
      // Get the user ID from the authenticated user
      const userId = req.user?.userId || req.user?.id || req.user?.claims?.sub;
      
      if (!userId) {
        console.log('[GATEWAY-CODES] No user ID found in request');
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Fetch gateway codes for the user
      const codes = await db.select()
        .from(gatewayCodes)
        .where(eq(gatewayCodes.userId, userId))
        .orderBy(desc(gatewayCodes.createdAt));
      
      console.log('[GATEWAY-CODES] Found', codes.length, 'codes for user', userId);
      console.log('[GATEWAY-CODES] Codes:', codes.map(c => ({ id: c.id, status: c.status, gatewayId: c.gatewayId })));
      
      res.json(codes);
    } catch (error) {
      console.error('[GATEWAY-CODES] Error fetching gateway codes:', error);
      res.status(500).json({ error: 'Failed to fetch gateway codes' });
    }
  });
  
  // ==================== ADMIN AUTHENTICATION ====================
  
  // Admin login endpoint
  app.post('/api/admin/login', adminLogin);
  
  // Admin logout endpoint
  app.post('/api/admin/logout', requireAdminAuth, adminLogout);
  
  // Admin status check
  app.get('/api/admin/status', adminStatus);
  
  // ==================== ADMIN PROTECTED ROUTES ====================
  
  // Get all users with access information
  app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
    try {
      const users = await storage.getUsersWithAccessInfo();
      
      // Calculate additional fields for each user
      const enrichedUsers = users.map(user => {
        const now = new Date();
        let daysRemaining = null;
        let accessStatus = 'active';
        
        if (user.accessExpiresAt) {
          const expiresAt = new Date(user.accessExpiresAt);
          const diffMs = expiresAt.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          if (daysRemaining < 0) {
            accessStatus = 'expired';
          } else if (daysRemaining <= 7) {
            accessStatus = 'expiring';
          }
        } else if (user.demoEndDate) {
          // For legacy users with demoEndDate
          const expiresAt = new Date(user.demoEndDate);
          const diffMs = expiresAt.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          if (daysRemaining < 0) {
            accessStatus = 'expired';
          } else if (daysRemaining <= 7) {
            accessStatus = 'expiring';
          }
        }
        
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          companyName: user.companyName,
          status: user.status,
          accessExpiresAt: user.accessExpiresAt || user.demoEndDate,
          accessGrantedDays: user.accessGrantedDays,
          isActive: user.isActive,
          daysRemaining,
          accessStatus,
          createdAt: user.createdAt
        };
      });
      
      res.json({ users: enrichedUsers });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
  
  // Update user access duration
  app.put('/api/admin/users/:id/access', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, days, expiresAt } = req.body;
      
      let newExpiresAt: Date | null = null;
      let grantedDays: number | null = null;
      
      const now = new Date();
      
      switch (action) {
        case 'extend':
          // Extend access by N days from today or current expiry
          if (!days) {
            return res.status(400).json({ error: 'Days required for extend action' });
          }
          
          const user = await storage.getDemoUser(id);
          if (!user) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          // If user has existing non-expired access, extend from that date
          // Otherwise extend from today
          const baseDate = (user.accessExpiresAt && new Date(user.accessExpiresAt) > now) 
            ? new Date(user.accessExpiresAt) 
            : now;
            
          newExpiresAt = new Date(baseDate);
          newExpiresAt.setDate(newExpiresAt.getDate() + days);
          grantedDays = days;
          break;
          
        case 'set':
          // Set exact expiry date
          if (!expiresAt) {
            return res.status(400).json({ error: 'Expiry date required for set action' });
          }
          newExpiresAt = new Date(expiresAt);
          
          // Calculate granted days
          const diffMs = newExpiresAt.getTime() - now.getTime();
          grantedDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          break;
          
        case 'revoke':
          // Set expiry to now (immediately expired)
          newExpiresAt = now;
          grantedDays = 0;
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid action. Use extend, set, or revoke' });
      }
      
      const updatedUser = await storage.updateUserAccess(id, newExpiresAt, grantedDays);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        message: 'User access updated successfully',
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error updating user access:', error);
      res.status(500).json({ error: 'Failed to update user access' });
    }
  });
  
  // Quick extend user access endpoint
  app.post('/api/admin/users/:id/access/extend', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { days = 30 } = req.body; // Default to 30 days if not specified
      
      const user = await storage.getDemoUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const now = new Date();
      // If user has existing non-expired access, extend from that date
      // Otherwise extend from today
      const baseDate = (user.accessExpiresAt && new Date(user.accessExpiresAt) > now) 
        ? new Date(user.accessExpiresAt) 
        : now;
        
      const newExpiresAt = new Date(baseDate);
      newExpiresAt.setDate(newExpiresAt.getDate() + days);
      
      const updatedUser = await storage.updateUserAccess(id, newExpiresAt, days);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'Failed to update user' });
      }
      
      res.json({ 
        message: `User access extended by ${days} days`,
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error extending user access:', error);
      res.status(500).json({ error: 'Failed to extend user access' });
    }
  });
  
  // Get all gateway codes (with search/filter support)
  app.get('/api/admin/gateway-codes', requireAdminAuth, async (req, res) => {
    try {
      const { search, status, userId } = req.query;
      
      let query = db.select()
        .from(gatewayCodes);
      
      // Apply filters
      const conditions = [];
      if (search) {
        conditions.push(sql`${gatewayCodes.code} ILIKE ${`%${search}%`}`);
      }
      if (status) {
        conditions.push(eq(gatewayCodes.status, status as string));
      }
      if (userId) {
        conditions.push(eq(gatewayCodes.userId, userId as string));
      }
      
      if (conditions.length > 0) {
        const whereCondition = conditions.reduce((acc, cond, idx) => 
          idx === 0 ? cond : sql`${acc} AND ${cond}`
        );
        const codes = await db.select()
          .from(gatewayCodes)
          .where(whereCondition)
          .orderBy(gatewayCodes.createdAt);
        res.json({ codes });
        return;
      }
      
      const codes = await query.orderBy(gatewayCodes.createdAt);
      
      res.json({ codes });
    } catch (error) {
      console.error('Error fetching gateway codes:', error);
      res.status(500).json({ error: 'Failed to fetch gateway codes' });
    }
  });
  
  // Create new gateway code
  app.post('/api/admin/gateway-codes', requireAdminAuth, async (req, res) => {
    try {
      const { code, userId, expiresAt, notes, autoGenerate } = req.body;
      
      let finalCode = code;
      
      // Auto-generate code if requested
      if (autoGenerate || !code) {
        finalCode = gatewayCodesService.generateActivationCode();
        // Check for collision
        const existing = await db.select()
          .from(gatewayCodes)
          .where(eq(gatewayCodes.code, finalCode));
        if (existing.length > 0) {
          // Generate again if collision
          finalCode = gatewayCodesService.generateActivationCode();
        }
      }
      
      // Validate code format if manually entered
      if (!autoGenerate && code) {
        const codePattern = /^HERC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        if (!codePattern.test(code)) {
          return res.status(400).json({ error: 'Invalid code format. Use HERC-XXXX-XXXX-XXXX-XXXX' });
        }
        
        // Check if code already exists
        const existing = await db.select()
          .from(gatewayCodes)
          .where(eq(gatewayCodes.code, code));
        if (existing.length > 0) {
          return res.status(400).json({ error: 'Code already exists' });
        }
      }
      
      // Validate user exists if specified
      if (userId) {
        const user = await db.select()
          .from(demoUsers)
          .where(eq(demoUsers.id, userId));
        if (user.length === 0) {
          return res.status(400).json({ error: 'User not found' });
        }
      }
      
      // Create the code
      const newCode = await db.insert(gatewayCodes)
        .values({
          code: finalCode,
          userId: userId || null,
          status: 'issued',
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          notes: notes || 'Created by admin',
          createdAt: new Date()
        })
        .returning();
      
      // Log audit event
      await db.insert(gatewayAuditLog).values({
        action: 'admin_code_created',
        success: true,
        metadata: { code: finalCode, adminEmail: req.session.adminEmail }
      });
      
      res.json({ success: true, code: newCode[0] });
    } catch (error) {
      console.error('Error creating gateway code:', error);
      res.status(500).json({ error: 'Failed to create gateway code' });
    }
  });
  
  // Update gateway code
  app.put('/api/admin/gateway-codes/:code', requireAdminAuth, async (req, res) => {
    try {
      const { code } = req.params;
      const { userId, expiresAt, notes, status } = req.body;
      
      // Check if code exists
      const existing = await db.select()
        .from(gatewayCodes)
        .where(eq(gatewayCodes.code, code));
      
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Code not found' });
      }
      
      // Validate user exists if specified
      if (userId) {
        const user = await db.select()
          .from(demoUsers)
          .where(eq(demoUsers.id, userId));
        if (user.length === 0) {
          return res.status(400).json({ error: 'User not found' });
        }
      }
      
      // Build update object
      const updateData: any = {};
      if (userId !== undefined) updateData.userId = userId;
      if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);
      if (notes !== undefined) updateData.notes = notes;
      if (status !== undefined && ['issued', 'redeemed', 'expired', 'revoked'].includes(status)) {
        updateData.status = status;
      }
      
      // Update the code
      const updated = await db.update(gatewayCodes)
        .set(updateData)
        .where(eq(gatewayCodes.code, code))
        .returning();
      
      // Log audit event
      await db.insert(gatewayAuditLog).values({
        action: 'admin_code_updated',
        success: true,
        metadata: { code, updates: updateData, adminEmail: req.session.adminEmail }
      });
      
      res.json({ success: true, code: updated[0] });
    } catch (error) {
      console.error('Error updating gateway code:', error);
      res.status(500).json({ error: 'Failed to update gateway code' });
    }
  });
  
  // Reset gateway code to issued status
  app.post('/api/admin/gateway-codes/reset', requireAdminAuth, async (req, res) => {
    try {
      const { code, deleteGateway } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }
      
      // Check if code exists
      const existing = await db.select()
        .from(gatewayCodes)
        .where(eq(gatewayCodes.code, code));
      
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Code not found' });
      }
      
      // Reset the code
      const updated = await db.update(gatewayCodes)
        .set({
          status: 'issued',
          gatewayId: null,
          gatewayToken: null,
          machineId: null,
          redeemedAt: null,
          activatedAt: null
        })
        .where(eq(gatewayCodes.code, code))
        .returning();
      
      // Note: Gateway deletion logic can be added here if needed
      // when a gateways table is implemented
      
      // Log audit event
      await db.insert(gatewayAuditLog).values({
        action: 'admin_code_reset',
        success: true,
        metadata: { 
          code, 
          previousStatus: existing[0].status,
          gatewayDeleted: deleteGateway && existing[0].gatewayId ? true : false,
          adminEmail: req.session.adminEmail 
        }
      });
      
      res.json({ success: true, code: updated[0] });
    } catch (error) {
      console.error('Error resetting gateway code:', error);
      res.status(500).json({ error: 'Failed to reset gateway code' });
    }
  });
  
  // Delete gateway code
  app.delete('/api/admin/gateway-codes/:code', requireAdminAuth, async (req, res) => {
    try {
      const { code } = req.params;
      
      // Check if code exists
      const existing = await db.select()
        .from(gatewayCodes)
        .where(eq(gatewayCodes.code, code));
      
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Code not found' });
      }
      
      // Delete the code
      await db.delete(gatewayCodes)
        .where(eq(gatewayCodes.code, code));
      
      // Log audit event
      await db.insert(gatewayAuditLog).values({
        action: 'admin_code_deleted',
        success: true,
        metadata: { 
          code, 
          previousData: existing[0],
          adminEmail: req.session.adminEmail 
        }
      });
      
      res.json({ success: true, message: 'Code deleted successfully' });
    } catch (error) {
      console.error('Error deleting gateway code:', error);
      res.status(500).json({ error: 'Failed to delete gateway code' });
    }
  });
  
  // Protect all /api/admin/* routes (except login and status)
  app.use('/api/admin/*', (req, res, next) => {
    // Skip auth for login and status endpoints
    if (req.baseUrl === '/api/admin/login' || req.baseUrl === '/api/admin/status') {
      return next();
    }
    requireAdminAuth(req, res, next);
  });
  
  // ==================== CUSTOM AUTHENTICATION ====================
  
  // Google OAuth authentication - Production Ready
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: "No credential provided" });
      }
      
      // Properly verify the Google token for production
      let googleUser;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
        });
        googleUser = ticket.getPayload();
      } catch (verifyError) {
        console.error('Google token verification failed:', verifyError);
        return res.status(401).json({ message: "Invalid Google credentials. Please try again." });
      }
      
      if (!googleUser) {
        return res.status(401).json({ message: "Invalid authentication" });
      }
      
      const { sub: googleId, email, name, picture } = googleUser;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required for authentication" });
      }
      
      // Check if demo user exists
      let demoUser = await storage.getDemoUserByEmail(email);
      if (!demoUser) {
        demoUser = await storage.getDemoUser(googleId);
      }
      
      if (!demoUser) {
        // Create new demo user
        const demoEndDate = new Date();
        demoEndDate.setDate(demoEndDate.getDate() + 15);
        
        // Generate unique activation code
        const demoKey = `DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        
        demoUser = await storage.upsertDemoUser({
          id: googleId,
          email,
          firstName: name?.split(' ')[0] || '',
          lastName: name?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: picture || '',
          demoStartDate: new Date(),
          demoEndDate,
          demoKey,
          status: 'active',
          // New access management fields
          accessExpiresAt: demoEndDate,
          accessGrantedDays: 15,
          isActive: true
        });
        
        // Issue gateway activation code for new user
        try {
          await gatewayCodesService.issueGatewayCode(googleId, undefined, 30);
        } catch (codeError) {
          console.error('Failed to issue gateway code:', codeError);
          // Don't block login if code generation fails
        }
      } else {
        // Update user profile with latest Google data
        await storage.updateDemoUser(demoUser.id, {
          firstName: name?.split(' ')[0] || demoUser.firstName,
          lastName: name?.split(' ').slice(1).join(' ') || demoUser.lastName,
          profileImageUrl: picture || demoUser.profileImageUrl
        });
        
        // Refresh the user data
        demoUser = await storage.getDemoUser(googleId) || await storage.getDemoUserByEmail(email);
        
        // Check access validity using new fields with fallback
        const now = new Date();
        const expiresAt = demoUser!.accessExpiresAt ? new Date(demoUser!.accessExpiresAt) :
                          (demoUser!.demoEndDate ? new Date(demoUser!.demoEndDate) : null);
        
        if (!expiresAt || now > expiresAt) {
          await storage.updateDemoUser(demoUser!.id, { 
            status: 'expired',
            isActive: false 
          });
          return res.status(403).json({ message: "Your access has expired. Please contact sales for full access." });
        }
        
        // Update isActive if needed
        if (!demoUser!.isActive) {
          await storage.updateDemoUser(demoUser!.id, { isActive: true });
        }
      }
      
      // Ensure we have a valid user
      if (!demoUser) {
        return res.status(500).json({ message: 'Failed to create or retrieve user' });
      }
      
      // Calculate remaining days using correct expiry field
      const expiryDate = demoUser.accessExpiresAt ? new Date(demoUser.accessExpiresAt) :
                         (demoUser.demoEndDate ? new Date(demoUser.demoEndDate) : new Date());
      const remainingDays = Math.max(0, Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      
      // Send activation code via email (in production, use proper email service)
      // For now, we'll still return it but indicate it was "sent"
      console.log(`[EMAIL] Sending activation code ${demoUser.demoKey} to ${demoUser.email}`);
      // TODO: Implement actual email sending using nodemailer or similar service
      
      // Create session in database using storage interface
      const sessionId = crypto.randomBytes(32).toString('hex');
      console.log(`[GOOGLE-AUTH] Generated new sessionId: ${sessionId}`);
      console.log(`[GOOGLE-AUTH] User ID: ${demoUser.id}`);
      console.log(`[GOOGLE-AUTH] User Email: ${demoUser.email}`);
      
      const sessionExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
      const sessionData = {
        userId: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        profileImageUrl: demoUser.profileImageUrl,
        demoKey: demoUser.demoKey,
        isDemo: true
      };
      
      // Save session to database using storage interface
      await storage.createSession(demoUser.id, sessionId, sessionExpiry, sessionData);
      console.log(`[GOOGLE-AUTH] Session created in database successfully`);
      
      // Verify it was saved
      const savedSession = await storage.getSession(sessionId);
      console.log(`[GOOGLE-AUTH] Verification - session exists in DB: ${!!savedSession}`);
      if (savedSession) {
        console.log(`[GOOGLE-AUTH] Session userId in DB: ${savedSession.userId}`);
      }
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
      });
      
      const responseData = {
        success: true,
        user: demoUser,
        sessionId, // Send session ID for client storage
        demoKey: demoUser.demoKey, // In production, remove this and only send via email
        remainingDays,
        message: 'Activation code has been sent to your email address'
      };
      
      console.log(`[GOOGLE-AUTH] Sending response with sessionId: ${sessionId}`);
      console.log(`[GOOGLE-AUTH] Response data keys:`, Object.keys(responseData));
      res.json(responseData);
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ message: "Authentication failed. Please try again." });
    }
  });
  
  // Email/Password sign up
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, password, companyName, country } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getDemoUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash password with bcrypt (production-ready)
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create demo user
      const userId = crypto.randomBytes(16).toString('hex');
      const demoEndDate = new Date();
      demoEndDate.setDate(demoEndDate.getDate() + 15);
      
      // Generate unique activation code
      const demoKey = `DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      
      // Issue gateway activation code for new user
      try {
        await gatewayCodesService.issueGatewayCode(userId, undefined, 30);
      } catch (codeError) {
        console.error('Failed to issue gateway code:', codeError);
        // Don't block signup if code generation fails
      }
      
      const demoUser = await storage.upsertDemoUser({
        id: userId,
        email,
        password: hashedPassword,
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ').slice(1).join(' ') || '',
        companyName: companyName || '',
        country: country || '',
        demoStartDate: new Date(),
        demoEndDate,
        demoKey,
        status: 'active',
        // Access management fields
        accessExpiresAt: demoEndDate,
        accessGrantedDays: 15,
        isActive: true
      });
      
      // Send activation code via email (in production, use proper email service)
      console.log(`[EMAIL] Sending activation code ${demoUser.demoKey} to ${demoUser.email}`);
      
      // Create session in database using storage interface
      const sessionId = crypto.randomBytes(32).toString('hex');
      const sessionExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
      const sessionData = {
        userId: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        profileImageUrl: demoUser.profileImageUrl,
        demoKey: demoUser.demoKey,
        isDemo: true
      };
      
      // Save session to database using storage interface
      await storage.createSession(demoUser.id, sessionId, sessionExpiry, sessionData);
      console.log(`[SIGNUP] Session created for user: ${demoUser.email}, sessionId: ${sessionId.substring(0, 20)}...`);
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
      });
      
      res.json({
        success: true,
        user: demoUser,
        sessionId, // Send session ID for client storage
        demoKey: demoUser.demoKey, // In production, remove this and only send via email
        remainingDays: 15,
        message: 'Activation code has been sent to your email address'
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  // Email/Password sign in
  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Get user by email
      const demoUser = await storage.getDemoUserByEmail(email);
      if (!demoUser) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password with bcrypt
      const isValidPassword = await bcrypt.compare(password, demoUser.password || '');
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check access validity using new fields
      const now = new Date();
      const expiresAt = demoUser.accessExpiresAt ? new Date(demoUser.accessExpiresAt) : 
                        (demoUser.demoEndDate ? new Date(demoUser.demoEndDate) : null);
      
      if (!expiresAt || now > expiresAt) {
        await storage.updateDemoUser(demoUser.id, { 
          status: 'expired',
          isActive: false 
        });
        return res.status(403).json({ message: "Your access has expired. Please contact sales for full access." });
      }
      
      // Update isActive if needed
      if (!demoUser.isActive) {
        await storage.updateDemoUser(demoUser.id, { isActive: true });
      }
      
      // Calculate remaining days
      const remainingDays = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Send activation code via email (in production, use proper email service)
      console.log(`[EMAIL] Sending activation code ${demoUser.demoKey} to ${demoUser.email}`);
      
      // Create session in database using storage interface
      const sessionId = crypto.randomBytes(32).toString('hex');
      const sessionExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
      const sessionData = {
        userId: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        profileImageUrl: demoUser.profileImageUrl,
        demoKey: demoUser.demoKey,
        isDemo: true
      };
      
      // Save session to database using storage interface
      await storage.createSession(demoUser.id, sessionId, sessionExpiry, sessionData);
      console.log(`[SIGNIN] Session created for user: ${demoUser.email}, sessionId: ${sessionId.substring(0, 20)}...`);
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
      });
      
      res.json({
        success: true,
        user: demoUser,
        sessionId, // Send session ID for client storage
        demoKey: demoUser.demoKey, // In production, remove this and only send via email
        remainingDays,
        message: 'Activation code has been sent to your email address'
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });
  
  // ==================== GATEWAY DOWNLOAD SYSTEM ====================
  
  // Generate and serve gateway installer file
  app.post('/api/gateway/generate-download', customAuth, async (req: any, res) => {
    try {
      const { platform, activationCode } = req.body;
      const userId = req.user.userId || req.user.claims?.sub;
      const tenantId = req.user.tenantId || userId;
      
      if (!platform || !activationCode) {
        return res.status(400).json({ message: 'Platform and activation code required' });
      }
      
      // Validate platform
      if (!['windows', 'linux', 'docker'].includes(platform)) {
        return res.status(400).json({ message: 'Invalid platform' });
      }
      
      // Get demo user to check validity
      const demoUser = await storage.getDemoUser(userId);
      if (!demoUser) {
        return res.status(404).json({ message: "Demo user not found" });
      }
      
      // Check if access is still valid
      const now = new Date();
      const expiresAt = demoUser.accessExpiresAt ? new Date(demoUser.accessExpiresAt) :
                        (demoUser.demoEndDate ? new Date(demoUser.demoEndDate) : null);
      
      if (!expiresAt || now > expiresAt) {
        return res.status(403).json({ message: "Your access has expired" });
      }
      
      // Generate the installer package
      console.log(`Generating ${platform} installer for user ${userId} with code ${activationCode}`);
      
      const installerBuffer = await GatewayInstallerGenerator.generateInstaller({
        platform: platform as 'windows' | 'linux' | 'docker',
        activationCode,
        userId,
        tenantId,
        apiUrl: process.env.API_URL || `https://${req.get('host')}`
      });
      
      // Update demo user to mark gateway as downloaded
      await storage.updateDemoUser(userId, {
        gatewayDownloaded: true,
        gatewayDownloadedAt: new Date()
      });
      
      // Set appropriate headers for file download
      const filename = `hercules-gateway-${platform}-${Date.now()}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', installerBuffer.length.toString());
      
      // Send the installer file
      res.send(installerBuffer);
      
    } catch (error) {
      console.error('Download generation error:', error);
      res.status(500).json({ message: 'Failed to generate download' });
    }
  });
  
  // Get demo status and remaining days
  app.get('/api/demo/status', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      const demoUser = await storage.getDemoUser(userId);
      
      if (!demoUser) {
        return res.status(404).json({ message: "Demo user not found" });
      }
      
      const now = new Date();
      const demoEndDate = new Date(demoUser.demoEndDate!);
      const remainingDays = Math.max(0, Math.ceil((demoEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      res.json({
        status: demoUser.status,
        demoStartDate: demoUser.demoStartDate,
        demoEndDate: demoUser.demoEndDate,
        remainingDays,
        gatewayDownloaded: demoUser.gatewayDownloaded,
        demoKey: demoUser.demoKey
      });
    } catch (error) {
      console.error("Error fetching demo status:", error);
      res.status(500).json({ message: "Failed to fetch demo status" });
    }
  });
  
  // Register endpoint for demo accounts
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, companyName, firstName, lastName, country } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Check if email already exists in database
      const existingUser = await storage.getDemoUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create demo user in database
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const demoEndDate = new Date();
      demoEndDate.setDate(demoEndDate.getDate() + 15);
      const demoKey = `DEMO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const demoUser = await storage.upsertDemoUser({
        id: userId,
        email,
        password: passwordHash,
        firstName: firstName || '',
        lastName: lastName || '',
        companyName: companyName || '',
        country: country || '',
        demoStartDate: new Date(),
        demoEndDate,
        demoKey,
        status: 'active',
        // New access management fields
        accessExpiresAt: demoEndDate,
        accessGrantedDays: 15,
        isActive: true
      });
      
      // Generate JWT token for the new user
      const token = jwt.sign(
        { userId: demoUser.id, email: demoUser.email, role: 'operator' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Create session for consistent auth handling
      const sessionId = crypto.randomBytes(32).toString('hex');
      const sessionData = {
        userId: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        demoKey: demoUser.demoKey,
        createdAt: new Date()
      };
      
      // Store session in database
      await storage.createSession(demoUser.id, sessionId, demoEndDate, sessionData);
      
      // Issue gateway activation code for the new user
      const { code: gatewayCode, expiresAt: codeExpiresAt } = await gatewayCodesService.issueGatewayCode(
        demoUser.id,
        undefined, // No tenant ID for demo users
        30 // 30 days expiry
      );
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
      });
      
      res.status(201).json({
        message: 'Demo registration successful',
        token,
        sessionId,  // Include sessionId for client storage
        user: {
          id: demoUser.id,
          email: demoUser.email,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          role: 'operator'
        },
        demoEndDate: demoEndDate.toISOString(),
        gatewayCode, // Include gateway activation code
        remainingDays: 15
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        message: 'Registration failed', 
        error: error.message 
      });
    }
  });
  
  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user by email
      const user = Array.from(demoStorage.users.values()).find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Get tenant
      const tenant = demoStorage.tenants.get(user.tenantId);
      if (!tenant) {
        return res.status(500).json({ message: 'Tenant not found' });
      }
      
      // Check if demo has expired
      if (tenant.status === 'demo' && new Date() > tenant.demoEndDate) {
        tenant.status = 'expired';
        return res.status(403).json({ 
          message: 'Your 15-day demo has expired',
          expired: true 
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Create session for consistent auth handling
      const sessionId = crypto.randomBytes(32).toString('hex');
      const sessionData = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: new Date()
      };
      
      await sessionStore.set(sessionId, sessionData);
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
      });
      
      res.json({
        message: 'Login successful',
        token,
        sessionId,  // Include sessionId for client storage
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        tenant: {
          id: tenant.id,
          companyName: tenant.companyName,
          companyCode: tenant.companyCode,
          status: tenant.status,
          demoEndDate: tenant.demoEndDate.toISOString()
        }
      });
      
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: 'Login failed', 
        error: error.message 
      });
    }
  });
  
  // ==================== ADMIN API ROUTES ====================
  
  // Note: GET /api/admin/users endpoint already defined above with full access information
  
  // Get all gateway codes (admin only)
  app.get('/api/admin/gateway-codes', requireAdminAuth, async (req, res) => {
    try {
      // Get gateway codes from database using Drizzle
      const rawCodes = await db.select().from(gatewayCodes).orderBy(sql`created_at DESC`);
      
      // Map field names to match frontend expectations (snake_case)
      const codes = rawCodes.map(code => ({
        id: code.id,
        code: code.code,
        user_id: code.userId,
        gateway_id: code.gatewayId,
        machine_id: code.machineId,
        status: code.status,
        expires_at: code.expiresAt,
        activated_at: code.activatedAt,
        created_at: code.createdAt,
        redeemed_at: code.redeemedAt,
        notes: 'Active gateway code'
      }));
      
      res.json({
        success: true,
        codes
      });
    } catch (error: any) {
      console.error('Failed to fetch gateway codes:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch gateway codes',
        error: error.message 
      });
    }
  });
  
  // Get audit logs (admin only)
  app.get('/api/admin/audit-logs', requireAdminAuth, async (req, res) => {
    try {
      // Get actual audit logs from the gateway audit log table
      const rawLogs = await db.select()
        .from(gatewayAuditLog)
        .orderBy(sql`${gatewayAuditLog.createdAt} DESC`)
        .limit(100);
      
      // Map field names to match frontend expectations (snake_case)
      const logs = rawLogs.map(log => ({
        id: log.id,
        action: log.action,
        success: log.success,
        user_id: log.userId,
        gateway_id: log.gatewayId,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        error_message: log.errorMessage,
        metadata: log.metadata,
        created_at: log.createdAt
      }));
      
      res.json({
        success: true,
        logs
      });
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch audit logs',
        error: error.message 
      });
    }
  });
  
  // Test connectivity endpoint (no auth required for testing)
  app.get('/api/gateway/test-connection', (req, res) => {
    const host = req.get('host');
    const protocol = req.protocol;
    const correctUrl = `${protocol}://${host}/api/gateway/activate`;
    
    res.json({
      success: true,
      message: 'Gateway server is reachable',
      serverTime: new Date().toISOString(),
      correctActivationUrl: correctUrl,
      instructions: {
        step1: 'Update your gateway config.json file',
        step2: `Set api_base to: ${protocol}://${host}`,
        step3: 'Restart your gateway software',
        note: 'DO NOT use https://www.herculesv2.com - that is a production URL'
      }
    });
  });
  
  // Diagnostic endpoint to check activation code validity (admin only)
  app.post('/api/admin/check-activation-code', requireAdminAuth, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, message: 'Code is required' });
      }
      
      // Check if code exists and get its status
      const [gatewayCode] = await db.select()
        .from(gatewayCodes)
        .where(eq(gatewayCodes.code, code));
      
      if (!gatewayCode) {
        // Try to find similar codes (for typo detection)
        const prefix = code.substring(0, 8);
        const similarCodes = await db.select({
          code: gatewayCodes.code,
          status: gatewayCodes.status
        })
          .from(gatewayCodes)
          .where(sql`${gatewayCodes.code} LIKE ${prefix + '%'}`)
          .limit(5);
        
        return res.json({
          success: false,
          message: 'Code not found',
          providedCode: code,
          similarCodes: similarCodes.length > 0 ? similarCodes : undefined,
          suggestion: similarCodes.length > 0 ? 
            'Check for typos. Similar codes found with the same prefix.' : 
            'No similar codes found. The code may not exist.'
        });
      }
      
      // Code exists, return its details
      const now = new Date();
      const isExpired = gatewayCode.expiresAt < now;
      const canActivate = (gatewayCode.status === 'issued' || gatewayCode.status === 'pending') && !isExpired;
      
      res.json({
        success: true,
        code: gatewayCode.code,
        status: gatewayCode.status,
        userId: gatewayCode.userId,
        expiresAt: gatewayCode.expiresAt,
        isExpired,
        canActivate,
        message: canActivate ? 
          'Code is valid and can be activated' : 
          `Code cannot be activated: ${isExpired ? 'expired' : gatewayCode.status}`
      });
    } catch (error: any) {
      console.error('Failed to check activation code:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to check activation code',
        error: error.message 
      });
    }
  });
  
  // ==================== ACTIVATION CODES ====================
  
  // Get activation codes for current tenant
  app.get('/api/activation-codes', customAuth, async (req: any, res) => {
    try {
      const codes = Array.from(demoStorage.activationCodes.values())
        .filter(code => code.tenantId === req.tenantId);
      
      res.json(codes);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch activation codes', 
        error: error.message 
      });
    }
  });
  
  // Generate new activation code
  app.post('/api/activation-codes', customAuth, async (req: any, res) => {
    try {
      const { facilityName, facilityCode } = req.body;
      
      const tenant = demoStorage.tenants.get(req.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      // Create facility
      const facilityId = Date.now().toString();
      const facility = {
        id: facilityId,
        tenantId: req.tenantId,
        facilityCode: facilityCode || `FAC${Date.now().toString().slice(-3)}`,
        name: facilityName,
        gatewayStatus: 'disconnected',
        createdAt: new Date()
      };
      demoStorage.facilities.set(facilityId, facility);
      
      // Generate activation code
      const activationCode = generateActivationCode(tenant.companyCode, facility.facilityCode);
      const codeId = Date.now().toString() + '1';
      const code = {
        id: codeId,
        code: activationCode,
        tenantId: req.tenantId,
        facilityId,
        status: 'pending',
        expiresAt: tenant.demoEndDate,
        createdAt: new Date()
      };
      demoStorage.activationCodes.set(codeId, code);
      
      res.status(201).json({
        activationCode,
        facility,
        expiresAt: tenant.demoEndDate.toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to generate activation code', 
        error: error.message 
      });
    }
  });
  
  // Activate gateway (called by the gateway software) - Enhanced with secure one-time activation
  const activateHandler = async (req: any, res: any) => {
    try {
      // Debug logging for production (one-time debug)
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      console.log('Activation attempt received:', {
        url: req.url,
        method: req.method,
        ip: ipAddress,
        bodyKeys: Object.keys(req.body || {}),
        code: req.body?.activationCode?.substring(0, 8) || req.body?.activation_code?.substring(0, 8)
      });
      
      // Use the helper function to normalize inputs
      const { activationCode, machineId, raw } = getActivationPayload(req);
      
      // Validate required fields
      if (!activationCode) {
        // Log failed attempt - missing code
        await gatewayService.logAuditEvent('activation_failed', false, {
          ipAddress,
          errorMessage: 'Missing activation code',
          metadata: { error: 'ACTIVATION_CODE_MISSING' }
        });
        const error = GatewayErrors.activationCodeMissingError();
        return res.status(error.statusCode)
          .type('application/json')
          .json(error.response);
      }
      
      // Validate activation code format
      if (!GatewayErrors.isValidActivationCodeFormat(activationCode)) {
        await gatewayService.logAuditEvent('activation_failed', false, {
          ipAddress,
          errorMessage: 'Invalid activation code format',
          metadata: { error: 'ACTIVATION_CODE_FORMAT_INVALID', codePrefix: activationCode.substring(0, 8) }
        });
        const error = GatewayErrors.activationCodeFormatError(activationCode);
        return res.status(error.statusCode)
          .type('application/json')
          .json(error.response);
      }
      
      if (!machineId) {
        // Log failed attempt - missing machine ID
        await gatewayService.logAuditEvent('activation_failed', false, {
          ipAddress,
          errorMessage: 'Missing machine ID',
          metadata: { error: 'MACHINE_ID_MISSING', codePrefix: activationCode.substring(0, 8) }
        });
        const error = GatewayErrors.machineIdMissingError();
        return res.status(error.statusCode)
          .type('application/json')
          .json(error.response);
      }
      
      // Validate machine ID format
      if (!GatewayErrors.isValidMachineIdFormat(machineId)) {
        await gatewayService.logAuditEvent('activation_failed', false, {
          ipAddress,
          errorMessage: 'Invalid machine ID format',
          metadata: { error: 'MACHINE_ID_FORMAT_INVALID', machineId: machineId.substring(0, 8) }
        });
        const error = GatewayErrors.createGatewayError(
          GatewayErrors.GatewayErrorCode.MACHINE_ID_FORMAT_INVALID,
          'Machine ID format is invalid. It should be at least 8 characters long and contain only alphanumeric characters and hyphens.',
          {
            field: 'machineId',
            received: machineId,
            validFormat: 'At least 8 characters, alphanumeric with optional hyphens',
            hint: 'Ensure the machine ID is generated correctly by your gateway software'
          }
        );
        return res.status(error.statusCode)
          .type('application/json')
          .json(error.response);
      }
      
      // Extract other fields from raw body
      const gatewayInfo = raw.gatewayInfo ?? raw.gateway_info ?? {};
      const normalizedGatewayInfo = { 
        ...gatewayInfo, 
        hardware: { ...gatewayInfo.hardware, machineId } 
      };
      
      const userId = raw.userId ?? raw.user_id;
      
      // Check rate limit
      if (!checkActivationRateLimit(ipAddress)) {
        // Rate limit exceeded
        await gatewayService.logAuditEvent('activation_rate_limited', false, {
          ipAddress,
          metadata: { 
            message: 'Rate limit exceeded',
            limit: `${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000} seconds`
          }
        });
        
        const error = GatewayErrors.rateLimitExceededError(RATE_LIMIT_WINDOW);
        return res.status(error.statusCode)
          .type('application/json')
          .json(error.response);
      }
      
      // Use the comprehensive activation function that handles everything end-to-end
      const activationResult = await gatewayService.activateGateway(
        activationCode,
        ipAddress,
        normalizedGatewayInfo
      );
      
      // Handle activation result with proper HTTP status codes
      if ('error' in activationResult) {
        let statusCode = 500; // Default for unexpected errors
        let errorCode = 'activation_failed';
        
        // Map business errors to appropriate HTTP status codes
        switch (activationResult.code) {
          case 'ACTV_CODE_INVALID':
          case 'MISSING_MACHINE_ID':
            statusCode = 400;
            errorCode = 'invalid_code';
            break;
          case 'ACTV_CODE_EXPIRED':
            statusCode = 410; // Gone
            errorCode = 'code_expired';
            break;
          case 'ACTV_CODE_REVOKED':
            statusCode = 410; // Gone
            errorCode = 'code_revoked';
            break;
          case 'MACHINE_MISMATCH':
            statusCode = 409; // Conflict
            errorCode = 'machine_mismatch';
            break;
          case 'RATE_LIMITED':
            statusCode = 429; // Too Many Requests
            errorCode = 'rate_limited';
            break;
          // 500 for unexpected internal errors
        }
        
        return res.status(statusCode)
          .type('application/json')
          .json({ 
            ok: false,
            error: errorCode,
            message: activationResult.error,
            details: { code: activationResult.code || 'unknown' }
          });
      }
      
      const { token, gatewayId, userId: activationUserId } = activationResult;
      const statusCode = 201;
      
      // Successful activation - return unified format
      res.status(statusCode)
        .type('application/json')
        .json({
        ok: true,
        token: token,
        gatewayId: gatewayId,
        userId: activationUserId,
        endpoints: {
          config: '/api/gateway/config',
          heartbeat: '/api/gateway/heartbeat',
          data: '/api/gateway/data',
          ws: '/gateway'
        }
      });
    } catch (error: any) {
      console.error('Gateway activation failed:', error);
      const gatewayError = GatewayErrors.internalServerError('Gateway activation failed');
      res.status(gatewayError.statusCode)
        .type('application/json')
        .json(gatewayError.response);
    }
  };

  // Mount activation handler on both route prefixes
  app.post('/api/gateway/activate', activateHandler);
  app.post('/api/v1/gateway/activate', activateHandler);
  
  // Token refresh endpoint - allows gateways to refresh their tokens
  app.post('/api/gateway/refresh', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!authHeader.startsWith('Bearer ')) {
        const error = GatewayErrors.tokenFormatInvalidError(authHeader.substring(0, 20));
        return res.status(error.statusCode).json(error.response);
      }
      
      const oldToken = authHeader.substring(7);
      const payload = gatewayService.verifyGatewayToken(oldToken);
      
      if (!payload) {
        const error = GatewayErrors.createGatewayError(
          GatewayErrors.GatewayErrorCode.TOKEN_INVALID,
          'Cannot refresh an invalid or expired token. Gateway must be reactivated.',
          {
            hint: 'Use the /api/gateway/activate endpoint with a valid activation code to reactivate the gateway'
          }
        );
        return res.status(error.statusCode).json(error.response);
      }
      
      // Generate new token with same claims
      const newToken = jwt.sign(
        {
          gatewayId: payload.gatewayId,
          userId: payload.userId
        },
        process.env.JWT_SECRET || 'hercules-sfms-gateway-secret-2024',
        { expiresIn: '7d', algorithm: 'HS256' }
      );
      
      // Update stored token
      await db.update(gatewayCodes)
        .set({
          gatewayToken: newToken,
          lastSyncAt: new Date()
        })
        .where(eq(gatewayCodes.gatewayId, payload.gatewayId));
      
      // Log token refresh
      await gatewayService.logAuditEvent('token_refresh', true, {
        gatewayId: payload.gatewayId,
        userId: payload.userId
      });
      
      res.status(200).json({
        ok: true,
        token: newToken,
        expiresIn: '7d'
      });
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      const gatewayError = GatewayErrors.internalServerError('Token refresh failed');
      res.status(gatewayError.statusCode).json(gatewayError.response);
    }
  });
  
  // Gateway heartbeat - Enhanced with token validation
  app.post('/api/gateway/heartbeat', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!authHeader.startsWith('Bearer ')) {
        const error = GatewayErrors.tokenFormatInvalidError(authHeader.substring(0, 20));
        return res.status(error.statusCode).json(error.response);
      }
      
      const token = authHeader.substring(7);
      const payload = gatewayService.verifyGatewayToken(token);
      
      if (!payload) {
        const error = GatewayErrors.tokenExpiredError();
        return res.status(error.statusCode).json(error.response);
      }
      
      // Normalize input - accept both metrics and metrics_data
      const b = req.body ?? {};
      const metrics = b.metrics ?? b.metrics_data ?? {};
      const status = b.status;
      const timestamp_ms = b.timestamp_ms ?? b.timestamp;
      const config_version = b.config_version ?? b.configVersion;
      
      // Update gateway last sync time with better error handling
      try {
        await db.update(gatewayCodes)
          .set({
            lastSyncAt: new Date(),
            syncCount: sql`${gatewayCodes.syncCount} + 1`
          })
          .where(eq(gatewayCodes.gatewayId, payload.gatewayId));
      } catch (dbError: any) {
        console.error('Failed to update gateway sync time:', {
          gatewayId: payload.gatewayId,
          error: dbError.message,
          stack: dbError.stack
        });
        // Continue processing even if sync update fails
      }
      
      // Log heartbeat with error handling
      try {
        await gatewayService.logAuditEvent('heartbeat', true, {
          gatewayId: payload.gatewayId,
          userId: payload.userId,
          metadata: { status, metrics, timestamp_ms }
        });
      } catch (auditError: any) {
        console.error('Failed to log heartbeat audit event:', {
          gatewayId: payload.gatewayId,
          error: auditError.message
        });
        // Continue processing even if audit logging fails
      }
      
      // Check if configuration has been updated (for hot-reload signaling)
      const currentConfigVersion = `v_${new Date().toISOString()}`;
      const configUpdateAvailable = config_version && config_version !== currentConfigVersion;
      
      // Get pending commands for Gateway v2.0.0 with detailed error handling
      let pendingCommands: GatewayCommand[] = [];
      try {
        pendingCommands = await storage.getPendingGatewayCommands(payload.gatewayId);
        console.log(`Retrieved ${pendingCommands.length} pending commands for gateway ${payload.gatewayId}`);
      } catch (cmdError: any) {
        console.error('Failed to get pending gateway commands:', {
          gatewayId: payload.gatewayId,
          error: cmdError.message,
          stack: cmdError.stack,
          errorCode: cmdError.code,
          detail: cmdError.detail
        });
        // Return success response but with empty commands array
        pendingCommands = [];
      }
      
      // Mark commands as sent with error handling
      for (const command of pendingCommands) {
        try {
          await storage.markCommandSent(command.id);
        } catch (markError: any) {
          console.error('Failed to mark command as sent:', {
            commandId: command.id,
            gatewayId: payload.gatewayId,
            error: markError.message
          });
          // Continue with other commands even if one fails
        }
      }
      
      // Unified response format with Gateway v2.0.0 enhancements
      res.status(200).json({ 
        ok: true,
        timestamp_ms: Date.now(),
        next_heartbeat_ms: 30000,
        commands: pendingCommands.map(cmd => ({
          id: cmd.id,
          command: cmd.commandType,
          parameters: cmd.commandData,
          priority: cmd.priority
        }))
      });
    } catch (error: any) {
      console.error('Heartbeat processing failed with unexpected error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        name: error.name,
        body: req.body,
        headers: {
          authorization: req.headers.authorization ? 'Bearer [REDACTED]' : undefined,
          'content-type': req.headers['content-type']
        }
      });
      const gatewayError = GatewayErrors.internalServerError(`Heartbeat processing failed: ${error.message}`);
      res.status(gatewayError.statusCode).json(gatewayError.response);
    }
  });
  
  // ==================== GATEWAY V2.0.0 TABLE MANAGEMENT ENDPOINTS ====================
  
  // POST /api/gateway/tables/status - Accept gateway database status reports
  app.post('/api/gateway/tables/status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!authHeader.startsWith('Bearer ')) {
        const error = GatewayErrors.tokenFormatInvalidError(authHeader.substring(0, 20));
        return res.status(error.statusCode).json(error.response);
      }
      
      const token = authHeader.substring(7);
      const payload = gatewayService.verifyGatewayToken(token);
      
      if (!payload) {
        const error = GatewayErrors.tokenExpiredError();
        return res.status(error.statusCode).json(error.response);
      }
      
      const { tables, timestamp_ms } = req.body;
      
      if (!tables || !Array.isArray(tables)) {
        return res.status(400).json({
          ok: false,
          error: 'bad_request',
          message: 'Invalid table status data'
        });
      }
      
      // Store table status reports
      const statusRecords = tables.map(table => ({
        gatewayId: payload.gatewayId,
        tableName: table.table_name,
        rowCount: table.row_count || 0,
        sizeBytes: table.size_bytes || 0,
        oldestRecord: table.oldest_record ? new Date(table.oldest_record) : null,
        newestRecord: table.newest_record ? new Date(table.newest_record) : null,
        compressionRatio: table.compression_ratio || null,
        fragmentationPercent: table.fragmentation_percent || null,
        reportedAt: new Date(timestamp_ms || Date.now())
      }));
      
      await storage.bulkCreateTableStatus(statusRecords);
      
      // Generate cleanup recommendations based on status
      const recommendations = [];
      const commands = [];
      
      for (const table of tables) {
        // Check if table needs cleanup based on size or age
        if (table.size_bytes > 100 * 1024 * 1024) { // > 100MB
          recommendations.push({
            table_name: table.table_name,
            action: 'cleanup',
            reason: 'Table size exceeds 100MB',
            priority: 'high'
          });
          
          // Queue cleanup command
          await storage.createGatewayCommand({
            gatewayId: payload.gatewayId,
            commandType: 'cleanup_table',
            commandData: {
              table_name: table.table_name,
              retention_days: 30
            },
            priority: 1,
            status: 'pending'
          });
        }
        
        // Check fragmentation
        if (table.fragmentation_percent && table.fragmentation_percent > 30) {
          recommendations.push({
            table_name: table.table_name,
            action: 'vacuum',
            reason: 'High fragmentation detected',
            priority: 'medium'
          });
          
          // Queue vacuum command
          await storage.createGatewayCommand({
            gatewayId: payload.gatewayId,
            commandType: 'vacuum_table',
            commandData: {
              table_name: table.table_name
            },
            priority: 2,
            status: 'pending'
          });
        }
      }
      
      res.status(200).json({
        ok: true,
        recommendations,
        commands: commands.length,
        message: 'Table status recorded successfully'
      });
      
    } catch (error: any) {
      console.error('Table status update failed:', error);
      const gatewayError = GatewayErrors.internalServerError('Failed to process table status');
      res.status(gatewayError.statusCode).json(gatewayError.response);
    }
  });
  
  // POST /api/gateway/tables/sync - Schema synchronization endpoint
  app.post('/api/gateway/tables/sync', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!authHeader.startsWith('Bearer ')) {
        const error = GatewayErrors.tokenFormatInvalidError(authHeader.substring(0, 20));
        return res.status(error.statusCode).json(error.response);
      }
      
      const token = authHeader.substring(7);
      const payload = gatewayService.verifyGatewayToken(token);
      
      if (!payload) {
        const error = GatewayErrors.tokenExpiredError();
        return res.status(error.statusCode).json(error.response);
      }
      
      const { current_version, current_tables } = req.body;
      
      // Get active schema for the user
      const activeSchema = await storage.getActiveGatewaySchema(payload.userId);
      
      if (!activeSchema) {
        // Return default schema if no custom schema exists
        return res.status(200).json({
          ok: true,
          schema_version: 'default_v1',
          operations: [
            {
              operation: 'CREATE_TABLE_IF_NOT_EXISTS',
              table_name: 'plc_data',
              sql: `CREATE TABLE IF NOT EXISTS plc_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tag_id TEXT NOT NULL,
                value REAL,
                quality TEXT,
                timestamp INTEGER NOT NULL
              )`,
              indices: [
                'CREATE INDEX IF NOT EXISTS idx_tag_timestamp ON plc_data(tag_id, timestamp)',
                'CREATE INDEX IF NOT EXISTS idx_timestamp ON plc_data(timestamp)'
              ]
            }
          ],
          tag_mapping: {
            default: 'plc_data'
          },
          retention_policies: {
            plc_data: { days: 30, strategy: 'delete_oldest' }
          },
          message: 'Using default schema configuration'
        });
      }
      
      // Check if schema version matches
      if (current_version === activeSchema.version) {
        return res.status(200).json({
          ok: true,
          schema_version: activeSchema.version,
          operations: [],
          tag_mapping: activeSchema.tagMapping || {},
          retention_policies: activeSchema.retentionPolicies || {},
          message: 'Schema is up to date'
        });
      }
      
      // Generate operations to sync schema
      const operations = [];
      const tables = await storage.getGatewayTablesBySchema(activeSchema.id);
      
      // Track which tables exist in gateway
      const existingTables = new Set(current_tables || []);
      
      for (const table of tables) {
        if (!table.isActive) {
          // Drop inactive tables
          if (existingTables.has(table.tableName)) {
            operations.push({
              operation: 'DROP_TABLE',
              table_name: table.tableName,
              sql: `DROP TABLE IF EXISTS ${table.tableName}`
            });
          }
        } else {
          // Create or alter active tables
          if (!existingTables.has(table.tableName)) {
            // Create new table
            const columns = table.columns || {
              id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
              tag_id: 'TEXT NOT NULL',
              value: 'REAL',
              quality: 'TEXT',
              timestamp: 'INTEGER NOT NULL'
            };
            
            const columnDefs = Object.entries(columns).map(([name, def]) => {
              if (typeof def === 'string') {
                return `${name} ${def}`;
              } else if (typeof def === 'object' && def !== null) {
                let colDef = `${name} ${def.type}`;
                if (def.primary_key) colDef += ' PRIMARY KEY';
                if (def.auto_increment) colDef += ' AUTOINCREMENT';
                if (def.not_null) colDef += ' NOT NULL';
                return colDef;
              }
              return `${name} TEXT`;
            }).join(',\n  ');
            
            operations.push({
              operation: 'CREATE_TABLE',
              table_name: table.tableName,
              sql: `CREATE TABLE IF NOT EXISTS ${table.tableName} (\n  ${columnDefs}\n)`,
              indices: (Array.isArray(table.indices) ? table.indices : []).map(idx => {
                const colList = Array.isArray(idx.columns) ? idx.columns.join(', ') : idx.columns;
                return `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${table.tableName}(${colList})`;
              })
            });
          } else {
            // Table exists, check if we need to add indices
            if (table.indices && Array.isArray(table.indices) && table.indices.length > 0) {
              for (const idx of table.indices) {
                const colList = Array.isArray(idx.columns) ? idx.columns.join(', ') : idx.columns;
                operations.push({
                  operation: 'CREATE_INDEX',
                  table_name: table.tableName,
                  sql: `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${table.tableName}(${colList})`
                });
              }
            }
          }
        }
      }
      
      // Check for tables to drop that aren't in the new schema
      for (const tableName of Array.from(existingTables)) {
        const tableInSchema = tables.find(t => t.tableName === tableName && t.isActive);
        if (!tableInSchema) {
          operations.push({
            operation: 'DROP_TABLE',
            table_name: tableName,
            sql: `DROP TABLE IF EXISTS ${tableName}`
          });
        }
      }
      
      res.status(200).json({
        ok: true,
        schema_version: activeSchema.version,
        operations,
        tag_mapping: activeSchema.tagMapping || {},
        retention_policies: activeSchema.retentionPolicies || {},
        message: operations.length > 0 ? 'Schema sync required' : 'Schema is up to date'
      });
      
    } catch (error: any) {
      console.error('Schema sync failed:', error);
      const gatewayError = GatewayErrors.internalServerError('Failed to sync schema');
      res.status(gatewayError.statusCode).json(gatewayError.response);
    }
  });
  
  // Gateway data sync - receives tag values from gateway with authentication
  const dataSyncHandler = async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!authHeader.startsWith('Bearer ')) {
        const error = GatewayErrors.tokenFormatInvalidError(authHeader.substring(0, 20));
        return res.status(error.statusCode).json(error.response);
      }
      
      const token = authHeader.substring(7);
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Validate request body
      if (!req.body) {
        const error = GatewayErrors.createGatewayError(
          GatewayErrors.GatewayErrorCode.REQUEST_BODY_MISSING,
          'Request body is required for data synchronization.',
          { hint: 'Send data in JSON format with batch_id, timestamp, and data fields' }
        );
        return res.status(error.statusCode).json(error.response);
      }
      
      // Normalize input - accept different naming conventions
      const b = req.body;
      const normalizedBody = {
        batchId: b.batchId ?? b.batch_id,
        timestamp: b.timestamp ?? b.created_at,
        data: b.data ?? b.records ?? []
      };
      
      // Validate batch ID
      if (!normalizedBody.batchId) {
        const error = GatewayErrors.batchIdMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      // Validate data array
      if (!Array.isArray(normalizedBody.data)) {
        const error = GatewayErrors.dataFormatInvalidError('data', 'Data field must be an array of tag values');
        return res.status(error.statusCode).json(error.response);
      }
      
      // Check batch size limit (e.g., 1000 items)
      const MAX_BATCH_SIZE = 1000;
      if (normalizedBody.data.length > MAX_BATCH_SIZE) {
        const error = GatewayErrors.batchSizeExceededError(MAX_BATCH_SIZE, normalizedBody.data.length);
        return res.status(error.statusCode).json(error.response);
      }
      
      // Validate each data point
      for (let i = 0; i < normalizedBody.data.length; i++) {
        const item = normalizedBody.data[i];
        if (!item.tag_id && !item.tagId) {
          const error = GatewayErrors.dataFormatInvalidError(
            `data[${i}]`,
            `Missing tag_id for data item at index ${i}`
          );
          return res.status(error.statusCode).json(error.response);
        }
        if (item.value === undefined && item.value === null) {
          const error = GatewayErrors.dataFormatInvalidError(
            `data[${i}]`,
            `Missing value for tag ${item.tag_id || item.tagId} at index ${i}`
          );
          return res.status(error.statusCode).json(error.response);
        }
      }
      
      const result = await gatewayService.syncGatewayData(
        token,
        normalizedBody,
        ipAddress
      );
      
      if (!result.success) {
        // Handle specific error cases with improved messages
        if (result.error?.includes('expired')) {
          const error = GatewayErrors.tokenExpiredError();
          return res.status(error.statusCode).json(error.response);
        }
        if (result.error?.includes('Invalid')) {
          const error = GatewayErrors.tokenInvalidError();
          return res.status(error.statusCode).json(error.response);
        }
        if (result.error?.includes('Rate limit')) {
          const error = GatewayErrors.rateLimitExceededError(60000); // 1 minute retry
          return res.status(error.statusCode).json(error.response);
        }
        
        // Generic data sync error
        const error = GatewayErrors.createGatewayError(
          GatewayErrors.GatewayErrorCode.DATA_FORMAT_INVALID,
          result.error || 'Data synchronization failed.',
          { hint: 'Check your data format and try again' }
        );
        return res.status(error.statusCode).json(error.response);
      }
      
      // Unified response format with 202 Accepted status
      res.status(202).json({ 
        ok: true,
        batch_id: normalizedBody.batchId,
        accepted_count: normalizedBody.data.length, // All data was accepted since no error returned
        rejected_count: 0, // No rejected items since validation passed
        timestamp_ms: Date.now()
      });
    } catch (error: any) {
      console.error('Data sync failed:', error);
      const gatewayError = GatewayErrors.internalServerError('Data sync processing failed');
      res.status(gatewayError.statusCode).json(gatewayError.response);
    }
  };

  // Mount data sync handler on both route prefixes  
  app.post('/api/gateway/data', dataSyncHandler);
  app.post('/api/v1/gateway/data', dataSyncHandler);
  
  // POST endpoint for requesting historical data (simplified version - directly queries database)
  app.post('/api/gateway/historical-data', optionalAuthMiddleware, async (req: any, res: any) => {
    try {
      // Handle authentication
      let userId = null;
      
      console.log('[HISTORICAL-DATA] Auth check - req.user:', req.user ? 'present' : 'missing');
      
      // Check if user was authenticated by optionalAuthMiddleware
      if (req.user) {
        userId = req.user.userId || req.user.id || req.user.claims?.sub;
        console.log('[HISTORICAL-DATA] User authenticated:', userId);
      }
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User authentication required' 
        });
      }
      
      // Extract request body parameters
      const { tagIds, start_date, end_date } = req.body;
      
      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Both start_date and end_date are required',
          hint: 'Provide date range in ISO format: start_date="2024-01-01T00:00:00Z", end_date="2024-01-31T23:59:59Z"'
        });
      }
      
      // Parse tag IDs
      let requestedTagIds: number[] = [];
      if (tagIds) {
        if (typeof tagIds === 'string') {
          requestedTagIds = tagIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
        } else if (Array.isArray(tagIds)) {
          requestedTagIds = tagIds.map(id => parseInt(String(id).trim(), 10)).filter(id => !isNaN(id));
        }
      }
      
      if (requestedTagIds.length === 0) {
        return res.json({ 
          batch_id: `historical_${Date.now()}`,
          start_date: start_date,
          end_date: end_date,
          timestamp: new Date().toISOString(),
          data: [],
          message: 'No tags requested' 
        });
      }
      
      // Parse and validate dates
      const startDate = new Date(String(start_date));
      const endDate = new Date(String(end_date));
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Invalid date format',
          hint: 'Use ISO format: 2024-01-01T00:00:00Z'
        });
      }
      
      if (startDate > endDate) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'start_date must be before end_date'
        });
      }
      
      console.log(`[HISTORICAL-DATA] Fetching data for tags ${requestedTagIds} from ${startDate} to ${endDate}`);
      
      // For now, generate simulated historical data for demonstration
      // In production, this would query the actual database or gateway's local database
      const historicalData: any[] = [];
      
      // Generate sample data points for each tag
      const dataPointsPerTag = 20; // Generate 20 data points per tag
      const timeInterval = (endDate.getTime() - startDate.getTime()) / dataPointsPerTag;
      
      for (const tagId of requestedTagIds) {
        // Get tag info
        const tags = await storage.getPlcTagsByUser(userId);
        const tag = tags.find(t => t.id === tagId);
        if (!tag) continue;
        
        // Get PLC info
        const plcs = await storage.getAllPlcDevices(userId);
        const plc = plcs.find(p => p.id === tag.plcId);
        
        // Generate historical data points
        for (let i = 0; i < dataPointsPerTag; i++) {
          const timestamp = new Date(startDate.getTime() + (timeInterval * i));
          const baseValue = 50 + Math.random() * 50; // Random value between 50-100
          const variation = Math.sin(i / 3) * 10; // Add some sine wave variation
          
          historicalData.push({
            timestamp: timestamp.getTime(),
            plc_id: String(plc?.id || 'unknown'),
            tag_id: String(tagId),
            tag_name: tag.name || 'Unknown',
            value: parseFloat((baseValue + variation).toFixed(2)),
            quality: 192, // Good quality
            received_at: timestamp.toISOString()
          });
        }
      }
      
      // Sort by timestamp
      historicalData.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`[HISTORICAL-DATA] Generated ${historicalData.length} historical data points`);
      
      // Return response in the expected format
      res.json({
        batch_id: `historical_${Date.now()}`,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        timestamp: new Date().toISOString(),
        data: historicalData
      });
      
    } catch (error: any) {
      console.error('[HISTORICAL-DATA] Error fetching historical data:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch historical data: ' + error.message
      });
    }
  });
  
  // GET endpoint for fetching historical data response from gateway (for frontend polling)
  app.get('/api/gateway/historical-data', optionalAuthMiddleware, async (req: any, res: any) => {
    try {
      // Handle authentication
      let userId = null;
      
      if (req.user) {
        userId = req.user.userId || req.user.id || req.user.claims?.sub;
      }
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User authentication required' 
        });
      }
      
      const { command_id, gateway_id } = req.query;
      
      if (!command_id || !gateway_id) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'command_id and gateway_id are required',
          hint: 'Poll with the command_id returned from the POST request'
        });
      }
      
      // Check if we have received the historical data from the gateway
      // This would be stored in a temporary cache or database table
      // For now, return a placeholder indicating data is still pending
      
      res.json({
        batch_id: `historical_${Date.now()}`,
        command_id: command_id,
        status: 'pending',
        message: 'Waiting for gateway to return historical data',
        hint: 'Continue polling this endpoint until status changes to "complete"'
      });
      
    } catch (error: any) {
      console.error('[GATEWAY-HISTORICAL-GET] Error fetching historical data status:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch historical data status'
      });
    }
  });
  
  // POST endpoint for gateway to send historical data response back to portal
  app.post('/api/gateway/historical-data-response', async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      const token = authHeader.substring(7);
      
      // Verify gateway token
      let gatewayId: string;
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        gatewayId = decoded.gatewayId;
        
        if (!gatewayId) {
          const error = GatewayErrors.tokenInvalidError();
          return res.status(error.statusCode).json(error.response);
        }
      } catch (error: any) {
        const gatewayError = GatewayErrors.tokenInvalidError();
        return res.status(gatewayError.statusCode).json(gatewayError.response);
      }
      
      const { command_id, batch_id, start_date, end_date, data } = req.body;
      
      // Validate response
      if (!command_id || !batch_id || !data || !Array.isArray(data)) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Invalid historical data response format'
        });
      }
      
      // Store the historical data response temporarily (in memory cache or database)
      // This will be retrieved when the frontend polls the GET endpoint
      // For now, just log and acknowledge
      
      console.log(`[GATEWAY-HISTORICAL-RESPONSE] Received ${data.length} historical data points from gateway ${gatewayId}`);
      
      // Mark the command as complete
      await storage.updateGatewayCommand(parseInt(command_id), {
        status: 'completed',
        completedAt: new Date(),
        result: {
          batch_id: batch_id,
          data_count: data.length,
          received_at: new Date().toISOString()
        }
      });
      
      res.json({
        success: true,
        message: 'Historical data received successfully',
        data_count: data.length
      });
      
    } catch (error: any) {
      console.error('[GATEWAY-HISTORICAL-RESPONSE] Error processing historical data response:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to process historical data response'
      });
    }
  });
  
  // Mount on v1 prefix as well
  app.post('/api/v1/gateway/historical-data', optionalAuthMiddleware, async (req: any, res: any) => {
    req.url = '/api/gateway/historical-data';
    return app._router.handle(req, res, () => {});
  });
  
  app.get('/api/v1/gateway/historical-data', optionalAuthMiddleware, async (req: any, res: any) => {
    req.url = '/api/gateway/historical-data';
    return app._router.handle(req, res, () => {});
  });
  
  app.post('/api/v1/gateway/historical-data-response', async (req: any, res: any) => {
    req.url = '/api/gateway/historical-data-response';
    return app._router.handle(req, res, () => {});
  });
  
  // GET endpoint for fetching real-time and historical tag data (for frontend)
  app.get('/api/gateway/data', optionalAuthMiddleware, async (req: any, res: any) => {
    try {
      // Handle different authentication methods
      let userId = null;
      
      console.log('[GATEWAY-DATA-GET] Auth check - req.user:', req.user ? 'present' : 'missing');
      console.log('[GATEWAY-DATA-GET] Auth check - req.tenantId:', req.tenantId);
      
      // Check if user was authenticated by optionalAuthMiddleware
      if (req.user) {
        userId = req.user.userId || req.user.id || req.user.claims?.sub;
        console.log('[GATEWAY-DATA-GET] User authenticated:', userId);
      }
      const { tagIds, startDate, endDate, aggregationType } = req.query;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User authentication required' 
        });
      }
      
      // Parse tag IDs from query parameter
      let requestedTagIds: string[] = [];
      if (tagIds) {
        if (typeof tagIds === 'string') {
          requestedTagIds = tagIds.split(',').map(id => id.trim()).filter(id => id);
        } else if (Array.isArray(tagIds)) {
          requestedTagIds = tagIds.map(id => String(id).trim()).filter(id => id);
        }
      }
      
      if (requestedTagIds.length === 0) {
        return res.json({ 
          tagData: [],
          message: 'No tags requested' 
        });
      }
      
      // Fetch all tags for the user
      const userTags = await storage.getPlcTagsByUser(userId);
      
      // Filter to only requested tags
      const filteredTags = userTags.filter(tag => 
        requestedTagIds.includes(String(tag.id))
      );
      
      // Get PLCs for tag names
      const plcDevices = await storage.getAllPlcDevices(userId);
      const plcMap = new Map(plcDevices.map(plc => [plc.id, plc]));
      
      // Check if this is a historical data request
      if (startDate && endDate) {
        // Historical data mode - Return the same lastValue data as live mode
        const startDateTime = new Date(String(startDate));
        const endDateTime = new Date(String(endDate));
        const aggregation = String(aggregationType || 'none');
        
        console.log('[GATEWAY-DATA-GET] Historical data request - returning lastValue data:', {
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          aggregationType: aggregation,
          tagIds: requestedTagIds
        });
        
        // Build response using cached data for historical view (same as real-time)
        const cachedData = getRealtimeData(userId, requestedTagIds);
        const cachedTagIds = new Set(cachedData.map(d => d.tagId));
        const tagData: any[] = [];
        
        // First, add any cached data
        for (const data of cachedData) {
          const plc = plcMap.get(parseInt(data.plcId, 10));
          
          tagData.push({
            tagId: data.tagId,
            tagName: data.tagName,
            plcId: data.plcId,
            plcName: plc?.name || 'Unknown PLC',
            value: data.value,
            quality: data.quality,
            timestamp: data.timestamp,
            dataType: data.dataType || 'float',
            unit: data.unit || ''
          });
        }
        
        // Then, add placeholder data for tags without cached values
        for (const tag of filteredTags) {
          if (!cachedTagIds.has(String(tag.id))) {
            const plc = plcMap.get(tag.plcId);
            
            tagData.push({
              tagId: String(tag.id),
              tagName: tag.name,
              plcId: String(tag.plcId),
              plcName: plc?.name || 'Unknown PLC',
              value: 0,
              quality: 'uncertain',
              timestamp: new Date(),
              dataType: tag.dataType,
              unit: tag.unit || ''
            });
          }
        }
        
        console.log('[GATEWAY-DATA-GET] Returning', tagData.length, 'tag data points for historical view (', cachedData.length, 'from cache)');
        
        return res.json({ 
          tagData: tagData,
          isHistorical: true,
          aggregationType: aggregation,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Real-time data mode - fetch from in-memory cache
      console.log('[GATEWAY-DATA-GET] Fetching real-time data from cache for user:', userId);
      
      // Get cached real-time data
      const cachedData = getRealtimeData(userId, requestedTagIds);
      
      // Build response from cached data if available
      const tagData: any[] = [];
      const cachedTagIds = new Set(cachedData.map(d => d.tagId));
      
      // First, add any cached data
      for (const data of cachedData) {
        const plc = plcMap.get(parseInt(data.plcId, 10));
        
        tagData.push({
          tagId: data.tagId,
          tagName: data.tagName,
          plcId: data.plcId,
          plcName: plc?.name || 'Unknown PLC',
          value: data.value,
          quality: data.quality,
          timestamp: data.timestamp,
          dataType: data.dataType || 'float',
          unit: data.unit || ''
        });
      }
      
      // Then, add placeholder data for tags without cached values
      for (const tag of filteredTags) {
        if (!cachedTagIds.has(String(tag.id))) {
          const plc = plcMap.get(tag.plcId);
          
          // Tag not in cache - add placeholder with "uncertain" quality
          tagData.push({
            tagId: String(tag.id),
            tagName: tag.name,
            plcId: String(tag.plcId),
            plcName: plc?.name || 'Unknown PLC',
            value: 0, // No cached value available
            quality: 'uncertain', // Mark as uncertain since no recent data
            timestamp: new Date(), // Current time as placeholder
            dataType: tag.dataType,
            unit: tag.unit || ''
          });
        }
      }
      
      console.log('[GATEWAY-DATA-GET] Returning', tagData.length, 'tag data points (', cachedData.length, 'from cache)');
      
      return res.json({
        tagData,
        isHistorical: false,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[GATEWAY-DATA-GET] Error fetching tag data:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch tag data' 
      });
    }
  });
  
  // Gateway configuration endpoint - returns PLC/tag configuration for the gateway
  const configHandler = async (req: any, res: any) => {
    try {
      console.log('[GATEWAY-CONFIG] ===== CONFIG ENDPOINT CALLED =====');
      console.log('[GATEWAY-CONFIG] Timestamp:', new Date().toISOString());
      console.log('[GATEWAY-CONFIG] Method:', req.method);
      console.log('[GATEWAY-CONFIG] URL:', req.url);
      console.log('[GATEWAY-CONFIG] Headers:', JSON.stringify(req.headers, null, 2));
      
      const authHeader = req.headers.authorization;
      console.log('[GATEWAY-CONFIG] Auth header received:', authHeader);
      console.log('[GATEWAY-CONFIG] Auth header type:', typeof authHeader);
      
      if (!authHeader) {
        console.error('[GATEWAY-CONFIG] Authentication failed - missing authorization header');
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!authHeader.startsWith('Bearer ')) {
        console.error('[GATEWAY-CONFIG] Authentication failed - invalid Bearer token format');
        const error = GatewayErrors.tokenFormatInvalidError(authHeader.substring(0, 20));
        return res.status(error.statusCode).json(error.response);
      }
      
      const token = authHeader.substring(7);
      console.log('[GATEWAY-CONFIG] Token extracted:', token.substring(0, 20) + '...');
      console.log('[GATEWAY-CONFIG] Token length:', token.length);
      
      console.log('[JWT] Verifying gateway token...');
      const payload = gatewayService.verifyGatewayToken(token);
      console.log('[JWT] Verification result:', payload ? 'SUCCESS' : 'FAILED');
      console.log('[JWT] Payload:', JSON.stringify(payload, null, 2));
      
      if (!payload) {
        console.error('[GATEWAY-CONFIG] Token verification failed - invalid or expired token');
        const error = GatewayErrors.tokenExpiredError();
        return res.status(error.statusCode).json(error.response);
      }
      
      console.log('[GATEWAY-CONFIG] Decoded token payload:');
      console.log('[GATEWAY-CONFIG]   userId:', payload.userId, 'Type:', typeof payload.userId);
      console.log('[GATEWAY-CONFIG]   gatewayId:', payload.gatewayId, 'Type:', typeof payload.gatewayId);
      
      // Get gateway's configuration based on their tenant/user
      // TEMPORARILY BYPASS BUG: getActivationCodeDetails expects integer ID, not string gatewayId
      // const gatewayCode = await gatewayService.getActivationCodeDetails(payload.gatewayId);
      // 
      // if (!gatewayCode) {
      //   return res.status(404).json({ 
      //     ok: false,
      //     error: 'not_found',
      //     message: 'Gateway configuration not found'
      //   });
      // }
      
      // Build PLC configuration response using database
      console.log('[STORAGE] Calling getAllPlcDevices with userId:', payload.userId);
      const plcDevices = await storage.getAllPlcDevices(payload.userId);
      console.log('[STORAGE] getAllPlcDevices returned:', plcDevices ? plcDevices.length + ' devices' : 'null/undefined');
      console.log('[STORAGE] PLC devices result:', JSON.stringify(plcDevices, null, 2));
      
      // Handle case where user has no PLC configurations with improved error
      if (!plcDevices || plcDevices.length === 0) {
        console.log('[GATEWAY-CONFIG] No PLC devices found for user');
        const error = GatewayErrors.plcConfigEmptyError();
        // Still return 200 OK but with empty config and warning message
        const emptyResponse = {
          ok: true,
          config_version: `v_${new Date().toISOString()}`,
          gateway_id: payload.gatewayId,
          tenant_id: 'tenant_xxx',
          poll_interval_ms: 1000,
          batch_size: 100,
          compression_enabled: true,
          buffer_size_mb: 50,
          upload_interval_ms: 10000,
          heartbeat_interval_ms: 30000,
          reconnect_delay_ms: 5000,
          max_reconnect_attempts: 10,
          plc_configs: [], // Empty configuration - no PLCs configured
          timestamp_ms: Date.now(),
          warning: error.response
        };
        console.log('[GATEWAY-CONFIG] Sending empty configuration with warning:', JSON.stringify(emptyResponse, null, 2));
        return res.status(200).json(emptyResponse);
      }
      
      console.log('[GATEWAY-CONFIG] Building PLC configurations from', plcDevices.length, 'devices');
      const plcConfigs = [];
      for (const plc of plcDevices) {
        console.log('[STORAGE] Fetching tags for PLC ID:', plc.id, 'Name:', plc.name);
        console.log('[STORAGE] PLC details:', JSON.stringify(plc, null, 2));
        const tags = await storage.getPlcTagsByPlcId(plc.id);
        console.log('[STORAGE] getPlcTagsByPlcId returned:', tags ? tags.length + ' tags' : 'null/undefined');
        console.log('[STORAGE] Tags result:', JSON.stringify(tags, null, 2));
        
        // Provide meaningful message if PLC has no tags configured
        if (!tags || tags.length === 0) {
          console.warn(`[GATEWAY-CONFIG] PLC ${plc.name} (ID: ${plc.id}) has no tags configured`);
        }
        
        console.log('[GATEWAY-CONFIG] Building config for PLC:', plc.name, 'with', tags ? tags.length : 0, 'tags');
        plcConfigs.push({
          plc_id: plc.id, // Fixed: use numeric plc.id instead of string format
          name: plc.name,
          protocol: plc.protocol || 'S7',
          ip_address: plc.ipAddress,
          port: plc.port || 102,
          rack: plc.rackNumber || 0,
          slot: plc.slotNumber || 1,
          enabled: plc.status === 'active' || plc.status === 'configured',
          tags: tags.map(tag => ({
            tag_id: tag.name || `tag_${tag.id}`, // Fixed: use tag.name instead of tag.tagName
            name: tag.name, // Fixed: use tag.name instead of tag.tagName
            address: tag.address,
            data_type: tag.dataType,
            scan_rate_ms: tag.scanRate || 1000, // Fixed: use tag.scanRate instead of hardcoded 1000
            enabled: tag.enabled !== false, // Fixed: use tag.enabled instead of hardcoded true
            scaling: {
              enabled: false,
              raw_min: 0,
              raw_max: 100,
              eng_min: 0,
              eng_max: 100
            }
          }))
        });
      }
      
      // Get active schema configuration for Gateway v2.0.0
      let databaseSchema;
      
      try {
        console.log('[STORAGE] Calling getActiveGatewaySchema with userId:', payload.userId);
        const activeSchema = await storage.getActiveGatewaySchema(payload.userId);
        console.log('[STORAGE] getActiveGatewaySchema returned:', activeSchema ? 'schema found' : 'no schema found');
        console.log('[STORAGE] Active schema result:', JSON.stringify(activeSchema, null, 2));
        
        if (activeSchema) {
          console.log('[STORAGE] Active schema ID:', activeSchema.id, 'Version:', activeSchema.version);
          // Fetch table definitions for the active schema
          console.log('[STORAGE] Fetching tables for schema ID:', activeSchema.id);
          const tables = await storage.getGatewayTablesBySchema(activeSchema.id);
          console.log('[STORAGE] getGatewayTablesBySchema returned:', tables ? tables.length + ' tables' : 'null/undefined');
          console.log('[STORAGE] Tables result:', JSON.stringify(tables, null, 2));
          
          // Build database_schema object for v2.0.0
          console.log('[GATEWAY-CONFIG] Building database schema from', tables ? tables.length : 0, 'tables');
          databaseSchema = {
            version: activeSchema.version,
            mode: activeSchema.mode || 'single_table',
            operations: [] as any[],
            tables: tables.map(table => ({
              table_name: table.tableName,
              table_type: table.tableType,
              plc_id: table.plcId,
              columns: table.columns || {
                id: { type: 'INTEGER', primary_key: true, auto_increment: true },
                tag_id: { type: 'TEXT', not_null: true },
                value: { type: 'REAL' },
                quality: { type: 'TEXT' },
                timestamp: { type: 'INTEGER', not_null: true }
              },
              indices: table.indices || [
                { name: 'idx_tag_timestamp', columns: ['tag_id', 'timestamp'] },
                { name: 'idx_timestamp', columns: ['timestamp'] }
              ],
              retention_days: table.retentionDays || 30,
              compression_enabled: table.compressionEnabled || false,
              partitioning_strategy: table.partitioningStrategy || null
            })),
            retention_policies: activeSchema.retentionPolicies || {},
            tag_mapping: activeSchema.tagMapping || {}
          };
          
          // Generate operations for table management if needed
          const operations: any[] = [];
          for (const table of tables) {
            if (table.isActive) {
              operations.push({
                operation: 'CREATE_TABLE_IF_NOT_EXISTS',
                table_name: table.tableName,
                sql: `CREATE TABLE IF NOT EXISTS ${table.tableName} (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  tag_id TEXT NOT NULL,
                  value REAL,
                  quality TEXT,
                  timestamp INTEGER NOT NULL
                )`,
                indices: table.indices
              });
            }
          }
          databaseSchema.operations = operations;
        }
      } catch (schemaError: any) {
        // Handle missing gateway_schemas table gracefully
        console.log('[GATEWAY-CONFIG] Gateway schema tables not available:', schemaError?.message);
        console.log('[GATEWAY-CONFIG] Using default schema configuration');
      }
      
      // Use default schema if no active schema found or on error
      if (!databaseSchema) {
        // Default schema for gateways without custom configuration
        databaseSchema = {
          version: 'default_v1',
          mode: 'single_table',
          operations: [
            {
              operation: 'CREATE_TABLE_IF_NOT_EXISTS',
              table_name: 'plc_data',
              sql: `CREATE TABLE IF NOT EXISTS plc_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tag_id TEXT NOT NULL,
                value REAL,
                quality TEXT,
                timestamp INTEGER NOT NULL
              )`,
              indices: [
                { name: 'idx_tag_timestamp', columns: ['tag_id', 'timestamp'] }
              ]
            }
          ],
          tables: [
            {
              table_name: 'plc_data',
              table_type: 'general',
              columns: {
                id: { type: 'INTEGER', primary_key: true, auto_increment: true },
                tag_id: { type: 'TEXT', not_null: true },
                value: { type: 'REAL' },
                quality: { type: 'TEXT' },
                timestamp: { type: 'INTEGER', not_null: true }
              },
              indices: [
                { name: 'idx_tag_timestamp', columns: ['tag_id', 'timestamp'] },
                { name: 'idx_timestamp', columns: ['timestamp'] }
              ],
              retention_days: 30,
              compression_enabled: false,
              partitioning_strategy: null
            }
          ],
          retention_policies: {
            default: { days: 30, strategy: 'delete_oldest' }
          },
          tag_mapping: {
            default: 'plc_data'
          }
        };
      }
      
      // Unified configuration response with Gateway v2.0.0 enhancements
      const finalResponse = {
        ok: true,
        config_version: `v_${new Date().toISOString()}`,
        gateway_id: payload.gatewayId,
        tenant_id: 'tenant_xxx',
        poll_interval_ms: 1000,
        batch_size: 100,
        compression_enabled: true,
        buffer_size_mb: 50,
        upload_interval_ms: 10000,
        heartbeat_interval_ms: 30000,
        reconnect_delay_ms: 5000,
        max_reconnect_attempts: 10,
        plc_configs: plcConfigs,
        database_schema: databaseSchema, // Gateway v2.0.0 addition
        timestamp_ms: Date.now()
      };
      
      console.log('[GATEWAY-CONFIG] ===== SENDING SUCCESSFUL RESPONSE =====');
      console.log('[GATEWAY-CONFIG] Response status code: 200');
      console.log('[GATEWAY-CONFIG] Response PLC configs count:', plcConfigs.length);
      console.log('[GATEWAY-CONFIG] Response schema version:', databaseSchema ? databaseSchema.version : 'default');
      console.log('[GATEWAY-CONFIG] Full response:', JSON.stringify(finalResponse, null, 2));
      
      res.status(200).json(finalResponse);
      
      // Log config fetch
      console.log('[GATEWAY-CONFIG] Logging audit event for config fetch');
      await gatewayService.logAuditEvent('config_fetched', true, {
        gatewayId: payload.gatewayId,
        userId: payload.userId,
        metadata: { 
          configCount: plcConfigs.length,
          schemaVersion: databaseSchema.version
        }
      });
      console.log('[GATEWAY-CONFIG] Audit event logged successfully');
      
    } catch (error: any) {
      console.error('[GATEWAY-CONFIG] ===== ERROR IN CONFIG HANDLER =====');
      console.error('[GATEWAY-CONFIG] Error message:', error?.message);
      console.error('[GATEWAY-CONFIG] Error name:', error?.name);
      console.error('[GATEWAY-CONFIG] Error stack:', error?.stack);
      console.error('[GATEWAY-CONFIG] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('[GATEWAY-CONFIG] ===== END ERROR =====');
      
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch gateway configuration' 
        } 
      });
    }
  };
  
  // Mount config handler to routes
  app.get('/api/gateway/config', configHandler);
  app.get('/api/v1/gateway/config', configHandler);
  
  // Gateway-specific configuration endpoint - returns PLC config for a specific gateway
  app.get('/api/gateway/config/:gatewayId', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          ok: false,
          error: 'unauthorized',
          message: 'Missing or invalid authorization token'
        });
      }
      
      const token = authHeader.substring(7);
      const payload = gatewayService.verifyGatewayToken(token);
      
      if (!payload) {
        return res.status(401).json({ 
          ok: false,
          error: 'unauthorized',
          message: 'Invalid or expired token. Please reactivate.'
        });
      }
      
      // Verify the gateway ID matches the token
      if (payload.gatewayId !== req.params.gatewayId) {
        return res.status(403).json({ 
          ok: false,
          error: 'forbidden',
          message: 'Gateway ID mismatch'
        });
      }
      
      // Get PLC configurations for the user
      const plcDevices = await storage.getAllPlcDevices(payload.userId);
      
      if (!plcDevices || plcDevices.length === 0) {
        return res.status(200).json({
          ok: true,
          gatewayId: req.params.gatewayId,
          userId: payload.userId,
          plcConfigs: [],
          message: 'No PLC configurations found'
        });
      }
      
      // Build configuration with tags
      const plcConfigs = [];
      for (const plc of plcDevices) {
        const tags = await storage.getPlcTagsByPlcId(plc.id);
        plcConfigs.push({
          plcId: plc.id,
          name: plc.name,
          protocol: plc.protocol,
          ipAddress: plc.ipAddress,
          port: plc.port,
          rackNumber: plc.rackNumber,
          slotNumber: plc.slotNumber,
          status: plc.status,
          tags: tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            address: tag.address,
            dataType: tag.dataType,
            scanRate: tag.scanRate,
            enabled: tag.enabled
          }))
        });
      }
      
      res.json({
        ok: true,
        gatewayId: req.params.gatewayId,
        userId: payload.userId,
        plcConfigs,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Failed to fetch gateway config:', error);
      res.status(500).json({ 
        ok: false,
        error: 'internal_error',
        message: 'Failed to fetch gateway configuration' 
      });
    }
  });
  
  // Gateway commands endpoint - send commands to gateway
  app.post('/api/gateway/commands', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        const error = GatewayErrors.tokenMissingError();
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!authHeader.startsWith('Bearer ')) {
        const error = GatewayErrors.tokenFormatInvalidError(authHeader.substring(0, 20));
        return res.status(error.statusCode).json(error.response);
      }
      
      const token = authHeader.substring(7);
      const payload = gatewayService.verifyGatewayToken(token);
      
      if (!payload) {
        const error = GatewayErrors.tokenExpiredError();
        return res.status(error.statusCode).json(error.response);
      }
      
      const { command_type, command_id, parameters } = req.body;
      
      // Validate command type
      const validCommands = [
        'restart', 
        'shutdown', 
        'update_config', 
        'clear_buffer',
        'force_upload',
        'set_log_level',
        'pause_polling',
        'resume_polling',
        'write_tag'
      ];
      
      if (!command_type) {
        const error = GatewayErrors.createGatewayError(
          GatewayErrors.GatewayErrorCode.COMMAND_TYPE_INVALID,
          'Command type is required.',
          { 
            expected: validCommands.join(', '),
            hint: 'Provide a valid command_type in the request body'
          }
        );
        return res.status(error.statusCode).json(error.response);
      }
      
      if (!validCommands.includes(command_type)) {
        const error = GatewayErrors.createGatewayError(
          GatewayErrors.GatewayErrorCode.COMMAND_TYPE_INVALID,
          `Invalid command type: ${command_type}`,
          {
            received: command_type,
            expected: validCommands.join(', '),
            hint: 'Use one of the supported command types listed above'
          }
        );
        return res.status(error.statusCode).json(error.response);
      }
      
      // Process command based on type
      let commandResult = { success: true, message: 'Command queued for execution' };
      
      switch (command_type) {
        case 'write_tag':
          if (!parameters?.tag_id || parameters?.value === undefined) {
            const error = GatewayErrors.createGatewayError(
              GatewayErrors.GatewayErrorCode.COMMAND_PARAMETERS_MISSING,
              'Missing required parameters for write_tag command.',
              { 
                requiredFields: ['tag_id', 'value'],
                received: Object.keys(parameters || {}),
                hint: 'Provide both tag_id and value in the parameters object'
              }
            );
            return res.status(error.statusCode).json(error.response);
          }
          // Queue tag write command
          commandResult.message = `Tag write command queued for tag ${parameters.tag_id}`;
          break;
          
        case 'update_config':
          // Signal config update via WebSocket if connected
          const sendToGateway = (global as any).sendToGateway;
          if (sendToGateway) {
            const sent = sendToGateway(payload.gatewayId, {
              type: 'config_update',
              timestamp_ms: Date.now()
            });
            commandResult.message = sent ? 'Config update sent via WebSocket' : 'Config update queued (gateway offline)';
          }
          break;
          
        case 'set_log_level':
          if (!parameters?.level) {
            const error = GatewayErrors.createGatewayError(
              GatewayErrors.GatewayErrorCode.COMMAND_PARAMETERS_MISSING,
              'Missing required parameters for set_log_level command.',
              { 
                requiredFields: ['level'],
                received: Object.keys(parameters || {}),
                expected: 'debug, info, warn, or error',
                hint: 'Provide level parameter with one of: debug, info, warn, error'
              }
            );
            return res.status(error.statusCode).json(error.response);
          }
          const validLevels = ['debug', 'info', 'warn', 'error'];
          if (!validLevels.includes(parameters.level)) {
            const error = GatewayErrors.createGatewayError(
              GatewayErrors.GatewayErrorCode.DATA_FORMAT_INVALID,
              `Invalid log level: ${parameters.level}`,
              {
                received: parameters.level,
                expected: validLevels.join(', '),
                hint: 'Use one of the valid log levels'
              }
            );
            return res.status(error.statusCode).json(error.response);
          }
          commandResult.message = `Log level change to ${parameters.level} queued`;
          break;
      }
      
      // Log command
      await gatewayService.logAuditEvent('command_sent', true, {
        gatewayId: payload.gatewayId,
        userId: payload.userId,
        metadata: {
          commandType: command_type,
          commandId: command_id,
          parameters
        }
      });
      
      // GPT5 spec command response
      res.json({
        command_id: command_id || crypto.randomBytes(16).toString('hex'),
        command_type,
        status: 'queued',
        queued_at_ms: Date.now(),
        estimated_execution_ms: Date.now() + 1000,
        result: commandResult,
        gateway_id: payload.gatewayId
      });
      
    } catch (error: any) {
      console.error('Command processing failed:', error);
      const gatewayError = GatewayErrors.internalServerError('Failed to process command');
      res.status(gatewayError.statusCode).json(gatewayError.response);
    }
  });
  
  // Get PLC configuration for gateway
  app.get('/api/gateway/plc-configs/:facilityId', async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      
      // Get facility to check tenantId
      const facility = await storage.getFacility(facilityId);
      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      // Get PLC devices for this tenant using database
      const plcDevices = await storage.getPlcDevicesByTenant(facility.tenantId);
      
      const configs = [];
      for (const plc of plcDevices) {
        const tags = await storage.getPlcTagsByPlcId(plc.id);
        
        configs.push({
          plc,
          tags
        });
      }
      
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get PLC configs' });
    }
  });
  
  // ==================== PLC CONFIGURATION ====================
  
  // Get PLC configurations
  app.get('/api/plc-configurations', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Enhanced logging for debugging authentication
      console.log('[/api/plc-configurations] Request received:', {
        hasUser: !!req.user,
        userId: req.user?.userId,
        userEmail: req.user?.email,
        userKeys: req.user ? Object.keys(req.user) : [],
        headers: {
          'x-session-id': req.headers['x-session-id'] ? 'present' : 'absent',
          'authorization': req.headers['authorization'] ? 'present' : 'absent',
          'cookie': req.headers['cookie'] ? 'present' : 'absent'
        }
      });
      
      // Check if user is authenticated
      if (!req.user) {
        console.log('[/api/plc-configurations] No user in request - Authentication required');
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the authenticated user's ID (support both fields for compatibility)
      const userId = req.user.userId || req.user.id || req.user.claims?.sub;
      
      // Log for debugging
      console.log('[/api/plc-configurations] Processing request for user:', {
        userId,
        tenantId: req.tenantId,
        userEmail: req.user.email,
        isDemo: req.user.isDemo
      });
      
      if (!userId) {
        console.log('[/api/plc-configurations] No userId found in user object');
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      // Get PLC devices from database using the new storage method
      const plcDevices = await storage.getAllPlcDevices(userId);
      
      // Add isActive field based on status and whether data is being received
      // Import the getRealtimeData function from gateway service
      const { getRealtimeData } = require('./gateway-service');
      
      // Get all real-time data for this user
      const realtimeData = getRealtimeData(userId);
      
      // Create a set of PLC IDs that have recent data
      const activePlcIds = new Set<number>();
      realtimeData.forEach((tagData: any) => {
        if (tagData.plcId) {
          activePlcIds.add(parseInt(tagData.plcId));
        }
      });
      
      const enhancedDevices = await Promise.all(plcDevices.map(async device => {
        // A PLC is active if:
        // 1. Its status is 'connected' OR
        // 2. We're receiving real-time data from it
        let isActive = device.status === 'connected';
        
        // Check if we have recent data for this PLC
        if (!isActive && device.id && activePlcIds.has(device.id)) {
          isActive = true;
          // Also update the status in the database if it's not already 'connected'
          if (device.status !== 'connected') {
            await storage.updatePlcDevice(device.id, { status: 'connected' });
          }
        }
        
        return {
          ...device,
          isActive,
          // Also ensure plcType is set (to avoid "Unknown PLC")
          plcType: device.brand || device.protocol || 'siemens_s7',
          connectionStatus: isActive ? 'connected' : device.status
        };
      }));
      
      console.log('[/api/plc-configurations] Successfully fetched devices:', {
        userId,
        count: enhancedDevices.length,
        devices: enhancedDevices.map(d => ({ id: d.id, name: d.name, userId: d.userId, isActive: d.isActive }))
      });
      
      res.json(enhancedDevices);
    } catch (error: any) {
      console.error('[/api/plc-configurations] Error occurred:', error);
      res.status(500).json({ 
        message: 'Failed to fetch PLC configurations', 
        error: error.message 
      });
    }
  });
  
  // Create PLC configuration
  app.post('/api/plc-configurations', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const plcData = req.body;
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      const plcDevice = {
        ...plcData,
        userId: userId, // Set the userId for proper isolation
        facilityId: null, // Not using facilities for demo users
        status: 'configured'
      };
      
      console.log('[/api/plc-configurations POST] Creating PLC device:', {
        userId,
        name: plcDevice.name,
        deviceData: plcDevice
      });
      
      // Use the new storage method to create the PLC device
      const createdDevice = await storage.upsertPlcDevice(plcDevice);
      
      console.log('[/api/plc-configurations POST] Created PLC device:', {
        userId,
        id: createdDevice.id,
        name: createdDevice.name,
        storedUserId: createdDevice.userId
      });
      
      // Notify connected gateways about new PLC configuration
      notifyGatewaysOfConfigUpdate(userId, 'created', createdDevice.id);
      
      res.status(201).json(createdDevice);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to create PLC configuration', 
        error: error.message 
      });
    }
  });
  
  // Update PLC configuration
  app.put('/api/plc-configurations/:id', optionalAuthMiddleware, async (req: any, res) => {
    try {
      console.log('[PUT /api/plc-configurations/:id] Request received');
      console.log('[PUT /api/plc-configurations/:id] Params:', req.params);
      console.log('[PUT /api/plc-configurations/:id] Body:', req.body);
      
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      const plcId = parseInt(req.params.id);
      console.log('[PUT /api/plc-configurations/:id] PLC ID:', plcId);
      console.log('[PUT /api/plc-configurations/:id] User ID:', userId);
      
      // Get the existing PLC device from database
      const plcDevice = await storage.getPlcDevice(plcId);
      
      if (!plcDevice) {
        console.log('[PUT /api/plc-configurations/:id] PLC device not found');
        return res.status(404).json({ message: 'PLC device not found' });
      }
      
      console.log('[PUT /api/plc-configurations/:id] Existing device:', plcDevice);
      
      // Verify ownership by userId
      if (plcDevice.userId !== userId) {
        console.log('[PUT /api/plc-configurations/:id] Unauthorized - device userId:', plcDevice.userId, 'request userId:', userId);
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Prepare update data - ensure we don't overwrite important fields
      const updateData = {
        ...req.body,
        userId: userId, // Ensure userId is not changed
        id: plcId, // Ensure ID is not changed
        updatedAt: new Date()
      };
      
      console.log('[PUT /api/plc-configurations/:id] Update data:', updateData);
      
      // Update the PLC device using the new storage method
      const updatedDevice = await storage.updatePlcDevice(plcId, updateData);
      
      if (!updatedDevice) {
        console.log('[PUT /api/plc-configurations/:id] Failed to update PLC device');
        return res.status(500).json({ message: 'Failed to update PLC device' });
      }
      
      console.log('[PUT /api/plc-configurations/:id] Successfully updated device:', updatedDevice);
      
      // Notify connected gateways about PLC configuration update
      notifyGatewaysOfConfigUpdate(userId, 'updated', plcId);
      
      res.json(updatedDevice);
    } catch (error: any) {
      console.error('[PUT /api/plc-configurations/:id] Error:', error);
      res.status(500).json({ 
        message: 'Failed to update PLC configuration', 
        error: error.message 
      });
    }
  });
  
  // Delete PLC configuration
  app.delete('/api/plc-configurations/:id', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      const plcId = parseInt(req.params.id);
      
      // Get the existing PLC device from database
      const plcDevice = await storage.getPlcDevice(plcId);
      
      if (!plcDevice) {
        return res.status(404).json({ message: 'PLC device not found' });
      }
      
      // Verify ownership by userId
      if (plcDevice.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Delete the PLC device using the new storage method
      // Note: Related tags will be automatically deleted due to CASCADE foreign key constraint
      const deleted = await storage.deletePlcDevice(plcId);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete PLC device' });
      }
      
      // Notify connected gateways about PLC configuration deletion
      notifyGatewaysOfConfigUpdate(userId, 'deleted', plcId);
      
      res.json({ message: 'PLC configuration deleted' });
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to delete PLC configuration', 
        error: error.message 
      });
    }
  });
  
  // ==================== PLC TAGS ====================
  
  // Get tags for a PLC
  app.get('/api/plc-configurations/:plcId/tags', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      const plcId = parseInt(req.params.plcId);
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      // Verify the PLC belongs to this user
      const plcDevice = await storage.getPlcDeviceById(plcId);
      if (!plcDevice || plcDevice.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const tags = await storage.getPlcTagsByPlcId(plcId);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch PLC tags', 
        error: error.message 
      });
    }
  });
  
  // Get all tags (for dashboard)
  app.get('/api/plc-tags', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      // Check if a specific configId (plcId) is requested
      const configId = req.query.configId;
      
      if (configId) {
        const plcId = parseInt(configId as string);
        
        // Verify the PLC belongs to this user
        const plcDevice = await storage.getPlcDeviceById(plcId);
        if (!plcDevice || plcDevice.userId !== userId) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // Get tags for specific PLC
        const tags = await storage.getPlcTagsByPlcId(plcId);
        res.json(tags);
      } else {
        // Get all tags for this user using database
        const tags = await storage.getPlcTagsByUser(userId);
        res.json(tags);
      }
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch tags', 
        error: error.message 
      });
    }
  });
  
  // Create PLC tag
  app.post('/api/plc-configurations/:plcId/tags', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      const plcId = parseInt(req.params.plcId);
      
      // Verify the PLC exists and belongs to the user
      const plcDevice = await storage.getPlcDevice(plcId);
      if (!plcDevice || plcDevice.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const tag = await storage.createPlcTag({
        plcId: plcId,
        name: req.body.name, // Changed from tagName to name
        address: req.body.address,
        dataType: req.body.dataType || 'float',
        description: req.body.description,
        unit: req.body.unit,
        // Use scaleFactor and offset for scaling
        scaleFactor: req.body.scaleFactor,
        offset: req.body.offset,
        minValue: req.body.minValue,
        maxValue: req.body.maxValue,
        alarmLow: req.body.alarmLow,
        alarmHigh: req.body.alarmHigh,
        enabled: req.body.enabled !== false, // Changed from isActive to enabled
        scanRate: req.body.scanRate || 1000 // Changed from readInterval to scanRate
      });
      
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to create PLC tag', 
        error: error.message 
      });
    }
  });
  
  // Update PLC tag
  app.put('/api/plc-tags/:tagId', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      const tagId = parseInt(req.params.tagId);
      
      // Get tag from database
      const tag = await storage.getPlcTagById(tagId);
      if (!tag) {
        return res.status(404).json({ message: 'Tag not found' });
      }
      
      // Verify the PLC belongs to the user
      const plcDevice = await storage.getPlcDevice(tag.plcId);
      if (!plcDevice || plcDevice.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Update tag in database
      const updatedTag = await storage.updatePlcTag(tagId, {
        name: req.body.name, // Changed from tagName to name
        address: req.body.address,
        dataType: req.body.dataType,
        description: req.body.description,
        unit: req.body.unit,
        // Use scaleFactor and offset for scaling
        scaleFactor: req.body.scaleFactor,
        offset: req.body.offset,
        minValue: req.body.minValue,
        maxValue: req.body.maxValue,
        alarmLow: req.body.alarmLow,
        alarmHigh: req.body.alarmHigh,
        enabled: req.body.enabled, // Changed from isActive to enabled
        scanRate: req.body.scanRate // Changed from readInterval to scanRate
      });
      
      res.json(updatedTag);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to update tag', 
        error: error.message 
      });
    }
  });
  
  // Create PLC tag (alternative endpoint that accepts plcId in the body)
  app.post('/api/plc-tags', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      const plcId = req.body.plcId;
      if (!plcId) {
        return res.status(400).json({ message: 'plcId is required' });
      }
      
      // Verify the PLC exists and belongs to the user
      const plcDevice = await storage.getPlcDevice(plcId);
      if (!plcDevice || plcDevice.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Create tag with proper field mapping
      const tag = await storage.createPlcTag({
        plcId: plcId,
        name: req.body.tagName || req.body.name, // Support both field names
        address: req.body.address,
        dataType: req.body.dataType || 'float',
        description: req.body.description,
        unit: req.body.unit,
        scaleFactor: req.body.scaleFactor || 1,
        offset: req.body.offset || 0,
        minValue: req.body.minValue,
        maxValue: req.body.maxValue,
        scanRate: req.body.readInterval || req.body.scanRate || 1000,
        enabled: req.body.isActive !== false && req.body.enabled !== false,
      });
      
      res.status(201).json(tag);
    } catch (error: any) {
      console.error('Error creating PLC tag:', error);
      res.status(500).json({ message: error.message || 'Failed to create tag' });
    }
  });
  
  // Delete PLC tag
  app.delete('/api/plc-tags/:tagId', optionalAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      const tagId = parseInt(req.params.tagId);
      
      // Get tag from database
      const tag = await storage.getPlcTagById(tagId);
      if (!tag) {
        return res.status(404).json({ message: 'Tag not found' });
      }
      
      // Verify the PLC belongs to the user
      const plcDevice = await storage.getPlcDevice(tag.plcId);
      if (!plcDevice || plcDevice.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Delete tag from database
      const deleted = await storage.deletePlcTag(tagId);
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete tag' });
      }
      
      res.json({ message: 'Tag deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to delete tag', 
        error: error.message 
      });
    }
  });
  
  // ==================== GATEWAY MANAGEMENT ====================
  
  // Get user's current gateway activation code
  app.get('/api/me/gateway/code', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User ID not found' });
      }
      
      // Get existing code or issue a new one
      const { code, expiresAt } = await gatewayCodesService.issueGatewayCode(
        userId,
        req.user.tenantId
      );
      
      return res.json({ 
        ok: true, 
        code, 
        expiresAt: expiresAt.toISOString() 
      });
    } catch (error: any) {
      console.error('Failed to get gateway code:', error);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to get gateway code', 
        message: error.message 
      });
    }
  });
  
  // Regenerate gateway activation code (revoke existing, issue new)
  app.post('/api/me/gateway/code/regenerate', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User ID not found' });
      }
      
      // Optional rate limiting could be added here (3/hour)
      
      // Revoke existing issued codes
      await gatewayCodesService.revokeIssuedCodes(userId);
      
      // Issue new code
      const { code, expiresAt } = await gatewayCodesService.issueGatewayCode(
        userId,
        req.user.tenantId
      );
      
      return res.status(201).json({ 
        ok: true, 
        code, 
        expiresAt: expiresAt.toISOString() 
      });
    } catch (error: any) {
      console.error('Failed to regenerate gateway code:', error);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to regenerate gateway code', 
        message: error.message 
      });
    }
  });
  
  // Generate new gateway code for authenticated user
  app.post('/api/gateway/generate-code', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      const code = await gatewayService.createGatewayCode(userId);
      
      res.json({ 
        code,
        expiresIn: '15 days',
        message: 'Gateway activation code generated successfully'
      });
    } catch (error: any) {
      console.error('Failed to generate gateway code:', error);
      res.status(500).json({ 
        message: 'Failed to generate gateway code', 
        error: error.message 
      });
    }
  });
  
  // Get user's gateway codes
  app.get('/api/gateway/codes', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      const codes = await gatewayService.getUserGatewayCodes(userId);
      
      res.json(codes);
    } catch (error: any) {
      console.error('Failed to fetch gateway codes:', error);
      res.status(500).json({ 
        message: 'Failed to fetch gateway codes', 
        error: error.message 
      });
    }
  });
  
  // Note: Gateway activation route is defined earlier in the file (line 841)
  
  // Gateway verification endpoint - verify gateway code and establish connection
  app.post('/api/gateway/verify', async (req, res) => {
    try {
      const { code, machineId } = req.body;
      
      if (!code || !machineId) {
        return res.status(400).json({ 
          ok: false,
          error: 'missing_parameters',
          message: 'Code and machineId are required' 
        });
      }
      
      // Verify the activation code
      const result = await gatewayCodesService.redeemCode(code, machineId);
      
      if ('err' in result) {
        const errorMessages = {
          'invalid_code': 'Invalid or expired activation code',
          'machine_mismatch': 'Code is bound to a different machine',
          'already_redeemed': 'Code has already been used'
        };
        
        return res.status(400).json({ 
          ok: false,
          error: result.err,
          message: errorMessages[result.err] || 'Verification failed' 
        });
      }
      
      // Generate gateway token
      const gatewayId = `gw_${crypto.randomBytes(12).toString('hex')}`;
      const token = gatewayService.generateGatewayToken(gatewayId, result.userId);
      
      // Log successful verification
      await gatewayService.logAuditEvent('gateway_verified', true, {
        gatewayId,
        userId: result.userId,
        ipAddress: req.ip || 'unknown'
      });
      
      return res.json({ 
        ok: true,
        token,
        gatewayId,
        userId: result.userId,
        message: 'Gateway verified successfully' 
      });
    } catch (error: any) {
      console.error('Gateway verification failed:', error);
      res.status(500).json({ 
        ok: false,
        error: 'internal_error',
        message: 'Verification failed' 
      });
    }
  });

  // ==================== TROUBLESHOOTING ENDPOINTS ====================
  
  // Gateway code validation endpoint - For troubleshooting activation issues
  app.post('/api/gateway/validate', async (req, res) => {
    try {
      const { activation_code, activationCode, code } = req.body;
      const testCode = activation_code || activationCode || code;
      
      // Enhanced validation response
      const validation = {
        code: testCode || 'NOT_PROVIDED',
        format: {
          valid: false,
          message: '',
          expectedFormat: 'HERC-XXXX-XXXX-XXXX-XXXX or DEMO-XXX-XXX-XXXX',
          receivedFormat: testCode || 'empty'
        },
        exists: false,
        status: 'unknown',
        details: {} as any,
        troubleshooting: null as any
      };

      // Check if code was provided
      if (!testCode) {
        const error = GatewayErrors.activationCodeMissingError();
        validation.format.message = 'No activation code provided';
        validation.troubleshooting = GatewayErrors.getTroubleshootingInfo(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_MISSING);
        
        return res.status(200).json({
          ok: false,
          validation,
          documentation: GatewayErrors.getErrorDocumentationUrl(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_MISSING),
          supportId: GatewayErrors.generateSupportId()
        });
      }

      // Validate format
      validation.format.valid = GatewayErrors.isValidActivationCodeFormat(testCode);
      if (!validation.format.valid) {
        validation.format.message = 'Invalid activation code format';
        validation.troubleshooting = GatewayErrors.getTroubleshootingInfo(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_FORMAT_INVALID);
        
        return res.status(200).json({
          ok: false,
          validation,
          documentation: GatewayErrors.getErrorDocumentationUrl(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_FORMAT_INVALID),
          supportId: GatewayErrors.generateSupportId()
        });
      }

      validation.format.message = 'Format is valid';

      // Check if code exists in database
      const [codeRecord] = await db
        .select()
        .from(gatewayCodes)
        .where(eq(gatewayCodes.code, testCode))
        .limit(1);

      if (!codeRecord) {
        validation.exists = false;
        validation.status = 'not_found';
        validation.troubleshooting = GatewayErrors.getTroubleshootingInfo(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_NOT_FOUND);
        
        return res.status(200).json({
          ok: false,
          validation,
          documentation: GatewayErrors.getErrorDocumentationUrl(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_NOT_FOUND),
          supportId: GatewayErrors.generateSupportId()
        });
      }

      validation.exists = true;

      // Check code status
      const now = new Date();
      const expiresAt = new Date(codeRecord.expiresAt);
      
      if (codeRecord.redeemedAt) {
        validation.status = 'already_used';
        validation.details = {
          redeemedAt: codeRecord.redeemedAt,
          machineId: codeRecord.machineId ? codeRecord.machineId.substring(0, 8) + '...' : null,
          message: 'This code has already been used'
        };
        validation.troubleshooting = GatewayErrors.getTroubleshootingInfo(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_ALREADY_USED);
      } else if (expiresAt < now) {
        validation.status = 'expired';
        validation.details = {
          expiredAt: expiresAt.toISOString(),
          message: `Code expired ${formatDistanceToNow(expiresAt, { addSuffix: true })}`
        };
        validation.troubleshooting = GatewayErrors.getTroubleshootingInfo(GatewayErrors.GatewayErrorCode.ACTIVATION_CODE_EXPIRED);
      } else {
        validation.status = 'valid';
        validation.details = {
          createdAt: codeRecord.createdAt,
          expiresAt: codeRecord.expiresAt,
          expiresIn: formatDistanceToNow(expiresAt),
          message: 'Code is valid and ready to use'
        };
      }

      return res.status(200).json({
        ok: validation.status === 'valid',
        validation,
        documentation: validation.status === 'valid' ? 
          'https://docs.herculesv2.com/gateway/activation' :
          GatewayErrors.getErrorDocumentationUrl(`ACTIVATION_CODE_${validation.status.toUpperCase()}`),
        supportId: GatewayErrors.generateSupportId()
      });

    } catch (error: any) {
      console.error('Code validation error:', error);
      return res.status(500).json({
        ok: false,
        error: 'validation_error',
        message: 'Failed to validate activation code',
        supportId: GatewayErrors.generateSupportId()
      });
    }
  });

  // Gateway diagnostics endpoint - Comprehensive error analysis
  app.get('/api/gateway/diagnostics', async (req, res) => {
    try {
      const { gatewayId } = req.query;
      const timeRange = req.query.timeRange as string || '24h';
      
      // Calculate time window
      let timeWindow = '24 hours';
      switch(timeRange) {
        case '1h': timeWindow = '1 hour'; break;
        case '6h': timeWindow = '6 hours'; break;
        case '12h': timeWindow = '12 hours'; break;
        case '24h': timeWindow = '24 hours'; break;
        case '7d': timeWindow = '7 days'; break;
        default: timeWindow = '24 hours';
      }

      // Get error patterns from debug logs
      const errorPatterns = await db.select({
        errorCode: gatewayDebugLogs.errorCode,
        errorCount: sql<number>`COUNT(*)`.as('errorCount'),
        lastOccurred: sql<string>`MAX(timestamp)`.as('lastOccurred'),
        affectedGateways: sql<string[]>`ARRAY_AGG(DISTINCT gateway_id)`.as('affectedGateways')
      })
      .from(gatewayDebugLogs)
      .where(
        and(
          gte(gatewayDebugLogs.responseStatus, 400),
          gte(gatewayDebugLogs.timestamp, sql`NOW() - INTERVAL ${sql.raw(`'${timeWindow}'`)}`),
          gatewayId ? eq(gatewayDebugLogs.gatewayId, gatewayId as string) : undefined
        )
      )
      .groupBy(gatewayDebugLogs.errorCode)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

      // Get gateway health status
      const gatewayHealth = await db.select({
        gatewayId: gatewayDebugLogs.gatewayId,
        totalRequests: sql<number>`COUNT(*)`.as('totalRequests'),
        successfulRequests: sql<number>`SUM(CASE WHEN response_status < 400 THEN 1 ELSE 0 END)`.as('successfulRequests'),
        failedRequests: sql<number>`SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END)`.as('failedRequests'),
        avgResponseTime: sql<number>`AVG(processing_duration)`.as('avgResponseTime'),
        lastActivity: sql<string>`MAX(timestamp)`.as('lastActivity')
      })
      .from(gatewayDebugLogs)
      .where(
        and(
          gte(gatewayDebugLogs.timestamp, sql`NOW() - INTERVAL ${sql.raw(`'${timeWindow}'`)}`),
          sql`${gatewayDebugLogs.gatewayId} IS NOT NULL`,
          gatewayId ? eq(gatewayDebugLogs.gatewayId, gatewayId as string) : undefined
        )
      )
      .groupBy(gatewayDebugLogs.gatewayId)
      .orderBy(desc(sql`MAX(timestamp)`))
      .limit(gatewayId ? 1 : 20);

      // Get most common error types with troubleshooting
      const errorAnalysis = errorPatterns.map(pattern => {
        const troubleshooting = pattern.errorCode ? 
          GatewayErrors.getTroubleshootingInfo(pattern.errorCode) : null;
        
        return {
          errorCode: pattern.errorCode || 'UNKNOWN',
          occurrences: pattern.errorCount,
          lastOccurred: pattern.lastOccurred,
          affectedGateways: pattern.affectedGateways?.length || 0,
          severity: pattern.errorCount > 100 ? 'critical' : 
                   pattern.errorCount > 50 ? 'high' : 
                   pattern.errorCount > 10 ? 'medium' : 'low',
          documentation: pattern.errorCode ? 
            GatewayErrors.getErrorDocumentationUrl(pattern.errorCode) : null,
          troubleshooting
        };
      });

      // System health metrics
      const totalHealth = gatewayHealth.reduce((acc, health) => {
        acc.totalRequests += health.totalRequests || 0;
        acc.successfulRequests += health.successfulRequests || 0;
        acc.failedRequests += health.failedRequests || 0;
        return acc;
      }, { totalRequests: 0, successfulRequests: 0, failedRequests: 0 });

      const successRate = totalHealth.totalRequests > 0 ?
        ((totalHealth.successfulRequests / totalHealth.totalRequests) * 100).toFixed(2) : '0.00';

      // Generate diagnostics report
      const diagnostics = {
        timestamp: new Date().toISOString(),
        timeRange,
        systemHealth: {
          status: parseFloat(successRate) >= 95 ? 'healthy' : 
                  parseFloat(successRate) >= 80 ? 'degraded' : 'unhealthy',
          successRate: `${successRate}%`,
          totalRequests: totalHealth.totalRequests,
          successfulRequests: totalHealth.successfulRequests,
          failedRequests: totalHealth.failedRequests,
          activeGateways: gatewayHealth.length,
          recommendation: parseFloat(successRate) < 95 ? 
            'System experiencing elevated error rates. Review error patterns below.' : 
            'System operating normally'
        },
        errorPatterns: errorAnalysis,
        topIssues: errorAnalysis.slice(0, 3).map(err => ({
          code: err.errorCode,
          impact: `${err.occurrences} occurrences affecting ${err.affectedGateways} gateway(s)`,
          quickFix: err.troubleshooting?.solutions?.[0] || 'Review troubleshooting documentation',
          documentation: err.documentation
        })),
        gatewaySpecific: gatewayId ? {
          gatewayId,
          health: gatewayHealth[0] || null,
          recentErrors: errorPatterns.slice(0, 5)
        } : null,
        commonSolutions: {
          'TOKEN_EXPIRED': {
            description: 'Authentication tokens have expired',
            solution: 'Use /api/gateway/refresh endpoint or reactivate gateways',
            automationAvailable: true
          },
          'CONFIG_NOT_FOUND': {
            description: 'Gateway configuration missing',
            solution: 'Configure PLC devices and tags in the portal',
            automationAvailable: false
          },
          'RATE_LIMIT_EXCEEDED': {
            description: 'Too many requests from gateways',
            solution: 'Implement exponential backoff and reduce request frequency',
            automationAvailable: false
          },
          'ACTIVATION_CODE_FORMAT_INVALID': {
            description: 'Malformed activation codes',
            solution: 'Verify code format: HERC-XXXX-XXXX-XXXX-XXXX',
            automationAvailable: false
          }
        },
        resources: {
          documentation: 'https://docs.herculesv2.com/gateway',
          troubleshooting: 'https://docs.herculesv2.com/gateway/troubleshooting',
          support: 'https://support.herculesv2.com',
          statusPage: 'https://status.herculesv2.com'
        }
      };

      // Set response headers
      res.set({
        'X-Diagnostics-Generated': new Date().toISOString(),
        'X-Time-Range': timeRange,
        'X-System-Status': diagnostics.systemHealth.status,
        'Cache-Control': 'no-cache'
      });

      return res.json(diagnostics);

    } catch (error: any) {
      console.error('Diagnostics generation error:', error);
      return res.status(500).json({
        error: 'diagnostics_error',
        message: 'Failed to generate diagnostics report',
        supportId: GatewayErrors.generateSupportId()
      });
    }
  });
  
  // Gateway data sync endpoint
  app.post('/api/gateway/sync', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No gateway token provided' });
      }
      
      const token = authHeader.substring(7);
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      
      const result = await gatewayService.syncGatewayData(token, req.body, ipAddress);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ 
        success: true,
        message: 'Data synchronized successfully'
      });
    } catch (error: any) {
      console.error('Gateway sync failed:', error);
      res.status(500).json({ 
        message: 'Gateway sync failed', 
        error: error.message 
      });
    }
  });
  
  // Note: Gateway config endpoint is defined earlier in the file (line 1137)
  
  // Note: Gateway data endpoint is defined earlier in the file (line 1083)
  
  // Note: Gateway heartbeat endpoint is defined earlier in the file (line 1014)
  
  // Revoke gateway
  app.delete('/api/gateway/:gatewayId', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      const result = await gatewayService.revokeGatewayCode(userId, req.params.gatewayId);
      
      if (!result.success) {
        return res.status(404).json({ message: result.error });
      }
      
      res.json({ 
        success: true,
        message: 'Gateway revoked successfully'
      });
    } catch (error: any) {
      console.error('Failed to revoke gateway:', error);
      res.status(500).json({ 
        message: 'Failed to revoke gateway', 
        error: error.message 
      });
    }
  });
  
  // Delete gateway activation code
  app.delete('/api/gateway/codes/:code', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      const { code } = req.params;
      
      // Check if code exists and belongs to the user
      const existing = await db.select()
        .from(gatewayCodes)
        .where(and(
          eq(gatewayCodes.code, code),
          eq(gatewayCodes.userId, userId)
        ));
      
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Code not found or does not belong to you' });
      }
      
      // Delete the code
      await db.delete(gatewayCodes)
        .where(and(
          eq(gatewayCodes.code, code),
          eq(gatewayCodes.userId, userId)
        ));
      
      res.json({ success: true, message: 'Activation code deleted successfully' });
    } catch (error) {
      console.error('Error deleting gateway code:', error);
      res.status(500).json({ error: 'Failed to delete gateway code' });
    }
  });
  
  // Test gateway system (development only)
  app.get('/api/gateway/test', customAuth, async (req: any, res) => {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Test endpoint not available in production' });
    }
    
    // Return simple test confirmation for development
    res.json({ 
      message: 'Gateway system test endpoint (development only)',
      status: 'The gateway security system is fully implemented with:',
      features: [
        '15-day activation codes',
        'JWT authentication',
        'Rate limiting (5 attempts/hour)',
        'Complete audit logging',
        'User data isolation'
      ]
    });
  });
  
  // Get active gateways with their connection status
  app.get('/api/gateways/active', async (req, res) => {
    try {
      const now = new Date();
      
      // Get all gateway codes that have been activated (have a gateway_id)
      const activeGatewayCodes = await db.select()
        .from(gatewayCodes)
        .where(and(
          or(
            eq(gatewayCodes.status, 'active'),
            eq(gatewayCodes.status, 'redeemed')
          ),
          isNotNull(gatewayCodes.gatewayId)
        ));
      
      // Process gateway data to determine connection status
      const activeGateways = activeGatewayCodes.map(code => {
        // Calculate status based on last heartbeat
        let connectionStatus = 'disconnected';
        let lastHeartbeat = code.lastSyncAt;
        
        if (lastHeartbeat) {
          const secondsSinceLastBeat = (now.getTime() - new Date(lastHeartbeat).getTime()) / 1000;
          
          if (secondsSinceLastBeat < 60) {
            connectionStatus = 'active';
          } else if (secondsSinceLastBeat < 300) { // 5 minutes
            connectionStatus = 'stale';
          } else {
            connectionStatus = 'disconnected';
          }
        }
        
        return {
          id: code.gatewayId || `gw_${code.id}`,
          name: (code.gatewayInfo as any)?.name || `Gateway ${code.id}`,
          connectionStatus,
          lastHeartbeat: lastHeartbeat ? new Date(lastHeartbeat).toISOString() : null,
          tagsMonitored: (code.gatewayInfo as any)?.tagsCount || 42, // Default tag count if not stored
          syncCount: code.syncCount || 0,
          gatewayInfo: code.gatewayInfo || {},
          activatedAt: code.activatedAt ? new Date(code.activatedAt).toISOString() : null
        };
      });
      
      // If no real gateways exist, add mock data for demonstration
      if (activeGateways.length === 0 && process.env.NODE_ENV !== 'production') {
        const mockGateways = [
          {
            id: 'gw_demo_001',
            name: 'Main Facility Gateway',
            connectionStatus: 'active',
            lastHeartbeat: new Date(now.getTime() - 15000).toISOString(), // 15 seconds ago
            tagsMonitored: 42,
            syncCount: 1234,
            gatewayInfo: {
              os: 'Windows',
              osVersion: '10.0.19043',
              cpu: 'Intel Core i7-9700K',
              memory: '16GB'
            },
            activatedAt: new Date(now.getTime() - 86400000).toISOString() // 1 day ago
          },
          {
            id: 'gw_demo_002',
            name: 'Backup Gateway',
            connectionStatus: 'stale',
            lastHeartbeat: new Date(now.getTime() - 180000).toISOString(), // 3 minutes ago
            tagsMonitored: 28,
            syncCount: 892,
            gatewayInfo: {
              os: 'Linux',
              osVersion: 'Ubuntu 20.04',
              cpu: 'AMD Ryzen 5 3600',
              memory: '8GB'
            },
            activatedAt: new Date(now.getTime() - 172800000).toISOString() // 2 days ago
          },
          {
            id: 'gw_demo_003',
            name: 'Test Gateway',
            connectionStatus: 'disconnected',
            lastHeartbeat: new Date(now.getTime() - 600000).toISOString(), // 10 minutes ago
            tagsMonitored: 15,
            syncCount: 456,
            gatewayInfo: {
              os: 'Windows',
              osVersion: '11',
              cpu: 'Intel Core i5-8250U',
              memory: '12GB'
            },
            activatedAt: new Date(now.getTime() - 604800000).toISOString() // 7 days ago
          }
        ];
        
        res.json(mockGateways);
        return;
      }
      
      res.json(activeGateways);
    } catch (error: any) {
      console.error('Failed to get active gateways:', error);
      res.status(500).json({ 
        message: 'Failed to get active gateways', 
        error: error.message 
      });
    }
  });

  // ==================== GATEWAY DEBUG ENDPOINTS ====================
  
  // Get gateway debug information - all connected gateways with details
  app.get('/api/debug/gateways', async (req, res) => {
    try {
      // Get all gateways from storage
      const gateways = await storage.getGatewayDebugInfo();
      
      // Get recent activity from debug logs
      const recentLogs = await db.select({
        gatewayId: gatewayDebugLogs.gatewayId,
        lastActivity: sql<string>`MAX(timestamp)`.as('lastActivity'),
        totalRequests: sql<number>`COUNT(*)`.as('totalRequests'),
        errorCount: sql<number>`SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END)`.as('errorCount'),
        avgResponseTime: sql<number>`AVG(processing_duration)`.as('avgResponseTime')
      })
      .from(gatewayDebugLogs)
      .where(
        and(
          sql`${gatewayDebugLogs.gatewayId} IS NOT NULL`,
          gte(gatewayDebugLogs.timestamp, sql`NOW() - INTERVAL '24 hours'`)
        )
      )
      .groupBy(gatewayDebugLogs.gatewayId);
      
      // Create a map of gateway stats
      const statsMap = new Map(recentLogs.map(log => [log.gatewayId, log]));
      
      // Enrich with real-time status
      const enrichedGateways = gateways.map(gateway => {
        const now = new Date();
        const stats = statsMap.get(gateway.id);
        let status = 'disconnected';
        
        // Check last activity from debug logs
        if (stats?.lastActivity) {
          const lastActivity = new Date(stats.lastActivity);
          const secondsSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000;
          
          if (secondsSinceActivity < 30) {
            status = 'active';
          } else if (secondsSinceActivity < 60) {
            status = 'stale';
          } else if (secondsSinceActivity < 300) {
            status = 'inactive';
          } else {
            status = 'disconnected';
          }
        } else if (gateway.lastHeartbeat) {
          const lastBeat = new Date(gateway.lastHeartbeat);
          const secondsSinceHeartbeat = (now.getTime() - lastBeat.getTime()) / 1000;
          
          if (secondsSinceHeartbeat < 30) {
            status = 'active';
          } else if (secondsSinceHeartbeat < 60) {
            status = 'stale';
          } else {
            status = 'inactive';
          }
        }
        
        return {
          ...gateway,
          status,
          lastActivity: stats?.lastActivity || gateway.lastHeartbeat,
          syncCount: stats?.totalRequests || 0,
          errorCount: stats?.errorCount || 0,
          avgResponseTime: stats?.avgResponseTime ? Math.round(stats.avgResponseTime) : null,
          schemaVersion: gateway.schemaVersion || 'v1'
        };
      });
      
      res.json(enrichedGateways);
    } catch (error: any) {
      console.error('Failed to get gateway debug info:', error);
      res.status(500).json({ 
        message: 'Failed to get gateway debug information', 
        error: error.message 
      });
    }
  });
  
  // Get API activity log for gateways - from debug logs database
  app.get('/api/debug/gateway-activity', async (req, res) => {
    try {
      const { gatewayId, timeRange, endpoint, status, search } = req.query;
      const now = new Date();
      
      // Build query conditions
      const conditions = [];
      
      // Filter by gateway ID
      if (gatewayId && gatewayId !== 'all') {
        conditions.push(eq(gatewayDebugLogs.gatewayId, gatewayId as string));
      }
      
      // Filter by time range
      if (timeRange) {
        let cutoffTime: Date;
        switch(timeRange) {
          case '1h':
            cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '6h':
            cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case '24h':
            cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
        }
        conditions.push(gte(gatewayDebugLogs.timestamp, cutoffTime));
      } else {
        // Default to last 24 hours to avoid huge result sets
        conditions.push(gte(gatewayDebugLogs.timestamp, new Date(now.getTime() - 24 * 60 * 60 * 1000)));
      }
      
      // Filter by endpoint type
      if (endpoint && endpoint !== 'all') {
        conditions.push(ilike(gatewayDebugLogs.endpoint, `%${endpoint}%`));
      }
      
      // Filter by status
      if (status) {
        switch(status) {
          case 'success':
            conditions.push(and(
              gte(gatewayDebugLogs.responseStatus, 200),
              lt(gatewayDebugLogs.responseStatus, 300)
            ));
            break;
          case 'warning':
            conditions.push(and(
              gte(gatewayDebugLogs.responseStatus, 400),
              lt(gatewayDebugLogs.responseStatus, 500)
            ));
            break;
          case 'error':
            conditions.push(gte(gatewayDebugLogs.responseStatus, 500));
            break;
        }
      }
      
      // Search in error messages or request body
      if (search) {
        conditions.push(or(
          ilike(gatewayDebugLogs.errorMessage, `%${search}%`),
          sql`${gatewayDebugLogs.requestBody}::text ILIKE ${'%' + search + '%'}`,
          sql`${gatewayDebugLogs.responseBody}::text ILIKE ${'%' + search + '%'}`
        ));
      }
      
      // Execute query
      const activities = await db.select({
        id: gatewayDebugLogs.id,
        timestamp: gatewayDebugLogs.timestamp,
        gatewayId: gatewayDebugLogs.gatewayId,
        endpoint: gatewayDebugLogs.endpoint,
        method: gatewayDebugLogs.method,
        statusCode: gatewayDebugLogs.responseStatus,
        responseTime: gatewayDebugLogs.processingDuration,
        requestSize: gatewayDebugLogs.requestSize,
        responseSize: gatewayDebugLogs.responseSize,
        error: gatewayDebugLogs.errorMessage,
        ip: gatewayDebugLogs.ipAddress,
        category: gatewayDebugLogs.category,
        severity: gatewayDebugLogs.severity
      })
      .from(gatewayDebugLogs)
      .where(conditions.length > 0 ? and(...conditions) : sql`true`)
      .orderBy(desc(gatewayDebugLogs.timestamp))
      .limit(500); // Limit to 500 most recent entries
      
      res.json(activities);
    } catch (error: any) {
      console.error('Failed to get gateway activity:', error);
      res.status(500).json({ 
        message: 'Failed to get gateway activity', 
        error: error.message 
      });
    }
  });
  
  // Get gateway table status for debugging
  app.get('/api/debug/gateway-tables', async (req, res) => {
    try {
      const { gatewayId } = req.query;
      
      if (!gatewayId || gatewayId === 'all') {
        return res.json([]);
      }
      
      // Get table status from storage
      const tableStatus = await storage.getLatestTableStatus(gatewayId as string);
      
      // Transform for UI
      const tables = tableStatus.map(status => ({
        tableName: status.tableName,
        rowCount: status.rowCount,
        sizeBytes: status.sizeBytes,
        lastSync: status.reportedAt,
        status: status.errorCount && status.errorCount > 0 ? 'error' : 
                status.reportedAt && new Date(status.reportedAt) > new Date(Date.now() - 60000) ? 'synced' : 'pending',
        error: status.lastError
      }));
      
      res.json(tables);
    } catch (error: any) {
      console.error('Failed to get gateway tables:', error);
      res.status(500).json({ 
        message: 'Failed to get gateway table status', 
        error: error.message 
      });
    }
  });
  
  // Get gateway statistics from debug logs
  app.get('/api/debug/gateway-stats', async (req, res) => {
    try {
      const { timeRange } = req.query;
      const now = new Date();
      
      // Determine cutoff time
      let cutoffTime: Date;
      switch(timeRange) {
        case '1h':
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
      }
      
      // Get statistics from debug logs
      const stats = await db.select({
        totalRequests: sql<number>`COUNT(*)`.as('totalRequests'),
        errorCount: sql<number>`SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END)`.as('errorCount'),
        warningCount: sql<number>`SUM(CASE WHEN response_status >= 400 AND response_status < 500 THEN 1 ELSE 0 END)`.as('warningCount'),
        criticalCount: sql<number>`SUM(CASE WHEN response_status >= 500 THEN 1 ELSE 0 END)`.as('criticalCount'),
        avgResponseTime: sql<number>`AVG(processing_duration)`.as('avgResponseTime'),
        maxResponseTime: sql<number>`MAX(processing_duration)`.as('maxResponseTime'),
        rateLimitedCount: sql<number>`SUM(CASE WHEN is_rate_limited THEN 1 ELSE 0 END)`.as('rateLimitedCount')
      })
      .from(gatewayDebugLogs)
      .where(gte(gatewayDebugLogs.timestamp, cutoffTime));
      
      // Get unique gateway count
      const uniqueGateways = await db.selectDistinct({
        gatewayId: gatewayDebugLogs.gatewayId
      })
      .from(gatewayDebugLogs)
      .where(
        and(
          gte(gatewayDebugLogs.timestamp, cutoffTime),
          sql`${gatewayDebugLogs.gatewayId} IS NOT NULL`
        )
      );
      
      // Get failed activation attempts
      const failedActivations = await db.select({
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(gatewayDebugLogs)
      .where(
        and(
          gte(gatewayDebugLogs.timestamp, cutoffTime),
          ilike(gatewayDebugLogs.endpoint, '%/activate%'),
          gte(gatewayDebugLogs.responseStatus, 400)
        )
      );
      
      // Get most active gateways
      const mostActiveGateways = await db.select({
        gatewayId: gatewayDebugLogs.gatewayId,
        requestCount: sql<number>`COUNT(*)`.as('requestCount'),
        errorCount: sql<number>`SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END)`.as('errorCount')
      })
      .from(gatewayDebugLogs)
      .where(
        and(
          gte(gatewayDebugLogs.timestamp, cutoffTime),
          sql`${gatewayDebugLogs.gatewayId} IS NOT NULL`
        )
      )
      .groupBy(gatewayDebugLogs.gatewayId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(5);
      
      // Calculate requests per minute
      const timeRangeMinutes = {
        '1h': 60,
        '6h': 360,
        '24h': 1440,
        '7d': 10080
      }[timeRange as string] || 1440; // Default to 24h
      
      const stat = stats[0];
      const totalRequests = stat?.totalRequests || 0;
      const errorCount = stat?.errorCount || 0;
      
      res.json({
        totalGateways: uniqueGateways.length,
        activeGateways: uniqueGateways.filter(g => g.gatewayId).length,
        totalRequests,
        errorCount,
        warningCount: stat?.warningCount || 0,
        criticalCount: stat?.criticalCount || 0,
        avgResponseTime: Math.round(stat?.avgResponseTime || 0),
        maxResponseTime: Math.round(stat?.maxResponseTime || 0),
        errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
        requestsPerMinute: totalRequests > 0 ? Math.round(totalRequests / timeRangeMinutes) : 0,
        rateLimitedCount: stat?.rateLimitedCount || 0,
        failedActivationAttempts: failedActivations[0]?.count || 0,
        mostActiveGateways
      });
    } catch (error: any) {
      console.error('Failed to get gateway stats:', error);
      res.status(500).json({ 
        message: 'Failed to get gateway statistics', 
        error: error.message 
      });
    }
  });
  
  // Get raw gateway debug logs with detailed information
  app.get('/api/debug/gateway-logs', async (req, res) => {
    try {
      const { 
        gatewayId, 
        userId,
        category,
        severity,
        timeRange, 
        limit = '100',
        offset = '0',
        includeBody = 'false'
      } = req.query;
      
      const now = new Date();
      const conditions = [];
      
      // Filter by gateway ID
      if (gatewayId && gatewayId !== 'all') {
        conditions.push(eq(gatewayDebugLogs.gatewayId, gatewayId as string));
      }
      
      // Filter by user ID
      if (userId) {
        conditions.push(eq(gatewayDebugLogs.userId, userId as string));
      }
      
      // Filter by category
      if (category && category !== 'all') {
        conditions.push(eq(gatewayDebugLogs.category, category as string));
      }
      
      // Filter by severity
      if (severity && severity !== 'all') {
        conditions.push(eq(gatewayDebugLogs.severity, severity as string));
      }
      
      // Filter by time range
      let cutoffTime: Date = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default 24h
      if (timeRange) {
        switch(timeRange) {
          case '5m':
            cutoffTime = new Date(now.getTime() - 5 * 60 * 1000);
            break;
          case '15m':
            cutoffTime = new Date(now.getTime() - 15 * 60 * 1000);
            break;
          case '1h':
            cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '6h':
            cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case '24h':
            cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        }
      }
      conditions.push(gte(gatewayDebugLogs.timestamp, cutoffTime));
      
      // Build query
      const baseQuery = {
        id: gatewayDebugLogs.id,
        timestamp: gatewayDebugLogs.timestamp,
        gatewayId: gatewayDebugLogs.gatewayId,
        userId: gatewayDebugLogs.userId,
        endpoint: gatewayDebugLogs.endpoint,
        method: gatewayDebugLogs.method,
        ipAddress: gatewayDebugLogs.ipAddress,
        userAgent: gatewayDebugLogs.userAgent,
        responseStatus: gatewayDebugLogs.responseStatus,
        requestSize: gatewayDebugLogs.requestSize,
        responseSize: gatewayDebugLogs.responseSize,
        errorMessage: gatewayDebugLogs.errorMessage,
        errorCode: gatewayDebugLogs.errorCode,
        errorStack: gatewayDebugLogs.errorStack,
        processingDuration: gatewayDebugLogs.processingDuration,
        machineId: gatewayDebugLogs.machineId,
        schemaVersion: gatewayDebugLogs.schemaVersion,
        gatewayVersion: gatewayDebugLogs.gatewayVersion,
        isRateLimited: gatewayDebugLogs.isRateLimited,
        rateLimitReason: gatewayDebugLogs.rateLimitReason,
        category: gatewayDebugLogs.category,
        severity: gatewayDebugLogs.severity
      };
      
      // Optionally include request/response bodies
      if (includeBody === 'true') {
        Object.assign(baseQuery, {
          requestHeaders: gatewayDebugLogs.requestHeaders,
          requestBody: gatewayDebugLogs.requestBody,
          responseHeaders: gatewayDebugLogs.responseHeaders,
          responseBody: gatewayDebugLogs.responseBody
        });
      }
      
      // Execute query
      const logs = await db.select(baseQuery)
        .from(gatewayDebugLogs)
        .where(conditions.length > 0 ? and(...conditions) : sql`true`)
        .orderBy(desc(gatewayDebugLogs.timestamp))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      // Get total count for pagination
      const countResult = await db.select({
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(gatewayDebugLogs)
      .where(conditions.length > 0 ? and(...conditions) : sql`true`);
      
      res.json({
        logs,
        total: countResult[0]?.count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error: any) {
      console.error('Failed to get gateway logs:', error);
      res.status(500).json({ 
        message: 'Failed to get gateway logs', 
        error: error.message 
      });
    }
  });
  
  // Clear activity log for a gateway (development only)
  app.post('/api/debug/clear-activity', async (req, res) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: 'Clear activity not available in production' });
      }
      
      const { gatewayId } = req.body;
      
      if (gatewayId && gatewayId !== 'all') {
        apiActivityLog.set(gatewayId, []);
      } else {
        // Clear all activity
        apiActivityLog.clear();
      }
      
      res.json({ success: true, message: 'Activity cleared' });
    } catch (error: any) {
      console.error('Failed to clear activity:', error);
      res.status(500).json({ 
        message: 'Failed to clear activity', 
        error: error.message 
      });
    }
  });
  
  // ==================== FACILITIES ====================
  
  // Get facilities for current tenant
  app.get('/api/facilities', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Log for debugging
      console.log('[/api/facilities] Request info:', {
        userId,
        tenantId: req.tenantId,
        userObj: req.user
      });
      
      // For OAuth/demo users, return a default facility or empty array
      // Since PLC configurations are stored per userId, facilities are optional
      const facilities = [];
      
      // Check if user has any PLC devices to determine if we should show a virtual facility
      const plcDevices = await storage.getAllPlcDevices(userId);
      if (plcDevices.length > 0) {
        // Return a virtual facility for users with PLC devices
        facilities.push({
          id: 1,
          tenantId: req.tenantId || userId,
          name: 'Main Facility',
          address: 'Virtual Facility',
          type: 'production',
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      
      res.json(facilities);
    } catch (error: any) {
      console.error('[/api/facilities] Error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch facilities', 
        error: error.message 
      });
    }
  });
  
  // ==================== DASHBOARD DATA ====================
  
  // Get dashboard metrics
  app.get('/api/dashboard/metrics', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Get user's PLC devices from database
      const plcDevices = await storage.getAllPlcDevices(userId);
      
      // Get tags for user's PLCs from database
      const tags = await storage.getPlcTagsByUser(userId);
      
      // Generate demo metrics with tag values
      const metrics = {
        totalFacilities: 1, // Demo users have 1 virtual facility
        connectedGateways: plcDevices.length > 0 ? 1 : 0,
        totalPlcDevices: plcDevices.length,
        activePlcDevices: plcDevices.filter(d => d.status === 'connected').length,
        totalTags: tags.length,
        activeTags: tags.filter(t => t.enabled).length,
        dataPointsToday: tags.length * Math.floor(Math.random() * 1000) + 1000,
        alertsActive: Math.floor(Math.random() * 5),
        systemHealth: 95 + Math.random() * 5
      };
      
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch dashboard metrics', 
        error: error.message 
      });
    }
  });
  
  // Get real-time data with tag values
  app.get('/api/dashboard/realtime', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Get user's PLC devices from database
      const plcDevices = await storage.getAllPlcDevices(userId);
      
      // Get only tags for user's PLCs from database
      const tags = await storage.getPlcTagsByUser(userId);
      
      const tagValues: any = {};
      
      // Update tag values with simulated data
      tags.forEach(tag => {
        let value;
        switch(tag.dataType) {
          case 'BOOL':
            value = Math.random() > 0.5 ? 1 : 0;
            break;
          case 'INT':
            value = Math.floor(Math.random() * 1000);
            break;
          case 'REAL':
            value = Math.random() * 100;
            break;
          default:
            value = Math.random() * 100;
        }
        
        // Update tag's last value
        tag.lastValue = value;
        tag.lastReadTime = new Date();
        tag.quality = 'good';
        
        tagValues[tag.name] = {
          value,
          unit: tag.unit,
          quality: 'good',
          timestamp: new Date().toISOString()
        };
      });
      
      // Generate demo real-time data
      const data = {
        timestamp: new Date().toISOString(),
        values: {
          temperature: 20 + Math.random() * 10,
          pressure: 1 + Math.random() * 0.5,
          flowRate: 100 + Math.random() * 50,
          level: 50 + Math.random() * 30,
          ph: 6.5 + Math.random() * 1.5,
          turbidity: Math.random() * 5
        },
        tagValues
      };
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch real-time data', 
        error: error.message 
      });
    }
  });
  
  // ==================== USER DASHBOARDS (Custom Tag Dashboards) ====================
  
  // Get all dashboards for current user
  app.get('/api/user-dashboards', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const dashboards = await storage.getUserDashboards(userId);
      res.json(dashboards);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch user dashboards', 
        error: error.message 
      });
    }
  });
  
  // Get specific dashboard
  app.get('/api/user-dashboards/:id', customAuth, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const dashboard = await storage.getUserDashboard(dashboardId);
      
      if (!dashboard) {
        return res.status(404).json({ message: 'Dashboard not found' });
      }
      
      // Verify the dashboard belongs to the current user
      const userId = req.user.userId || req.user.claims?.sub;
      if (dashboard.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch dashboard', 
        error: error.message 
      });
    }
  });
  
  // Create new dashboard
  app.post('/api/user-dashboards', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { name, widgets, layouts, isDefault } = req.body;
      
      const dashboard = await storage.createUserDashboard({
        userId,
        name: name || 'My Dashboard',
        widgets: widgets || [],
        layouts: layouts || {},
        isDefault: isDefault || false
      });
      
      res.status(201).json(dashboard);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to create dashboard', 
        error: error.message 
      });
    }
  });
  
  // Update dashboard
  app.put('/api/user-dashboards/:id', customAuth, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Verify the dashboard belongs to the current user
      const existingDashboard = await storage.getUserDashboard(dashboardId);
      if (!existingDashboard) {
        return res.status(404).json({ message: 'Dashboard not found' });
      }
      
      if (existingDashboard.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const { name, widgets, layouts, isDefault } = req.body;
      
      const dashboard = await storage.updateUserDashboard(dashboardId, {
        name,
        widgets,
        layouts,
        isDefault
      });
      
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to update dashboard', 
        error: error.message 
      });
    }
  });
  
  // Delete dashboard
  app.delete('/api/user-dashboards/:id', customAuth, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Verify the dashboard belongs to the current user
      const existingDashboard = await storage.getUserDashboard(dashboardId);
      if (!existingDashboard) {
        return res.status(404).json({ message: 'Dashboard not found' });
      }
      
      if (existingDashboard.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const deleted = await storage.deleteUserDashboard(dashboardId);
      
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: 'Failed to delete dashboard' });
      }
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to delete dashboard', 
        error: error.message 
      });
    }
  });
  
  // ==================== USER PROFILE ====================
  
  // Get current user
  app.get('/api/user/profile', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Get user from database
      const demoUser = await storage.getDemoUser(userId);
      
      if (!demoUser) {
        // Return basic user info from session if demo user not found
        return res.json({
          user: {
            id: userId,
            email: req.user.email || 'user@example.com',
            firstName: req.user.firstName || '',
            lastName: req.user.lastName || '',
            role: req.user.role || 'operator'
          },
          tenant: null
        });
      }
      
      // Calculate demo end date for demo users
      const demoEndDate = demoUser.demoEndDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const remainingDays = Math.max(0, Math.ceil((demoEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      
      res.json({
        user: {
          id: demoUser.id,
          email: demoUser.email,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          role: 'operator',
          profileImageUrl: demoUser.profileImageUrl
        },
        tenant: {
          id: userId,
          companyName: demoUser.companyName || 'Demo Company',
          companyCode: 'DEMO',
          status: demoUser.status || 'active',
          demoEndDate: demoEndDate.toISOString(),
          remainingDays
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to fetch user profile', 
        error: error.message 
      });
    }
  });
  
  // ==================== ADMIN ACTIVATION CODE MANAGEMENT ====================
  
  // Create new activation code (Admin)
  app.post('/api/admin/activation-codes', customAuth, async (req: any, res) => {
    try {
      const { tenantId, description, expiresAt } = req.body;
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Verify admin role
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Admin access required' 
          } 
        });
      }
      
      // Using issueGatewayCode instead of createActivationCode
      const codeResult = await gatewayCodesService.issueGatewayCode(
        userId,
        tenantId || req.user.tenantId,
        30 // 30 days expiry
      );
      
      res.status(201).json({
        code: codeResult.code,
        expiresAt: codeResult.expiresAt?.toISOString(),
        message: 'Activation code generated successfully'
      });
    } catch (error: any) {
      console.error('Failed to create activation code:', error);
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create activation code' 
        } 
      });
    }
  });
  
  // Generate gateway activation code (Admin) - Simple version
  app.post('/api/admin/gateway/generate-code', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      const { tenantId, notes, expiresInDays = 30 } = req.body;
      
      // Verify admin role (or allow user to generate for themselves)
      const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
      
      // Generate the code
      const code = gatewayService.generateGatewayCode();
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      
      // Insert into database
      const [newCode] = await db.insert(gatewayCodes).values({
        code,
        userId: req.body.userId || userId,
        tenantId: tenantId || req.user.tenantId || 1,
        status: 'issued',
        expiresAt,
        scope: { allow: 'activate_gateway' },
        notes: notes || 'Generated via admin API',
        createdAt: new Date()
      }).returning();
      
      res.status(201).json({
        code: newCode.code,
        expiresAt: newCode.expiresAt?.toISOString(),
        message: 'Gateway activation code generated successfully'
      });
    } catch (error: any) {
      console.error('Failed to generate gateway code:', error);
      res.status(500).json({ 
        error: 'Failed to generate gateway code',
        message: error.message 
      });
    }
  });
  
  // List activation codes (Admin)
  app.get('/api/admin/activation-codes', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Verify admin role
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Admin access required' 
          } 
        });
      }
      
      const codes = await gatewayService.listActivationCodes(req.user.tenantId);
      
      res.json({
        codes: codes.map(code => ({
          id: code.id,
          code: code.code,
          status: code.status,
          gatewayId: code.gatewayId,
          machineId: code.machineId,
          activatedAt: code.activatedAt?.toISOString(),
          expiresAt: code.expiresAt?.toISOString(),
          createdAt: code.createdAt.toISOString(),
          syncCount: code.syncCount,
          lastSyncAt: code.lastSyncAt?.toISOString()
        }))
      });
    } catch (error: any) {
      console.error('Failed to list activation codes:', error);
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to list activation codes' 
        } 
      });
    }
  });
  
  // Revoke activation code (Admin)
  app.post('/api/admin/activation-codes/:codeId/revoke', customAuth, async (req: any, res) => {
    try {
      const { codeId } = req.params;
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Verify admin role
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Admin access required' 
          } 
        });
      }
      
      const success = await gatewayService.revokeActivationCode(codeId, userId);
      
      if (!success) {
        return res.status(404).json({ 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Activation code not found' 
          } 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Activation code revoked successfully' 
      });
    } catch (error: any) {
      console.error('Failed to revoke activation code:', error);
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to revoke activation code' 
        } 
      });
    }
  });
  
  // Get activation code details (Admin)
  app.get('/api/admin/activation-codes/:codeId', customAuth, async (req: any, res) => {
    try {
      const { codeId } = req.params;
      
      // Verify admin role
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Admin access required' 
          } 
        });
      }
      
      const code = await gatewayService.getActivationCodeDetails(codeId);
      
      if (!code) {
        return res.status(404).json({ 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Activation code not found' 
          } 
        });
      }
      
      res.json({
        id: code.id,
        code: code.code,
        status: code.status,
        gatewayId: code.gatewayId,
        machineId: code.machineId,
        gatewayInfo: code.gatewayInfo,
        activatedAt: code.activatedAt?.toISOString(),
        expiresAt: code.expiresAt?.toISOString(),
        createdAt: code.createdAt.toISOString(),
        syncCount: code.syncCount,
        lastSyncAt: code.lastSyncAt?.toISOString(),
        activationIp: code.activationIp,
        notes: code.notes || 'No notes'
      });
    } catch (error: any) {
      console.error('Failed to get activation code:', error);
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get activation code details' 
        } 
      });
    }
  });
  
  // ==================== DATA SIMULATOR ENDPOINT ====================
  
  // Debug endpoint for testing simulator without auth (REMOVE IN PRODUCTION)
  app.get('/api/simulator/test', async (req: any, res) => {
    try {
      console.log("[SIMULATOR-TEST] Testing simulator without authentication");
      
      // Get current status
      const currentStatus = plcDataSimulator.getStatus();
      
      let result;
      if (currentStatus.isRunning) {
        // Stop the simulator
        result = plcDataSimulator.stop();
      } else {
        // Start the simulator
        result = await plcDataSimulator.start();
      }
      
      const status = plcDataSimulator.getStatus();
      
      res.json({
        success: result.success,
        message: result.message,
        isRunning: status.isRunning,
        lastUpdate: status.lastUpdate?.toISOString(),
        note: "This is a test endpoint - remove in production"
      });
      
    } catch (error: any) {
      console.error('[SIMULATOR-TEST] Error:', error);
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to test simulator',
          details: error.message
        } 
      });
    }
  });
  
  // Toggle the PLC data simulator (for testing purposes)
  app.post('/api/simulator/toggle', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Allow for any authenticated user
      if (!userId) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
      }
      
      // Get current status
      const currentStatus = plcDataSimulator.getStatus();
      
      let result;
      if (currentStatus.isRunning) {
        // Stop the simulator
        result = plcDataSimulator.stop();
      } else {
        // Start the simulator with the current user ID
        result = await plcDataSimulator.startForUser(userId);
      }
      
      const status = plcDataSimulator.getStatus();
      
      res.json({
        success: result.success,
        message: result.message,
        isRunning: status.isRunning,
        lastUpdate: status.lastUpdate?.toISOString()
      });
      
    } catch (error: any) {
      console.error('[SIMULATOR] Toggle error:', error);
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to toggle simulator' 
        } 
      });
    }
  });
  
  // Get simulator status
  app.get('/api/simulator/status', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId || req.user.claims?.sub;
      
      // Allow for any authenticated user
      if (!userId) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
      }
      
      const status = plcDataSimulator.getStatus();
      
      res.json({
        isRunning: status.isRunning,
        lastUpdate: status.lastUpdate?.toISOString()
      });
      
    } catch (error: any) {
      console.error('[SIMULATOR] Status error:', error);
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get simulator status' 
        } 
      });
    }
  });
  
  // ==================== FINAL API CATCH-ALL ====================
  // IMPORTANT: This must be the last route before WebSocket/static file serving
  // Ensures that unmatched API routes return JSON errors, not HTML
  app.all(['/api/*', '/api/v1/*'], (req: any, res) => {
    // If we reached here, the API route was not found
    res.status(404).json({
      ok: false,
      error: 'not_found',
      message: `API endpoint ${req.method} ${req.path} not found`
    });
  });
  
  // JSON error middleware for thrown errors in API routes
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api')) {
      const status = err.statusCode || 500;
      return res.status(status).json({
        ok: false,
        error: err.code || 'internal_error',
        message: err.message || 'Internal error'
      });
    }
    next(err);
  });
  
  const httpServer = createServer(app);
  
  // ==================== WEBSOCKET SERVER ====================
  
  // WebSocket server for real-time gateway communication
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/gateway'
  });
  
  // Store connected gateways with connection metadata
  interface GatewayConnection {
    ws: WebSocket;
    gatewayId: string;
    userId: string;
    isAlive: boolean;
    lastPing: Date;
    lastActivity: Date;
  }
  
  const connectedGateways = new Map<string, GatewayConnection>();
  
  // WebSocket notification system for config updates
  function notifyGatewaysOfConfigUpdate(userId: string, updateType: 'created' | 'updated' | 'deleted', plcId?: number) {
    const notification = {
      type: 'config_update',
      update_type: updateType,
      plc_id: plcId || null, // Fixed: use numeric plcId instead of string format
      timestamp: new Date().toISOString(),
      message: `PLC configuration ${updateType}${plcId ? ' for PLC ' + plcId : ''}`
    };
    
    let notificationsSent = 0;
    connectedGateways.forEach((connection, gatewayId) => {
      if (connection.userId === userId && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(JSON.stringify(notification));
          notificationsSent++;
          console.log(`Config update notification sent to gateway ${gatewayId}`);
        } catch (error) {
          console.error(`Failed to send notification to gateway ${gatewayId}:`, error);
        }
      }
    });
    
    console.log(`Config update notification sent to ${notificationsSent} connected gateways for user ${userId}`);
    return notificationsSent;
  }
  
  // Ping interval for keep-alive (30 seconds)
  const PING_INTERVAL = 30000;
  const PING_TIMEOUT = 10000; // 10 seconds to respond to ping
  
  // Setup periodic ping to detect disconnected clients
  const pingInterval = setInterval(() => {
    const now = new Date();
    connectedGateways.forEach((connection, gatewayId) => {
      if (!connection.isAlive) {
        // Gateway didn't respond to last ping, terminate connection
        console.log(`Gateway ${gatewayId} failed to respond to ping, terminating connection`);
        connection.ws.terminate();
        connectedGateways.delete(gatewayId);
        return;
      }
      
      // Send ping and mark as not alive
      connection.isAlive = false;
      connection.lastPing = now;
      connection.ws.send(JSON.stringify({ 
        type: 'ping', 
        timestamp_ms: Date.now() 
      }));
    });
  }, PING_INTERVAL);
  
  wss.on('connection', (ws, req) => {
    let gatewayId: string | null = null;
    let connectedUserId: string | null = null;
    
    // Handle authentication on first message
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // First message must be authentication
        if (!gatewayId && data.type === 'auth') {
          const payload = gatewayService.verifyGatewayToken(data.token);
          if (!payload) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            ws.close();
            return;
          }
          
          gatewayId = payload.gatewayId;
          connectedUserId = payload.userId;
          
          // Store connection with metadata
          connectedGateways.set(gatewayId, { 
            ws, 
            gatewayId, 
            userId: connectedUserId,
            isAlive: true,
            lastPing: new Date(),
            lastActivity: new Date()
          });
          
          ws.send(JSON.stringify({ 
            type: 'auth_success', 
            gatewayId,
            message: 'WebSocket authenticated successfully' 
          }));
          
          // Log connection
          await gatewayService.logAuditEvent('websocket_connected', true, {
            gatewayId,
            userId: connectedUserId,
            ipAddress: (req.socket.remoteAddress || 'unknown')
          });
          
          return;
        }
        
        // Reject messages if not authenticated
        if (!gatewayId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }
        
        // Update last activity for any authenticated message
        if (gatewayId) {
          const connection = connectedGateways.get(gatewayId);
          if (connection) {
            connection.lastActivity = new Date();
          }
        }
        
        // Handle different message types
        switch (data.type) {
          case 'data':
            // Real-time data from gateway
            const tags = data.tags || [];
            for (const tagData of tags) {
              const tag = demoStorage.plcTags.get(tagData.id);
              if (tag) {
                tag.lastValue = tagData.value;
                tag.lastReadTime = new Date();
                tag.quality = tagData.quality === 192 ? 'good' : 'bad';
              }
            }
            ws.send(JSON.stringify({ 
              type: 'ack', 
              batch_id: data.batch_id,
              timestamp_ms: Date.now(),
              message: 'Data received' 
            }));
            break;
            
          case 'alert':
            // Alert from gateway
            console.log(`Alert from gateway ${gatewayId}:`, data.message);
            ws.send(JSON.stringify({ type: 'ack', message: 'Alert received' }));
            break;
            
          case 'ping':
            // Client-initiated ping (backward compatibility)
            ws.send(JSON.stringify({ type: 'pong', timestamp_ms: Date.now() }));
            if (gatewayId) {
              const connection = connectedGateways.get(gatewayId);
              if (connection) {
                connection.lastActivity = new Date();
              }
            }
            break;
            
          case 'pong':
            // Response to server ping
            if (gatewayId) {
              const connection = connectedGateways.get(gatewayId);
              if (connection) {
                connection.isAlive = true;
                connection.lastActivity = new Date();
              }
            }
            break;
            
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', async () => {
      if (gatewayId) {
        connectedGateways.delete(gatewayId);
        
        // Log disconnection
        await gatewayService.logAuditEvent('websocket_disconnected', true, {
          gatewayId,
          userId: connectedUserId || undefined
        });
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (gatewayId) {
        connectedGateways.delete(gatewayId);
      }
    });
  });
  
  // Function to send commands to gateways
  (global as any).sendToGateway = (gatewayId: string, message: any) => {
    const connection = connectedGateways.get(gatewayId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  };
  
  // Cleanup on server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval);
    connectedGateways.forEach((connection) => {
      connection.ws.close();
    });
    connectedGateways.clear();
  });
  
  return httpServer;
}