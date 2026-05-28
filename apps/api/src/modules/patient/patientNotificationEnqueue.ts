import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { logger } from "../../lib/logger";
import { isMissingDbObjectError } from "../../lib/dbErrors";
import type { PatientNotificationTopic } from "./types";

export async function enqueuePatientPushJob(
  admin: SupabaseClient,
  args: {
    clinicId: string;
    patientId: string;
    topic: PatientNotificationTopic | string;
    payload?: Record<string, unknown>;
    idempotencyKey: string;
    scheduledFor?: string;
  }
): Promise<string | null> {
  const jobId = uuid();
  const { error } = await admin.from("notification_jobs").insert({
    id: jobId,
    clinic_id: args.clinicId,
    patient_id: args.patientId,
    channel: "push",
    topic: args.topic,
    payload: args.payload ?? {},
    idempotency_key: args.idempotencyKey,
    scheduled_for: args.scheduledFor ?? new Date().toISOString(),
    status: "QUEUED"
  });

  if (error) {
    if (error.code === "23505") return null;
    if (isMissingDbObjectError(error)) return null;
    logger.warn("patient_push_enqueue_failed", { topic: args.topic, message: error.message });
    return null;
  }
  return jobId;
}
