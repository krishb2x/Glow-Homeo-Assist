import type { Request, Response, NextFunction } from "express";
import { jsonError } from "./apiEnvelope";
import { logger } from "./logger";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

type BucketStore = {
  consume(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
};

/** In-memory sliding window (single-node dev). */
class MemoryStore implements BucketStore {
  private buckets = new Map<string, number[]>();

  async consume(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const current = (this.buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    if (current.length >= max) {
      const oldest = current[0] ?? now;
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
    }
    current.push(now);
    this.buckets.set(key, current);
    return { allowed: true };
  }
}

/** Redis sliding window via INCR + EXPIRE (multi-instance safe). */
class RedisStore implements BucketStore {
  constructor(private readonly redisUrl: string) {}

  private client: import("ioredis").default | null = null;

  private async getClient(): Promise<import("ioredis").default> {
    if (this.client) return this.client;
    const { default: Redis } = await import("ioredis");
    this.client = new Redis(this.redisUrl, { maxRetriesPerRequest: 2 });
    return this.client;
  }

  async consume(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    try {
      const redis = await this.getClient();
      const windowSec = Math.ceil(windowMs / 1000);
      const rk = `rl:${key}:${windowSec}`;
      const count = await redis.incr(rk);
      if (count === 1) await redis.expire(rk, windowSec);
      if (count > max) {
        const ttl = await redis.ttl(rk);
        return { allowed: false, retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec) };
      }
      return { allowed: true };
    } catch (e) {
      logger.warn("redis_rate_limit_fallback", {
        message: e instanceof Error ? e.message : String(e)
      });
      return memoryStore.consume(key, windowMs, max);
    }
  }
}

const memoryStore = new MemoryStore();

function resolveStore(): BucketStore {
  const url = process.env.REDIS_URL?.trim();
  if (url) return new RedisStore(url);
  return memoryStore;
}

let store: BucketStore | null = null;
function getStore(): BucketStore {
  if (!store) store = resolveStore();
  return store;
}

export function clientKey(req: Request, suffix?: string): string {
  const xf = req.headers["x-forwarded-for"];
  const fromHeader = Array.isArray(xf) ? xf[0] : typeof xf === "string" ? xf.split(",")[0] : null;
  const ip = fromHeader?.trim() || req.ip || req.socket?.remoteAddress || "unknown";
  const user = (req as Request & { user?: { userId?: string } }).user?.userId;
  return [suffix ?? "global", user ?? "anon", ip].join(":");
}

export async function checkRateLimit(
  key: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  return getStore().consume(key, windowMs, Math.max(1, max));
}

export function rateLimitMiddleware(opts: {
  keyPrefix: string;
  windowMs: number;
  max: number;
  keyExtra?: (req: Request) => string;
}): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const extra = opts.keyExtra?.(req) ?? "";
    const key = `${opts.keyPrefix}:${clientKey(req)}:${extra}`;
    void checkRateLimit(key, opts.windowMs, opts.max).then((r) => {
      if (!r.allowed) {
        res.setHeader("Retry-After", String(r.retryAfterSec));
        jsonError(res, 429, "Too many requests. Please try again shortly.", {
          code: "RATE_LIMITED",
          details: { retryAfterSec: r.retryAfterSec }
        });
        return;
      }
      next();
    });
  };
}

/** Doctor-scoped limiter for authenticated routes. */
export function doctorRateLimit(
  keyPrefix: string,
  maxPerMinute: number
): (req: Request, res: Response, next: NextFunction) => void {
  return rateLimitMiddleware({
    keyPrefix,
    windowMs: 60_000,
    max: maxPerMinute,
    keyExtra: (req) => {
      const claims = (req as Request & { user?: { userId?: string; clinicId?: string } }).user;
      return `${claims?.clinicId ?? "c"}:${claims?.userId ?? "u"}`;
    }
  });
}
