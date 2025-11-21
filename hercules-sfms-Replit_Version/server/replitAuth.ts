import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Make Replit auth optional - don't require REPLIT_DOMAINS
const ENABLE_REPLIT_AUTH = !!process.env.REPLIT_DOMAINS;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertDemoUser(
  claims: any,
) {
  const demoEndDate = new Date();
  demoEndDate.setDate(demoEndDate.getDate() + 15); // 15 days demo period
  
  // Generate unique demo key for gateway activation
  const demoKey = `DEMO-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  await storage.upsertDemoUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    demoEndDate: demoEndDate,
    demoKey: demoKey,
    status: 'active'
  });
}

export async function setupAuth(app: Express) {
  // Skip Replit auth setup if not enabled
  if (!ENABLE_REPLIT_AUTH) {
    console.log("Replit authentication disabled - app running in public mode");
    
    // Setup minimal session handling for custom auth
    app.use(session({
      secret: process.env.SESSION_SECRET || 'hercules-sfms-session-secret-2024',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
      }
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    
    // Setup empty auth endpoints to avoid 404s
    app.get("/api/login", (req, res) => {
      res.redirect("/custom-auth");
    });
    
    app.get("/api/callback", (req, res) => {
      res.redirect("/");
    });
    
    app.get("/api/logout", (req, res) => {
      req.logout(() => {});
      res.redirect("/");
    });
    
    return;
  }
  
  // Original Replit auth setup (only if enabled)
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertDemoUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Check if access period is still valid
    const demoUser = await storage.getDemoUser(user.claims.sub);
    if (demoUser && demoUser.status === 'active') {
      const currentDate = new Date();
      const expiresAt = demoUser.accessExpiresAt ? new Date(demoUser.accessExpiresAt) :
                        (demoUser.demoEndDate ? new Date(demoUser.demoEndDate) : null);
      
      if (!expiresAt || currentDate > expiresAt) {
        // Access expired
        await storage.updateDemoUser(user.claims.sub, { 
          status: 'expired',
          isActive: false 
        });
        return res.status(403).json({ message: "Your access has expired" });
      }
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Optional authentication middleware that doesn't block unauthenticated requests
export const optionalAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // If not authenticated, just continue
  if (!req.isAuthenticated() || !user?.expires_at) {
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Check if access period is still valid
    const demoUser = await storage.getDemoUser(user.claims.sub);
    if (demoUser && demoUser.status === 'active') {
      const currentDate = new Date();
      const expiresAt = demoUser.accessExpiresAt ? new Date(demoUser.accessExpiresAt) :
                        (demoUser.demoEndDate ? new Date(demoUser.demoEndDate) : null);
      
      if (!expiresAt || currentDate > expiresAt) {
        // Access expired - clear the session but don't block
        await storage.updateDemoUser(user.claims.sub, { 
          status: 'expired',
          isActive: false 
        });
        req.logout(() => {});
      }
    }
    return next();
  }

  // Try to refresh token, but don't block if it fails
  const refreshToken = user.refresh_token;
  if (refreshToken) {
    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
    } catch (error) {
      // Token refresh failed, clear session but continue
      req.logout(() => {});
    }
  }
  
  return next();
};