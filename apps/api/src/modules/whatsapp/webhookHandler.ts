import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { recordBroadcastMetric } from "../../lib/observability";

type MetaWebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp?: string;
          recipient_id?: string;
        }>;
        messages?: unknown[];
        event?: string;
        message_template_id?: string;
        message_template_name?: string;
        reason?: string;
      };
    }>;
  }>;
};

export function verifyMetaWebhook(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined
): string | null {
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return challenge;
  }
  return null;
}

/** Verify Meta `X-Hub-Signature-256` HMAC (sha256=<hex>). */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined
): boolean {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret || !signatureHeader?.trim()) return false;
  const header = signatureHeader.trim();
  if (!header.startsWith("sha256=")) return false;
  const provided = header.slice("sha256=".length);
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

/** In production, signature verification is required when META_APP_SECRET is set. */
export function shouldRequireMetaWebhookSignature(): boolean {
  const isProd = process.env.NODE_ENV === "production";
  return isProd && Boolean(process.env.META_APP_SECRET?.trim());
}

/**
 * Process Meta Cloud API webhooks: delivery, read, failed, template status.
 */
export async function handleMetaWebhook(admin: SupabaseClient, body: MetaWebhookBody): Promise<void> {
  for (const entry of body.entry ?? []) {
    const wabaId = entry.id;
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      await admin.from("whatsapp_webhook_events").insert({
        waba_id: wabaId ?? null,
        event_type: change.field ?? "unknown",
        provider_id: value.message_template_id ?? null,
        payload: value as Record<string, unknown>
      });

      if (change.field === "messages" && value.statuses) {
        for (const st of value.statuses) {
          const status = st.status;
          const msgId = st.id;
          const { data: delivery } = await admin
            .from("whatsapp_broadcast_deliveries")
            .select("id,broadcast_id,status")
            .eq("provider_message_id", msgId)
            .maybeSingle();

          if (!delivery) continue;
          const d = delivery as { id: string; broadcast_id: string; status: string };
          const patch: Record<string, unknown> = {};
          if (status === "delivered") {
            patch.status = "delivered";
            patch.delivered_at = new Date().toISOString();
            recordBroadcastMetric(d.broadcast_id, "delivered");
          } else if (status === "read") {
            patch.status = "read";
            patch.read_at = new Date().toISOString();
            recordBroadcastMetric(d.broadcast_id, "read");
          } else if (status === "failed") {
            patch.status = "failed";
            patch.last_error = "provider_failed";
            recordBroadcastMetric(d.broadcast_id, "failed");
          }
          if (Object.keys(patch).length > 0) {
            await admin.from("whatsapp_broadcast_deliveries").update(patch).eq("id", d.id);
          }
        }
      }

      // Handle inbound messages
      if (change.field === "messages" && value.messages) {
         for (const msg of value.messages as any[]) {
            const fromPhone = msg.from;
            const phoneNumberId = (value as any).metadata?.phone_number_id;
            
            if (fromPhone && phoneNumberId) {
               const { data: conn } = await admin.from("whatsapp_connections")
                 .select("clinic_id, channel_type, access_token_encrypted, access_token")
                 .eq("phone_number_id", phoneNumberId)
                 .maybeSingle();
                 
               if (conn) {
                   if (conn.channel_type === 'AUTOMATED') {
                       // Automated Channel: Auto-reply or process interactive payload
                       import("./credentialVault").then(vault => {
                           const token = vault.decryptAccessToken(conn.access_token_encrypted, conn.access_token ?? "");
                           import("./metaCloudApi").then(api => {
                              api.sendMetaTextMessage({
                                 phoneNumberId,
                                 accessToken: token ?? "",
                                 toPhoneE164: fromPhone,
                                 body: "This WhatsApp number is used for automated updates only. To speak with your doctor, please use their clinical WhatsApp number."
                              }).catch(e => logger.warn("auto_reply_failed", { err: e.message }));
                           });
                       });
                   } else if (conn.channel_type === 'CLINICAL') {
                       // Clinical Channel: Route to Inbox
                       if (msg.type === "text" || msg.text) {
                           const bodyText = msg.text?.body ?? "Unsupported message";
                           // 1. Find patient
                           const { data: patient } = await admin.from("patients")
                             .select("id")
                             .eq("clinic_id", conn.clinic_id)
                             .or(`phone.eq.${fromPhone},phone.eq.+${fromPhone}`)
                             .maybeSingle();
                             
                           if (patient) {
                               // 2. Find or create conversation
                               let { data: conv } = await admin.from("conversations")
                                 .select("id")
                                 .eq("clinic_id", conn.clinic_id)
                                 .eq("patient_id", patient.id)
                                 .eq("context_type", "GENERAL")
                                 .maybeSingle();
                                 
                               if (!conv) {
                                   const { data: newConv } = await admin.from("conversations")
                                     .insert({ clinic_id: conn.clinic_id, patient_id: patient.id, context_type: "GENERAL" })
                                     .select("id")
                                     .single();
                                   conv = newConv;
                               }
                               
                               // 3. Insert message
                               if (conv) {
                                   await admin.from("messages").insert({
                                       conversation_id: conv.id,
                                       sender_type: "PATIENT",
                                       body: bodyText
                                   });
                               }
                           }
                       }
                   }
               }
            }
         }
      }

      if (change.field === "message_template_status_update") {
        logger.info("whatsapp_template_status", {
          name: value.message_template_name,
          reason: value.reason
        });
      }
    }
  }
}
