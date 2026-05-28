import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationJobRow } from "../distribution/types";
import { sendExpoPush } from "./patientExpoPush";
import { patientPushCopy } from "./patientPushTemplates";
import { PATIENT_TOPIC_PREFIX } from "./types";

export function isPatientPushTopic(topic: string): boolean {
  return topic.startsWith(PATIENT_TOPIC_PREFIX);
}

export async function processPatientPushJob(
  admin: SupabaseClient,
  job: NotificationJobRow
): Promise<boolean> {
  if (!isPatientPushTopic(job.topic) || job.channel !== "push") {
    return false;
  }
  if (!job.patient_id) return false;

  const { data: tokens, error } = await admin
    .from("patient_push_tokens")
    .select("token")
    .eq("patient_id", job.patient_id);

  if (error || !tokens?.length) {
    return false;
  }

  const payload = job.payload ?? {};
  const copy = patientPushCopy(job.topic, payload);
  const dataPayload: Record<string, unknown> = {
    type: job.topic.replace(PATIENT_TOPIC_PREFIX, ""),
    deepLink: copy.deepLink,
    ...payload
  };

  const messages = (tokens as { token: string }[]).map((row) => ({
    to: row.token,
    title: copy.title,
    body: copy.body,
    channelId: copy.channelId,
    sound: "default" as const,
    priority: "high" as const,
    data: dataPayload
  }));

  const result = await sendExpoPush(messages);
  return result.ok;
}
