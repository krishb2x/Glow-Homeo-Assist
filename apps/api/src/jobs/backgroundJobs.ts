import type { SupabaseClient } from "@supabase/supabase-js";
import { purgeExpiredAudioSessions, processDueNotificationJobs } from "../modules/encounters/v2EncountersService";
import { processAppointmentReminderJobs } from "../modules/telemedicine/appointmentReminders";
import { logger } from "../lib/logger";

const HOUR_MS = 60 * 60 * 1000;
const NOTIFICATION_POLL_MS = 60 * 1000;
const WHATSAPP_POLL_MS = 30 * 1000;

/**
 * Multi-topic worker pollers — use SKIP LOCKED RPC when migration applied.
 * Set WORKER_MODE=whatsapp-only | notifications-only | all (default all on single node).
 */
export function startBackgroundJobs(admin: SupabaseClient): void {
  const mode = process.env.WORKER_MODE ?? "all";
  const batchLimit = Number(process.env.NOTIFICATION_BATCH_LIMIT ?? "50");
  const whatsappBatch = Number(process.env.WHATSAPP_BATCH_LIMIT ?? "30");

  const runPurge = (): void => {
    void purgeExpiredAudioSessions(admin).catch((e) => {
      logger.warn("background_audio_purge_error", {
        message: e instanceof Error ? e.message : String(e)
      });
    });
  };

  const runGeneralNotifications = (): void => {
    void processDueNotificationJobs(admin, batchLimit, [
      "prescription_delivery_email",
      "prescription_delivery_whatsapp",
      "follow_up_reminder",
      "appointment_invite_email",
      "appointment_invite_whatsapp",
      "appointment_reminder_whatsapp",
      "consultation_summary_email",
      "consultation_summary_whatsapp"
    ]).catch((e) => {
      logger.warn("background_notification_poll_error", {
        message: e instanceof Error ? e.message : String(e)
      });
    });
  };

  const runWhatsAppBroadcasts = (): void => {
    void processDueNotificationJobs(admin, whatsappBatch, ["whatsapp_broadcast"]).catch((e) => {
      logger.warn("background_whatsapp_poll_error", {
        message: e instanceof Error ? e.message : String(e)
      });
    });
  };

  setTimeout(runPurge, 30_000);
  setInterval(runPurge, HOUR_MS);

  if (mode === "all" || mode === "notifications-only") {
    setTimeout(runGeneralNotifications, 15_000);
    setInterval(runGeneralNotifications, NOTIFICATION_POLL_MS);
  }

  if (mode === "all" || mode === "whatsapp-only") {
    setTimeout(runWhatsAppBroadcasts, 20_000);
    setInterval(runWhatsAppBroadcasts, WHATSAPP_POLL_MS);
  }

  const runTelemedicineReminders = (): void => {
    void processAppointmentReminderJobs(admin, batchLimit).catch((e) => {
      logger.warn("background_telemedicine_reminder_error", {
        message: e instanceof Error ? e.message : String(e)
      });
    });
  };
  setTimeout(runTelemedicineReminders, 25_000);
  setInterval(runTelemedicineReminders, NOTIFICATION_POLL_MS);

  logger.info("background_jobs_started", {
    mode,
    audioPurgeIntervalMs: HOUR_MS,
    notificationPollIntervalMs: NOTIFICATION_POLL_MS,
    whatsappPollIntervalMs: WHATSAPP_POLL_MS,
    batchLimit,
    whatsappBatch
  });
}
