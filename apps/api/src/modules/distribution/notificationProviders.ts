import {
  sendTransactionalEmail,
  type ChannelSendResult,
  type SendEmailInput
} from "./emailLayout";
import { logger } from "../../lib/logger";

export type { SendEmailInput, ChannelSendResult };
export { isValidEmailAddress, normalizeEmailAddress } from "./emailLayout";

/** Normalize to E.164-ish for Twilio (India default +91). */
export function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return `+${digits}`;
}

export async function sendPrescriptionEmail(input: SendEmailInput): Promise<ChannelSendResult> {
  return sendTransactionalEmail(input);
}

export type SendWhatsAppInput = {
  toPhone: string;
  body: string;
};

function whatsAppMockEnabled(): boolean {
  return process.env.NOTIFICATION_MOCK_SEND === "true" || process.env.NODE_ENV !== "production";
}

export async function sendPrescriptionWhatsApp(input: SendWhatsAppInput): Promise<ChannelSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  const to = normalizePhoneE164(input.toPhone);
  if (!to) return { ok: false, error: "Invalid patient phone number" };

  if (process.env.NOTIFICATION_MOCK_SEND === "true") {
    logger.info("notification_whatsapp_mock", { to, preview: input.body.slice(0, 120) });
    return { ok: true, provider: "mock", mock: true };
  }

  if (!sid || !token || !from) {
    if (whatsAppMockEnabled()) {
      logger.info("notification_whatsapp_mock", { to, preview: input.body.slice(0, 120) });
      return { ok: true, provider: "mock", mock: true };
    }
    return { ok: false, error: "Twilio WhatsApp not configured" };
  }

  const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const whatsappFrom = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        From: whatsappFrom,
        To: whatsappTo,
        Body: input.body
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true, provider: "twilio" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
