import crypto from "crypto";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { verifyResendWebhookSignature } from "./resendWebhookHandler";

describe("verifyResendWebhookSignature", () => {
  const prev = process.env.RESEND_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = "test-secret";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = prev;
  });

  it("accepts valid v1 signature", () => {
    const id = "msg_123";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ type: "email.delivered", data: { email_id: "re_1" } });
    const signedContent = `${id}.${timestamp}.${body}`;
    const sig = crypto.createHmac("sha256", Buffer.from("test-secret")).update(signedContent).digest("base64");

    expect(
      verifyResendWebhookSignature(body, {
        id,
        timestamp,
        signature: `v1,${sig}`
      })
    ).toBe(true);
  });

  it("rejects tampered body", () => {
    const id = "msg_123";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ type: "email.delivered" });
    const signedContent = `${id}.${timestamp}.${body}`;
    const sig = crypto.createHmac("sha256", Buffer.from("test-secret")).update(signedContent).digest("base64");

    expect(
      verifyResendWebhookSignature(`${body} `, {
        id,
        timestamp,
        signature: `v1,${sig}`
      })
    ).toBe(false);
  });
});
