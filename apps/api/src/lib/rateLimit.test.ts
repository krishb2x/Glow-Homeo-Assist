import { describe, expect, it } from "vitest";
import { checkRateLimit, clientKey } from "./rateLimit";
import type { Request } from "express";

describe("checkRateLimit", () => {
  it("allows requests under the limit", async () => {
    const key = `unit-allow-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit(key, 60_000, 10);
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks when limit exceeded", async () => {
    const key = `unit-block-${Date.now()}-${Math.random()}`;
    const max = 3;
    for (let i = 0; i < max; i++) {
      await checkRateLimit(key, 60_000, max);
    }
    const r = await checkRateLimit(key, 60_000, max);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.retryAfterSec).toBeGreaterThan(0);
    }
  });
});

describe("clientKey", () => {
  it("includes user id when present", () => {
    const req = {
      ip: "127.0.0.1",
      headers: {},
      socket: {},
      user: { userId: "doc-1" }
    } as unknown as Request;
    expect(clientKey(req, "api")).toContain("doc-1");
  });
});
