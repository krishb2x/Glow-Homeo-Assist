import { logger } from "../../lib/logger";

export type MetaSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  provider: "meta_cloud";
};

const GRAPH = "https://graph.facebook.com/v21.0";

function graphToken(accessToken: string): string {
  return accessToken.trim();
}

/** Send a session text message (within 24h customer care window). */
export async function sendMetaTextMessage(args: {
  phoneNumberId: string;
  accessToken: string;
  toPhoneE164: string;
  body: string;
}): Promise<MetaSendResult> {
  const to = args.toPhoneE164.replace(/\D/g, "");
  if (!to) return { ok: false, error: "Invalid phone", provider: "meta_cloud" };

  try {
    const res = await fetch(`${GRAPH}/${args.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${graphToken(args.accessToken)}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body: args.body.slice(0, 4096) }
      })
    });
    const json = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };
    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? `Meta API ${res.status}`,
        provider: "meta_cloud"
      };
    }
    return { ok: true, messageId: json.messages?.[0]?.id, provider: "meta_cloud" };
  } catch (e) {
    logger.warn("meta_whatsapp_send_failed", { message: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: e instanceof Error ? e.message : "Send failed", provider: "meta_cloud" };
  }
}

/** Send using an approved template name (required for marketing outside session). */
export async function sendMetaTemplateMessage(args: {
  phoneNumberId: string;
  accessToken: string;
  toPhoneE164: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
}): Promise<MetaSendResult> {
  const to = args.toPhoneE164.replace(/\D/g, "");
  if (!to) return { ok: false, error: "Invalid phone", provider: "meta_cloud" };

  const components =
    args.bodyParameters && args.bodyParameters.length > 0
      ? [
          {
            type: "body",
            parameters: args.bodyParameters.map((text) => ({ type: "text", text: text.slice(0, 1024) }))
          }
        ]
      : undefined;

  try {
    const res = await fetch(`${GRAPH}/${args.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${graphToken(args.accessToken)}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: args.templateName,
          language: { code: args.languageCode },
          ...(components ? { components } : {})
        }
      })
    });
    const json = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };
    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? `Meta API ${res.status}`,
        provider: "meta_cloud"
      };
    }
    return { ok: true, messageId: json.messages?.[0]?.id, provider: "meta_cloud" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed", provider: "meta_cloud" };
  }
}

/** Verify credentials against Meta (fetch phone number metadata). */
export async function verifyMetaConnection(args: {
  phoneNumberId: string;
  accessToken: string;
}): Promise<{ ok: boolean; displayPhone?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH}/${args.phoneNumberId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${graphToken(args.accessToken)}` }
    });
    const json = (await res.json()) as {
      display_phone_number?: string;
      verified_name?: string;
      error?: { message: string };
    };
    if (!res.ok) {
      return { ok: false, error: json.error?.message ?? `Meta ${res.status}` };
    }
    return {
      ok: true,
      displayPhone: json.display_phone_number ?? json.verified_name
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Verification failed" };
  }
}
