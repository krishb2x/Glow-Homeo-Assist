import type { SupabaseClient } from "@supabase/supabase-js";
import { purgeExpiredAudioSessions, processDueNotificationJobs } from "../modules/encounters/v2EncountersService";
import { logger } from "../lib/logger";

const HOUR_MS = 60 * 60 * 1000;
const NOTIFICATION_POLL_MS = 60 * 1000;

/**
 * Fly.io scheduled-machine equivalent for dev/single-node deploys.
 * Audio purge hourly; notification jobs polled every minute.
 */
export function startBackgroundJobs(admin: SupabaseClient): void {
  const runPurge = (): void => {
    void purgeExpiredAudioSessions(admin).catch((e) => {
      logger.warn("background_audio_purge_error", {
        message: e instanceof Error ? e.message : String(e)
      });
    });
  };

  const runNotifications = (): void => {
    void processDueNotificationJobs(admin).catch((e) => {
      logger.warn("background_notification_poll_error", {
        message: e instanceof Error ? e.message : String(e)
      });
    });
  };

  setTimeout(runPurge, 30_000);
  setInterval(runPurge, HOUR_MS);

  setTimeout(runNotifications, 15_000);
  setInterval(runNotifications, NOTIFICATION_POLL_MS);

  logger.info("background_jobs_started", {
    audioPurgeIntervalMs: HOUR_MS,
    notificationPollIntervalMs: NOTIFICATION_POLL_MS
  });
}
