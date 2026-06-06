import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@homeoassist/domain";
import { getAuthClaimsForAccessToken } from "./profileAuth";
import { logger } from "./lib/logger";
import { jsonError } from "./lib/apiEnvelope";
import { logAndSanitizeError } from "./lib/safeError";
import { env } from "./config/env";

export type AuthClaims = {
  userId: string;
  role: Role;
  clinicId: string | null;
  accessToken: string;
  /** When true, DB access uses the service client; routes must still filter by `clinicId` (dev bypass only). */
  bypass?: boolean;
};

export type JWTPayload = {
  sub: string; // userId
  role: Role;
  clinic_id: string | null;
  iat: number;
  exp: number;
};

const IS_PRODUCTION = env.NODE_ENV === "production";

const devBypassOn = !IS_PRODUCTION && env.DEV_BYPASS_AUTH;
const devBypassToken = env.DEV_BYPASS_BEARER;
const devBypassClinic = env.DEV_BYPASS_CLINIC_ID;

// (Safety checks are now handled in env.ts during server startup)

/** Dev/test only: production must set JWT_SECRET (validated above). */
const JWT_SECRET = env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY = 604800; // 7 days

/**
 * PHASE 1: JWT Token Generation for httpOnly Cookies
 * Generates signed JWT tokens with expiry
 */
export function generateAccessToken(userId: string, role: Role, clinicId: string | null): string {
  return jwt.sign(
    { sub: userId, role, clinic_id: clinicId } as JWTPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: "HS256" }
  );
}

export function generateRefreshToken(userId: string, role: Role, clinicId: string | null): string {
  return jwt.sign(
    { sub: userId, role, clinic_id: clinicId } as JWTPayload,
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: "HS256" }
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

function devBypassClaims(bearer: string): AuthClaims {
  return {
    userId: "00000000-0000-0000-0000-00000000bypass",
    role: "DOCTOR",
    clinicId: devBypassClinic,
    accessToken: bearer,
    bypass: true
  };
}

/** Accepts a raw bearer token (no "Bearer " prefix). Used by HTTP auth and WSS. */
export async function resolveAuthFromAccessTokenString(accessToken: string): Promise<AuthClaims | null> {
  if (IS_PRODUCTION) {
    return getAuthClaimsForAccessToken(accessToken);
  }
  if (devBypassOn && accessToken === devBypassToken) {
    return devBypassClaims(accessToken);
  }
  return getAuthClaimsForAccessToken(accessToken);
}

/**
 * PHASE 1: Extract token from Bearer OR httpOnly cookie
 */
export async function extractToken(req: Request): Promise<string | null> {
  // 1. Check Bearer token first (for legacy API calls, WebSocket, etc.)
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.substring(7);
  }

  // 2. Check httpOnly cookie (for Next.js frontend)
  const cookieToken = req.cookies?.homeo_token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export async function authRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = await extractToken(req);
  if (!token) {
    jsonError(res, 401, "Missing authentication token", { code: "UNAUTHORIZED" });
    return;
  }

  const claims = await resolveAuthFromAccessTokenString(token);
  if (!claims) {
    logAndSanitizeError("auth_token_invalid", new Error("resolveAuthFromAccessTokenString returned null"));
    jsonError(res, 401, "Invalid or expired session. Please sign in again.", { code: "INVALID_TOKEN" });
    return;
  }
  (req as Request & { user: AuthClaims }).user = claims;
  next();
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: AuthClaims }).user;
    if (!user) {
      jsonError(res, 401, "Not authenticated", { code: "UNAUTHORIZED" });
      return;
    }
    if (!roles.includes(user.role)) {
      jsonError(res, 403, "You do not have access to this resource.", { code: "FORBIDDEN" });
      return;
    }
    next();
  };
}

/**
 * Staff / clinic app routes: PATIENT must never use the desktop web app for clinical APIs.
 * Unknown roles (should not exist) get a generic 403.
 */
export function requireAppRoles(allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: AuthClaims }).user;
    if (!user) {
      jsonError(res, 401, "Not authenticated", { code: "UNAUTHORIZED" });
      return;
    }
    if (user.role === "PATIENT") {
      jsonError(res, 403, "Please use mobile app", { code: "PATIENT_WEB_FORBIDDEN" });
      return;
    }
    if (!allowed.includes(user.role)) {
      jsonError(res, 403, "You do not have access to this resource.", { code: "FORBIDDEN" });
      return;
    }
    next();
  };
}
