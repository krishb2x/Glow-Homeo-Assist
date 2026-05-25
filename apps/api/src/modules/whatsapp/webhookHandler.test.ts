import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyMetaWebhook } from "./webhookHandler";

describe("verifyMetaWebhook", () => {
  const prev = process.env.META_WEBHOOK_VERIFY_TOKEN;

  beforeEach(() => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = "test-verify-token";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    else process.env.META_WEBHOOK_VERIFY_TOKEN = prev;
  });

  it("returns challenge when token matches", () => {
    expect(verifyMetaWebhook("subscribe", "test-verify-token", "challenge-123")).toBe("challenge-123");
  });

  it("returns null for wrong token", () => {
    expect(verifyMetaWebhook("subscribe", "wrong", "challenge-123")).toBeNull();
  });

  it("returns null for non-subscribe mode", () => {
    expect(verifyMetaWebhook("other", "test-verify-token", "x")).toBeNull();
  });
});
