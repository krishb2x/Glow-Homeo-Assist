import type { SupabaseClient } from "@supabase/supabase-js";
import { processDueNotificationJobs } from "../modules/encounters/v2EncountersService";
import { processAppointmentReminderJobs } from "../modules/telemedicine/appointmentReminders";
import { processMissedConsultationJobs } from "../modules/telemedicine/missedConsultationJob";
import {
  processPatientPushJobs,
  schedulePatientReminderJobs
} from "../modules/patient/patientReminderJobs";
import { logger } from "../lib/logger";
import { recordWorkerRun } from "../lib/workerHeartbeat";

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

  const runGeneralNotifications = (): void => {
    void processDueNotificationJobs(admin, batchLimit, [
      "prescription_delivery_email",
      "prescription_delivery_whatsapp",
      "follow_up_reminder",
      "follow_up_reminder_email",
      "appointment_invite_email",
      "appointment_invite_whatsapp",
      "appointment_reminder_whatsapp",
      "appointment_reminder_email",
      "consultation_summary_email",
      "consultation_summary_whatsapp",
      "consultation_ready_whatsapp",
      "consultation_missed_whatsapp",
      "consultation_missed_email"
    ])
      .then(() => recordWorkerRun("notifications"))
      .catch((e) => {
        recordWorkerRun("notifications", e instanceof Error ? e.message : String(e));
        logger.warn("background_notification_poll_error", {
          message: e instanceof Error ? e.message : String(e)
        });
      });
  };

  const runWhatsAppBroadcasts = (): void => {
    void processDueNotificationJobs(admin, whatsappBatch, ["whatsapp_broadcast"])
      .then(() => recordWorkerRun("whatsapp_broadcast"))
      .catch((e) => {
        recordWorkerRun("whatsapp_broadcast", e instanceof Error ? e.message : String(e));
        logger.warn("background_whatsapp_poll_error", {
          message: e instanceof Error ? e.message : String(e)
        });
      });
  };

  if (mode === "all" || mode === "notifications-only") {
    setTimeout(runGeneralNotifications, 15_000);
    setInterval(runGeneralNotifications, NOTIFICATION_POLL_MS);
  }

  if (mode === "all" || mode === "whatsapp-only") {
    setTimeout(runWhatsAppBroadcasts, 20_000);
    setInterval(runWhatsAppBroadcasts, WHATSAPP_POLL_MS);
  }

  const runTelemedicineReminders = (): void => {
    void processAppointmentReminderJobs(admin, batchLimit)
      .then(() => recordWorkerRun("telemedicine_reminders"))
      .catch((e) => {
        recordWorkerRun("telemedicine_reminders", e instanceof Error ? e.message : String(e));
        logger.warn("background_telemedicine_reminder_error", {
          message: e instanceof Error ? e.message : String(e)
        });
      });
  };
  setTimeout(runTelemedicineReminders, 25_000);
  setInterval(runTelemedicineReminders, NOTIFICATION_POLL_MS);

  const runMissedConsultations = (): void => {
    void processMissedConsultationJobs(admin, batchLimit)
      .then(() => recordWorkerRun("missed_consultations"))
      .catch((e) => {
        recordWorkerRun("missed_consultations", e instanceof Error ? e.message : String(e));
        logger.warn("background_missed_consultation_error", {
          message: e instanceof Error ? e.message : String(e)
        });
      });
  };
  setTimeout(runMissedConsultations, 35_000);
  setInterval(runMissedConsultations, 15 * 60 * 1000);

  const runPatientPush = (): void => {
    void processPatientPushJobs(admin, batchLimit)
      .then(() => recordWorkerRun("patient_push"))
      .catch((e) => {
        recordWorkerRun("patient_push", e instanceof Error ? e.message : String(e));
        logger.warn("background_patient_push_error", {
          message: e instanceof Error ? e.message : String(e)
        });
      });
  };
  setTimeout(runPatientPush, 40_000);
  setInterval(runPatientPush, NOTIFICATION_POLL_MS);

  const runPatientReminderSchedule = (): void => {
    void schedulePatientReminderJobs(admin)
      .then((n) => {
        recordWorkerRun("patient_reminder_schedule");
        if (n > 0) {
          logger.info("patient_reminders_enqueued", { count: n });
        }
      })
      .catch((e) => {
        recordWorkerRun("patient_reminder_schedule", e instanceof Error ? e.message : String(e));
        logger.warn("background_patient_reminder_schedule_error", {
          message: e instanceof Error ? e.message : String(e)
        });
      });
  };
  setTimeout(runPatientReminderSchedule, 45_000);
  setInterval(runPatientReminderSchedule, 15 * 60 * 1000);

  logger.info("background_jobs_started", {
    mode,
    notificationPollIntervalMs: NOTIFICATION_POLL_MS,
    whatsappPollIntervalMs: WHATSAPP_POLL_MS,
    batchLimit,
    whatsappBatch
  });
}
