import type express from "express";
import { z } from "zod";
import type { AuthClaims } from "../../auth";
import { authRequired, requireAppRoles } from "../../auth";
import { getDb } from "../../db";
import { resolveClinicScope } from "../../lib/clinicScope";
import { jsonError, jsonSuccess } from "../../lib/apiEnvelope";
import { jsonErrorDb } from "../../lib/safeError";
import {
  createDoctorMemo,
  getMemoSummary,
  listDoctorMemos,
  patchDoctorMemo
} from "./memoService";
import { CreateMemoBodySchema, PatchMemoBodySchema, MemoStatusSchema } from "./types";

const ListStatusSchema = MemoStatusSchema.or(z.literal("all"));

export function registerMemoRoutes(app: express.Express): void {
  app.get(
    "/doctor/memos",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const statusParsed = ListStatusSchema.safeParse(req.query.status ?? "open");
      const status = statusParsed.success ? statusParsed.data : ("open" as const);
      try {
        const items = await listDoctorMemos(getDb(claims), clinicId, claims, {
          patientId: typeof req.query.patientId === "string" ? req.query.patientId : undefined,
          consultationId:
            typeof req.query.consultationId === "string" ? req.query.consultationId : undefined,
          status,
          urgentOnly: req.query.urgentOnly === "true",
          limit: Number(req.query.limit) || 40
        });
        jsonSuccess(res, 200, { items });
      } catch (e) {
        jsonErrorDb(res, "memos_list", e);
      }
    }
  );

  app.get(
    "/doctor/memos/summary",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      try {
        const summary = await getMemoSummary(getDb(claims), clinicId, claims);
        jsonSuccess(res, 200, summary);
      } catch (e) {
        jsonErrorDb(res, "memos_summary", e);
      }
    }
  );

  app.post(
    "/doctor/memos",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = CreateMemoBodySchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      try {
        const memo = await createDoctorMemo(getDb(claims), clinicId, claims, {
          body: parsed.data.body,
          kind: parsed.data.kind,
          patientId: parsed.data.patientId,
          consultationId: parsed.data.consultationId,
          dueAt: parsed.data.dueAt,
          priority: parsed.data.priority,
          pinned: parsed.data.pinned
        });
        jsonSuccess(res, 201, memo);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("dueAt is required") || msg.includes("not found")) {
          jsonError(res, 400, msg, { code: "VALIDATION_ERROR" });
          return;
        }
        jsonErrorDb(res, "memos_create", e);
      }
    }
  );

  app.patch(
    "/doctor/memos/:id",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = PatchMemoBodySchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      try {
        const memoId = String(req.params.id ?? "");
        const memo = await patchDoctorMemo(getDb(claims), clinicId, claims, memoId, {
          body: parsed.data.body,
          kind: parsed.data.kind,
          dueAt: parsed.data.dueAt,
          priority: parsed.data.priority,
          pinned: parsed.data.pinned,
          status: parsed.data.status
        });
        jsonSuccess(res, 200, memo);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "Forbidden") {
          jsonError(res, 403, msg, { code: "FORBIDDEN" });
          return;
        }
        if (msg === "Memo not found") {
          jsonError(res, 404, msg, { code: "NOT_FOUND" });
          return;
        }
        if (msg.includes("dueAt is required")) {
          jsonError(res, 400, msg, { code: "VALIDATION_ERROR" });
          return;
        }
        jsonErrorDb(res, "memos_patch", e);
      }
    }
  );
}
