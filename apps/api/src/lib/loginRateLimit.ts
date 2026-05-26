import type { Request } from "express";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS_PER_15M ?? "10");
const buckets = new Map<string, number[]>();

function clientKey(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  const fromHeader = Array.isArray(xf) ? xf[0] : typeof xf === "string" ? xf.split(",")[0] : null;
  return fromHeader?.trim() || req.ip || req.socket?.remoteAddress || "unknown";
}

function prune(ts: number[], now: number): number[] {
  return ts.filter((t) => now - t < WINDOW_MS);
}

export function checkLoginRateLimit(
  req: Request
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const key = clientKey(req);
  const current = prune(buckets.get(key) ?? [], now);
  if (current.length >= Math.max(1, MAX_ATTEMPTS)) {
    const oldest = current[0] ?? now;
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)) };
  }
  current.push(now);
  buckets.set(key, current);
  return { allowed: true };
}
