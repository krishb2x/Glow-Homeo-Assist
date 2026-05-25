import jwt from "jsonwebtoken";

function jitsiBaseHost(): string {
  const base = (process.env.JITSI_BASE_URL?.trim() || "https://meet.jit.si").replace(/\/$/, "");
  try {
    return new URL(base).hostname;
  } catch {
    return base.replace(/^https?:\/\//, "");
  }
}

/** True when self-hosted Jitsi token auth is configured (production). */
export function isJitsiJwtEnabled(): boolean {
  return Boolean(process.env.JITSI_APP_ID?.trim() && process.env.JITSI_APP_SECRET?.trim());
}

/**
 * Signs a Jitsi Meet JWT (mod_prosody / token auth).
 * @see https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker#authentication
 */
export function signJitsiRoomToken(args: {
  roomId: string;
  displayName: string;
  email?: string;
  moderator?: boolean;
  expiresInSec?: number;
}): string | null {
  if (!isJitsiJwtEnabled()) return null;

  const appId = process.env.JITSI_APP_ID!.trim();
  const secret = process.env.JITSI_APP_SECRET!.trim();
  const iss = process.env.JITSI_JWT_ISS?.trim() || appId;
  const aud = process.env.JITSI_JWT_AUD?.trim() || "jitsi";
  const sub = process.env.JITSI_JWT_SUB?.trim() || jitsiBaseHost();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (args.expiresInSec ?? 7200);

  return jwt.sign(
    {
      aud,
      iss,
      sub,
      room: args.roomId,
      exp,
      nbf: now - 10,
      context: {
        user: {
          name: args.displayName,
          email: args.email ?? `guest-${args.roomId.slice(0, 12)}@homeoassist.local`,
          moderator: args.moderator ? "true" : "false"
        }
      }
    },
    secret,
    {
      algorithm: "HS256",
      header: { typ: "JWT", alg: "HS256", kid: appId }
    }
  );
}
