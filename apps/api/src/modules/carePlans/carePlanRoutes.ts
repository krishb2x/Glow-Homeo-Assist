import type express from "express";
import { z } from "zod";

function paramId(req: express.Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : id;
}
import { CarePlanMergeBodySchema, CarePlanMediaTypeSchema, CarePlanTemplateBodySchema } from "@homeoassist/domain";
import type { AuthClaims } from "../../auth";
import { authRequired, requireAppRoles } from "../../auth";
import { getDb } from "../../db";
import { resolveClinicScope } from "../../lib/clinicScope";
import { jsonError, jsonSuccess } from "../../lib/apiEnvelope";
import { jsonErrorDb } from "../../lib/safeError";
import {
  cloneCarePlanTemplate,
  createCarePlanMedia,
  createCarePlanTemplate,
  deleteCarePlanTemplate,
  getCarePlanTemplateDetail,
  listCarePlanMedia,
  listCarePlanTemplates,
  listRecentCarePlans,
  mergeCarePlansForConsultation,
  recordCarePlanUsage,
  resolveYouTubeMetadata,
  toggleCarePlanFavorite,
  updateCarePlanTemplate
} from "./carePlanService";

const YouTubeResolveSchema = z.object({ url: z.string().url().max(2000) });

const CreateMediaSchema = z.object({
  mediaType: CarePlanMediaTypeSchema,
  sourceUrl: z.string().url().max(2000),
  title: z.string().max(500).optional(),
  description: z.string().max(4000).optional(),
  isShared: z.boolean().optional()
});

export function registerCarePlanRoutes(app: express.Express): void {
  app.get(
    "/doctor/care-plans",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      try {
        const items = await listCarePlanTemplates(getDb(claims), clinicId, claims.userId, {
          q: typeof req.query.q === "string" ? req.query.q : undefined,
          category: typeof req.query.category === "string" ? req.query.category : undefined,
          diseaseTag: typeof req.query.diseaseTag === "string" ? req.query.diseaseTag : undefined,
          status: typeof req.query.status === "string" ? req.query.status : undefined,
          favoritesOnly: req.query.favoritesOnly === "true",
          limit: Number(req.query.limit) || 100
        });
        jsonSuccess(res, 200, { items });
      } catch (e) {
        jsonErrorDb(res, "care_plans_list", e);
      }
    }
  );

  app.get(
    "/doctor/care-plans/recent",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      try {
        const recent = await listRecentCarePlans(getDb(claims), claims.userId, 12);
        const ids = recent.map((r) => (r as { template_id: string }).template_id);
        const items = await listCarePlanTemplates(getDb(claims), clinicId, claims.userId, {
          limit: 200
        });
        const order = new Map(ids.map((id, i) => [id, i]));
        const sorted = items
          .filter((t) => order.has(t.id))
          .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
        jsonSuccess(res, 200, { items: sorted });
      } catch (e) {
        jsonErrorDb(res, "care_plans_recent", e);
      }
    }
  );

  app.post(
    "/doctor/care-plans/merge",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const parsed = CarePlanMergeBodySchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      try {
        const result = await mergeCarePlansForConsultation(
          getDb(claims),
          claims.userId,
          parsed.data.templateIds,
          parsed.data.blockTypes
        );
        for (const tid of parsed.data.templateIds) {
          await recordCarePlanUsage(getDb(claims), tid, claims.userId).catch(() => {});
        }
        jsonSuccess(res, 200, result);
      } catch (e) {
        jsonErrorDb(res, "care_plans_merge", e);
      }
    }
  );

  app.get(
    "/doctor/care-plans/:id",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      resolveClinicScope(req, claims, res);
      try {
        const detail = await getCarePlanTemplateDetail(
          getDb(claims),
          paramId(req),
          claims.userId
        );
        if (!detail) {
          jsonError(res, 404, "Care plan not found", { code: "NOT_FOUND" });
          return;
        }
        jsonSuccess(res, 200, detail);
      } catch (e) {
        jsonErrorDb(res, "care_plans_get", e);
      }
    }
  );

  app.post(
    "/doctor/care-plans",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = CarePlanTemplateBodySchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      try {
        const result = await createCarePlanTemplate(getDb(claims), clinicId, claims, parsed.data);
        jsonSuccess(res, 201, result);
      } catch (e) {
        jsonErrorDb(res, "care_plans_create", e);
      }
    }
  );

  app.patch(
    "/doctor/care-plans/:id",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      resolveClinicScope(req, claims, res);
      const parsed = CarePlanTemplateBodySchema.partial()
        .refine((b) => Object.keys(b).length > 0, { message: "Empty body" })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      try {
        await updateCarePlanTemplate(getDb(claims), paramId(req), claims, parsed.data);
        jsonSuccess(res, 200, { ok: true });
      } catch (e) {
        jsonErrorDb(res, "care_plans_patch", e);
      }
    }
  );

  app.delete(
    "/doctor/care-plans/:id",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      try {
        await deleteCarePlanTemplate(getDb(claims), paramId(req), claims.userId);
        jsonSuccess(res, 200, { ok: true });
      } catch (e) {
        jsonErrorDb(res, "care_plans_delete", e);
      }
    }
  );

  app.post(
    "/doctor/care-plans/:id/clone",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const title =
        typeof req.body?.title === "string" ? req.body.title : undefined;
      try {
        const result = await cloneCarePlanTemplate(
          getDb(claims),
          clinicId,
          claims,
          paramId(req),
          title
        );
        if (!result) {
          jsonError(res, 404, "Source plan not found", { code: "NOT_FOUND" });
          return;
        }
        jsonSuccess(res, 201, result);
      } catch (e) {
        jsonErrorDb(res, "care_plans_clone", e);
      }
    }
  );

  app.post(
    "/doctor/care-plans/:id/favorite",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const favorite = req.body?.favorite !== false;
      try {
        const result = await toggleCarePlanFavorite(
          getDb(claims),
          paramId(req),
          claims.userId,
          favorite
        );
        jsonSuccess(res, 200, result);
      } catch (e) {
        jsonErrorDb(res, "care_plans_favorite", e);
      }
    }
  );

  app.post(
    "/doctor/care-plans/:id/usage",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      try {
        await recordCarePlanUsage(getDb(claims), paramId(req), claims.userId);
        jsonSuccess(res, 200, { ok: true });
      } catch (e) {
        jsonErrorDb(res, "care_plans_usage", e);
      }
    }
  );

  app.get(
    "/doctor/care-plan-media",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      try {
        const items = await listCarePlanMedia(getDb(claims), clinicId, claims.userId);
        jsonSuccess(res, 200, { items });
      } catch (e) {
        jsonErrorDb(res, "care_plan_media_list", e);
      }
    }
  );

  app.post(
    "/doctor/care-plan-media",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = CreateMediaSchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      try {
        const item = await createCarePlanMedia(getDb(claims), clinicId, claims, parsed.data);
        jsonSuccess(res, 201, item);
      } catch (e) {
        jsonErrorDb(res, "care_plan_media_create", e);
      }
    }
  );

  app.post(
    "/doctor/care-plan-media/youtube-resolve",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const parsed = YouTubeResolveSchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid URL", { code: "VALIDATION_ERROR" });
        return;
      }
      try {
        const meta = await resolveYouTubeMetadata(parsed.data.url);
        if (!meta) {
          jsonError(res, 422, "Could not resolve YouTube metadata", { code: "YOUTUBE_RESOLVE_FAILED" });
          return;
        }
        jsonSuccess(res, 200, meta);
      } catch (e) {
        jsonErrorDb(res, "youtube_resolve", e);
      }
    }
  );
}
