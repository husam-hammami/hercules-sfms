import { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    tenantId?: string;
    user?: {
      id?: string;
      userId?: string;
      email?: string;
      isDemo?: boolean;
      [key: string]: unknown;
    };
  }
}

export function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'];
  if (!req.userId && typeof sessionId === 'string') {
    req.userId = sessionId;
  }
  if (!req.userId) {
    req.userId = req.user?.userId || req.user?.id || 'demo-user';
  }
  if (!req.tenantId) {
    const tenantHeader = req.headers['x-tenant-id'];
    req.tenantId = typeof tenantHeader === 'string' ? tenantHeader : 'demo-tenant';
  }
  next();
}

