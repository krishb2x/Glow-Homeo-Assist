import type { Request } from "express";

/**
 * In-memory rate limit for POST /public/marketing-lead (per client IP, rolling window).
 * For multi-instance production, move to Redis or a shared store.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.MARKETING_LEAD_MAX_PER_15M ?? "5");
const buckets = new Map<string, number[]>();

function prune(ts: number[], now: number): number[] {
  return ts.filter((t) => now - t < WINDOW_MS);
}

function clientKey(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  const fromHeader = Array.isArray(xf) ? xf[0] : typeof xf === "string" ? xf.split(",")[0] : null;
  const fromHeaderTrim = fromHeader?.trim();
  if (fromHeaderTrim) return fromHeaderTrim;
  if (req.ip) return req.ip;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  return "unknown";
}

export function checkMarketingLeadLimit(req: Request): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const key = clientKey(req);
  const current = prune(buckets.get(key) ?? [], now);
  if (current.length >= Math.max(1, MAX_REQUESTS)) {
    const oldest = current[0] ?? now;
    const retryAfterSec = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  current.push(now);
  buckets.set(key, current);
  return { allowed: true };
}
