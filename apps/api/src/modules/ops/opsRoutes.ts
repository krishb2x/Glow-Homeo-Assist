import type express from "express";
import { z } from "zod";
import type { AuthClaims } from "../../auth";
import { authRequired, requireAppRoles } from "../../auth";
import { supabaseAdmin } from "../../supabase";
import { resolveClinicScope } from "../../lib/clinicScope";
import { jsonSuccess, jsonError } from "../../lib/apiEnvelope";
import { getWorkerHeartbeats } from "../../lib/workerHeartbeat";
import { getIntegrationHealth } from "../../lib/integrationConfig";

export function registerOpsRoutes(app: express.Express): void {
  /** Deep health — DB ping, worker heartbeats, queue depth, integration config. */
  app.get("/health/deep", async (_req, res) => {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};
    let ok = true;

    try {
      const { error } = await supabaseAdmin
        .from("clinics")
        .select("id", { count: "exact", head: true })
        .limit(0);
      checks.database = { ok: !error, detail: error?.message };
      if (error) ok = false;
    } catch (e) {
      checks.database = { ok: false, detail: e instanceof Error ? e.message : String(e) };
      ok = false;
    }

    const { count: dlqCount } = await supabaseAdmin
      .from("notification_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "DEAD_LETTER");
    checks.notificationDeadLetter = {
      ok: (dlqCount ?? 0) < 50,
      detail: `${dlqCount ?? 0} dead-letter jobs`
    };
    if ((dlqCount ?? 0) >= 50) ok = false;

    const integrations = getIntegrationHealth();
    for (const [name, check] of Object.entries(integrations)) {
      checks[`integration_${name}`] = { ok: check.ok, detail: check.detail };
      if (check.required && !check.ok) ok = false;
    }

    const workers = getWorkerHeartbeats();
    const staleWorkers = Object.entries(workers).filter(([, w]) => w.stale);
    checks.workers = {
      ok: staleWorkers.length === 0,
      detail: staleWorkers.length ? `stale: ${staleWorkers.map(([n]) => n).join(", ")}` : "ok"
    };

    jsonSuccess(res, ok ? 200 : 503, {
      ok,
      service: "homeosync-api",
      checks,
      integrations,
      workers,
      timestamp: new Date().toISOString()
    });
  });

  /** List dead-letter notification jobs for clinic ops review. */
  app.get(
    "/doctor/ops/dead-letter-jobs",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const { data, error } = await supabaseAdmin
        .from("notification_jobs")
        .select("id,topic,channel,status,last_error,created_at,patient_id,payload")
        .eq("clinic_id", clinicId)
        .eq("status", "DEAD_LETTER")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        jsonError(res, 500, "Could not load dead-letter jobs", { code: "DB_ERROR" });
        return;
      }
      jsonSuccess(res, 200, { jobs: data ?? [] });
    }
  );

  /** Re-queue a dead-letter job for retry. */
  app.post(
    "/doctor/ops/dead-letter-jobs/:id/retry",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }

      const { data: row } = await supabaseAdmin
        .from("notification_jobs")
        .select("id,status")
        .eq("id", id.data)
        .eq("clinic_id", clinicId)
        .eq("status", "DEAD_LETTER")
        .maybeSingle();

      if (!row) {
        jsonError(res, 404, "Job not found", { code: "NOT_FOUND" });
        return;
      }

      const now = new Date().toISOString();
      await supabaseAdmin
        .from("notification_jobs")
        .update({
          status: "QUEUED",
          scheduled_for: now,
          next_retry_at: now,
          last_error: null,
          locked_at: null,
          locked_by: null
        })
        .eq("id", id.data);

      jsonSuccess(res, 200, { id: id.data, status: "QUEUED" });
    }
  );
}
