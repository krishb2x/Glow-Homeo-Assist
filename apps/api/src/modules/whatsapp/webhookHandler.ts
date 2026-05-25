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

      if (change.field === "message_template_status_update") {
        logger.info("whatsapp_template_status", {
          name: value.message_template_name,
          reason: value.reason
        });
      }
    }
  }
}
