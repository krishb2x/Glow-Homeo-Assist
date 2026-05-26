import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { logger } from "../../lib/logger";

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    bounce?: { message?: string };
  };
};

function decodeSvixSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  if (trimmed.startsWith("whsec_")) {
    return Buffer.from(trimmed.slice(6), "base64");
  }
  return Buffer.from(trimmed, "utf8");
}

/** Resend webhooks are delivered via Svix — verify svix-* headers. */
export function verifyResendWebhookSignature(
  rawBody: string,
  headers: { id?: string; timestamp?: string; signature?: string }
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.abs(Date.now() / 1000 - ts);
  if (ageSec > 300) return false;

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const key = decodeSvixSecret(secret);
  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

  for (const part of signature.split(" ")) {
    const comma = part.indexOf(",");
    if (comma <= 0) continue;
    const version = part.slice(0, comma);
    const sig = part.slice(comma + 1);
    if (version !== "v1") continue;
    try {
      if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return true;
      }
    } catch {
      if (sig === expected) return true;
    }
  }
  return false;
}

export async function handleResendWebhook(
  admin: SupabaseClient,
  body: ResendWebhookEvent
): Promise<void> {
  const type = body.type ?? "unknown";
  const emailId = body.data?.email_id;
  if (!emailId) {
    logger.info("resend_webhook_no_email_id", { type });
    return;
  }

  if (type === "email.bounced" || type === "email.complained") {
    const { data: jobs } = await admin
      .from("notification_jobs")
      .select("id,payload,status")
      .eq("channel", "email")
      .filter("payload->>provider_message_id", "eq", emailId)
      .limit(5);

    for (const row of jobs ?? []) {
      const job = row as { id: string; status: string; payload?: Record<string, unknown> };
      if (job.status !== "SENT") continue;
      await admin
        .from("notification_jobs")
        .update({
          last_error: type === "email.bounced" ? "email_bounced" : "email_complained",
          payload: {
            ...(job.payload ?? {}),
            delivery_status: type,
            bounce_message: body.data?.bounce?.message ?? null
          }
        })
        .eq("id", job.id);
    }

    logger.warn("resend_email_delivery_issue", {
      type,
      emailId,
      to: body.data?.to?.[0],
      subject: body.data?.subject
    });
    return;
  }

  if (type === "email.delivered") {
    logger.info("resend_email_delivered", { emailId });
    return;
  }

  logger.info("resend_webhook_event", { type, emailId });
}
