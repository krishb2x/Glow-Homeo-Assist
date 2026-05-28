import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { isMissingDbObjectError } from "../../lib/dbErrors";
import { processDueNotificationJobsSafe } from "../jobs/jobQueue";
import { PATIENT_NOTIFICATION_TOPICS } from "./types";
import { enqueuePatientPushJob } from "./patientNotificationEnqueue";
import { activeReminderSlot, isQuietHours } from "./patientReminderLogic";

export const PATIENT_PUSH_TOPICS = Object.values(PATIENT_NOTIFICATION_TOPICS);

export async function processPatientPushJobs(admin: SupabaseClient, limit = 30): Promise<number> {
  return processDueNotificationJobsSafe(admin, limit, PATIENT_PUSH_TOPICS);
}

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Scans patients with push enabled and enqueues medication/diet reminders for the current window.
 * Run on a 15-minute interval from the background worker.
 */
export async function schedulePatientReminderJobs(admin: SupabaseClient): Promise<number> {
  const now = new Date();

  const { data: settingsRows, error } = await admin
    .from("patient_app_settings")
    .select("patient_id,channels,reminder_times,quiet_hours");

  if (error) {
    if (!isMissingDbObjectError(error)) {
      logger.warn("patient_reminder_settings_load_failed", { message: error.message });
    }
    return 0;
  }

  let enqueued = 0;

  for (const row of settingsRows ?? []) {
    const s = row as {
      patient_id: string;
      channels: { push?: boolean };
      reminder_times: Record<string, string>;
      quiet_hours: { start?: string; end?: string };
    };

    if (s.channels?.push === false) continue;
    if (isQuietHours(s.quiet_hours ?? {}, now)) continue;

    const slot = activeReminderSlot(s.reminder_times ?? {}, now);
    if (!slot) continue;

    const { data: patient } = await admin
      .from("patients")
      .select("clinic_id")
      .eq("id", s.patient_id)
      .maybeSingle();
    if (!patient) continue;

    const clinicId = (patient as { clinic_id: string }).clinic_id;
    const dateKey = utcDateKey(now);

    const medKey = `patient:${s.patient_id}:med:${dateKey}:${slot}`;
    const medId = await enqueuePatientPushJob(admin, {
      clinicId,
      patientId: s.patient_id,
      topic: PATIENT_NOTIFICATION_TOPICS.medicationReminder,
      idempotencyKey: medKey,
      payload: { slot, deepLink: "homeoassist://today" }
    });
    if (medId) enqueued += 1;

    if (slot === "morning") {
      const dietKey = `patient:${s.patient_id}:diet:${dateKey}`;
      const dietId = await enqueuePatientPushJob(admin, {
        clinicId,
        patientId: s.patient_id,
        topic: PATIENT_NOTIFICATION_TOPICS.dietReminder,
        idempotencyKey: dietKey,
        payload: { deepLink: "homeoassist://today" }
      });
      if (dietId) enqueued += 1;
    }
  }

  return enqueued;
}
