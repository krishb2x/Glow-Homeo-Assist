import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPrescriptionEmail } from "../distribution/notificationProviders";
import { isValidEmailAddress, normalizeEmailAddress } from "../distribution/emailLayout";
import type { NotificationJobRow } from "../distribution/types";

export type EmailDeliveryResult = {
  ok: boolean;
  error?: string;
  messageId?: string;
};

export async function deliverQueuedEmail(
  job: NotificationJobRow,
  payload: Record<string, unknown>
): Promise<EmailDeliveryResult> {
  const rawTo = String(payload.to ?? "");
  if (!rawTo || !isValidEmailAddress(rawTo)) {
    return { ok: false, error: "Invalid recipient email address" };
  }

  const result = await sendPrescriptionEmail({
    to: normalizeEmailAddress(rawTo),
    subject: String(payload.subject ?? "Notification"),
    html: String(payload.html ?? ""),
    text: String(payload.text ?? ""),
    tags: [
      { name: "topic", value: job.topic.slice(0, 50) },
      { name: "clinic_id", value: job.clinic_id.slice(0, 50) }
    ]
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, messageId: result.messageId };
}

export async function persistEmailProviderMessageId(
  admin: SupabaseClient,
  job: NotificationJobRow,
  messageId: string | undefined
): Promise<void> {
  if (!messageId) return;
  const payload = { ...(job.payload ?? {}), provider_message_id: messageId };
  await admin.from("notification_jobs").update({ payload }).eq("id", job.id);
}
