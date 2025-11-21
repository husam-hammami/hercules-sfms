import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import session from 'express-session';
import MemoryStore from 'memorystore';

const MemoryStoreSession = MemoryStore(session);

// Get admin credentials from environment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export const sessionMiddleware = session({
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || 'hercules-admin-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    sameSite: 'lax'
  },
  name: 'admin.sid'
});

// Extend Express Session interface
declare module 'express-session' {
  interface SessionData {
    adminAuthenticated?: boolean;
    adminEmail?: string;
  }
}

// Middleware to check if admin is authenticated
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.adminAuthenticated) {
    return next();
  }
  
  // Return 401 for API routes, redirect for web routes
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  } else {
    return res.redirect('/admin/login');
  }
}

// Admin login handler
export async function adminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    
    // Check environment variables
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
      console.error('Admin credentials not configured in environment');
      return res.status(500).json({ error: 'Admin authentication not configured' });
    }
    
    // Validate email (case-insensitive)
    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Validate password
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.adminAuthenticated = true;
    req.session.adminEmail = email;
    
    // Save session and respond
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to establish session' });
      }
      
      res.json({ 
        success: true, 
        message: 'Admin authenticated successfully',
        email: email
      });
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Admin logout handler
export function adminLogout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.clearCookie('admin.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

// Check admin session status
export function adminStatus(req: Request, res: Response) {
  if (req.session?.adminAuthenticated) {
    res.json({ 
      authenticated: true, 
      email: req.session.adminEmail 
    });
  } else {
    res.json({ authenticated: false });
  }
}