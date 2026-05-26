import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { processDueNotificationJobsSafe } from "../jobs/jobQueue";

/**
 * Marks appointment reminder columns when reminder jobs complete (called from notification worker).
 */
export async function markAppointmentReminderSent(
  admin: SupabaseClient,
  appointmentId: string,
  window: "24h" | "1h"
): Promise<void> {
  const col = window === "24h" ? "reminder_24h_sent_at" : "reminder_1h_sent_at";
  await admin
    .from("appointments")
    .update({ [col]: new Date().toISOString() })
    .eq("id", appointmentId);
}

export async function processAppointmentReminderJobs(admin: SupabaseClient, limit = 30): Promise<number> {
  return processDueNotificationJobsSafe(admin, limit, [
    "appointment_invite_email",
    "appointment_invite_whatsapp",
    "appointment_reminder_whatsapp",
    "appointment_reminder_email",
    "consultation_summary_email",
    "consultation_summary_whatsapp",
    "consultation_missed_email",
    "follow_up_reminder_email"
  ]);
}
