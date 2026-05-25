import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { recordQueueMetric, startSpan } from "../../lib/observability";
import { isRetryableError } from "../../lib/errors";
import { processNotificationJob } from "../distribution/prescriptionDistribution";
import type { NotificationJobRow } from "../distribution/types";
import { computeBackoffMs, DEFAULT_MAX_ATTEMPTS, shouldDeadLetter } from "./jobQueue.logic";

function workerId(): string {
  return process.env.WORKER_ID ?? `api-${process.pid}`;
}

/**
 * Claims jobs with FOR UPDATE SKIP LOCKED (Postgres RPC) — safe for multiple API/worker replicas.
 */
export async function claimDueJobs(
  admin: SupabaseClient,
  limit: number,
  topics?: string[]
): Promise<NotificationJobRow[]> {
  const { data, error } = await admin.rpc("claim_notification_jobs", {
    p_worker_id: workerId(),
    p_limit: limit,
    p_topics: topics?.length ? topics : null
  });
  if (error) {
    logger.warn("claim_notification_jobs_failed", { message: error.message });
    return [];
  }
  const rows = (data ?? []) as NotificationJobRow[];
  if (rows.length > 0) {
    recordQueueMetric(topics?.[0] ?? "all", "claimed", rows.length);
  }
  return rows;
}

async function releaseJob(
  admin: SupabaseClient,
  job: NotificationJobRow,
  ok: boolean,
  errMsg?: string
): Promise<void> {
  const attempts = job.attempts;
  const maxAttempts = (job as { max_attempts?: number }).max_attempts ?? DEFAULT_MAX_ATTEMPTS;

  if (ok) {
    await admin
      .from("notification_jobs")
      .update({
        status: "SENT",
        sent_at: new Date().toISOString(),
        last_error: null,
        locked_at: null,
        locked_by: null
      })
      .eq("id", job.id);
    return;
  }

  const dead = shouldDeadLetter(attempts, maxAttempts, errMsg);

  if (dead) {
    await admin
      .from("notification_jobs")
      .update({
        status: "DEAD_LETTER",
        last_error: errMsg ?? "max_attempts",
        locked_at: null,
        locked_by: null
      })
      .eq("id", job.id);
    recordQueueMetric(job.topic, "dead_letter", 1);
    return;
  }

  const next = new Date(Date.now() + computeBackoffMs(attempts)).toISOString();
  await admin
    .from("notification_jobs")
    .update({
      status: "QUEUED",
      last_error: errMsg ?? "send_failed",
      next_retry_at: next,
      scheduled_for: next,
      locked_at: null,
      locked_by: null
    })
    .eq("id", job.id);
}

/**
 * Process claimed jobs — idempotent sends rely on idempotency_key + delivery row updates.
 */
export async function processClaimedJobs(
  admin: SupabaseClient,
  jobs: NotificationJobRow[]
): Promise<number> {
  const span = startSpan("process_claimed_jobs", { count: jobs.length });
  let okCount = 0;

  for (const job of jobs) {
    try {
      const ok = await processNotificationJob(admin, job, { skipJobStatusUpdate: true });
      await releaseJob(admin, job, ok, ok ? undefined : "send_failed");
      if (ok) {
        okCount += 1;
        recordQueueMetric(job.topic, "processed", 1);
      } else {
        recordQueueMetric(job.topic, "failed", 1);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await releaseJob(admin, job, false, msg);
      recordQueueMetric(job.topic, "failed", 1);
    }
  }

  span.end({ processed: okCount });
  return okCount;
}

export async function processDueNotificationJobsSafe(
  admin: SupabaseClient,
  limit: number,
  topics?: string[]
): Promise<number> {
  const jobs = await claimDueJobs(admin, limit, topics);
  if (jobs.length === 0) return 0;
  return processClaimedJobs(admin, jobs);
}
