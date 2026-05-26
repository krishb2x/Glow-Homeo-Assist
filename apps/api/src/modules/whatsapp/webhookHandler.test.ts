import { afterEach, beforeEach, describe, expect, it } from "vitest";
import crypto from "crypto";
import { verifyMetaWebhook, verifyMetaWebhookSignature } from "./webhookHandler";

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

describe("verifyMetaWebhookSignature", () => {
  const prevSecret = process.env.META_APP_SECRET;

  beforeEach(() => {
    process.env.META_APP_SECRET = "test-app-secret";
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = prevSecret;
  });

  it("accepts valid sha256 HMAC", () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig =
      "sha256=" + crypto.createHmac("sha256", "test-app-secret").update(body).digest("hex");
    expect(verifyMetaWebhookSignature(body, sig)).toBe(true);
  });

  it("rejects tampered body", () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig =
      "sha256=" + crypto.createHmac("sha256", "test-app-secret").update(body).digest("hex");
    expect(verifyMetaWebhookSignature(body + " ", sig)).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(verifyMetaWebhookSignature("{}", undefined)).toBe(false);
  });
});
