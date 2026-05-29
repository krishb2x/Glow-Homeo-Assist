import type express from "express";
import { CarePlanTemplateBodySchema } from "@homeoassist/domain";
import type { AuthClaims } from "../../auth";
import { authRequired, requireAppRoles } from "../../auth";
import { supabaseAdmin } from "../../supabase";
import { jsonError, jsonSuccess } from "../../lib/apiEnvelope";
import { jsonErrorDb } from "../../lib/safeError";
import {
  createCarePlanTemplate,
  deleteCarePlanTemplate,
  getCarePlanTemplateDetail,
  listCarePlanTemplates,
  updateCarePlanTemplate
} from "./carePlanService";

const SYSTEM_CLINIC_ID = "00000000-0000-0000-0000-000000000000";

function paramId(req: express.Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : id;
}

export function registerOfficialTemplateRoutes(app: express.Express): void {
  app.get(
    "/admin/official-templates",
    authRequired,
    requireAppRoles(["SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      try {
        const items = await listCarePlanTemplates(
          supabaseAdmin,
          SYSTEM_CLINIC_ID,
          claims.userId,
          {
            templateType: "official",
            q: typeof req.query.q === "string" ? req.query.q : undefined,
            status: typeof req.query.status === "string" ? req.query.status : "all",
            limit: Number(req.query.limit) || 100
          }
        );
        jsonSuccess(res, 200, { items });
      } catch (e) {
        jsonErrorDb(res, "official_templates_list", e);
      }
    }
  );

  app.get(
    "/admin/official-templates/:id",
    authRequired,
    requireAppRoles(["SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      try {
        const detail = await getCarePlanTemplateDetail(
          supabaseAdmin,
          paramId(req),
          claims.userId
        );
        if (!detail) {
          jsonError(res, 404, "Official template not found", { code: "NOT_FOUND" });
          return;
        }
        jsonSuccess(res, 200, detail);
      } catch (e) {
        jsonErrorDb(res, "official_templates_get", e);
      }
    }
  );

  app.post(
    "/admin/official-templates",
    authRequired,
    requireAppRoles(["SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const parsed = CarePlanTemplateBodySchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      try {
        // Force templateType to official and use system clinic
        const result = await createCarePlanTemplate(
          supabaseAdmin,
          SYSTEM_CLINIC_ID,
          claims,
          {
            ...parsed.data,
            templateType: "official"
          }
        );
        jsonSuccess(res, 201, result);
      } catch (e) {
        jsonErrorDb(res, "official_templates_create", e);
      }
    }
  );

  app.patch(
    "/admin/official-templates/:id",
    authRequired,
    requireAppRoles(["SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
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
        await updateCarePlanTemplate(
          supabaseAdmin,
          paramId(req),
          claims,
          parsed.data
        );
        jsonSuccess(res, 200, { ok: true });
      } catch (e) {
        jsonErrorDb(res, "official_templates_patch", e);
      }
    }
  );

  app.post(
    "/admin/official-templates/:id/publish",
    authRequired,
    requireAppRoles(["SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      try {
        const id = paramId(req);
        
        // Use Supabase Admin to bypass RLS for direct status update
        const db = supabaseAdmin;
        const { data, error } = await db
          .from("care_plan_templates")
          .update({ 
            status: "published",
            published_at: new Date().toISOString()
            // In a real system you might want to bump version too if it was already published
          })
          .eq("id", id)
          .select("id");
          
        if (error) throw error;
        
        jsonSuccess(res, 200, { ok: true });
      } catch (e) {
        jsonErrorDb(res, "official_templates_publish", e);
      }
    }
  );

  app.post(
    "/admin/official-templates/:id/archive",
    authRequired,
    requireAppRoles(["SUPER_ADMIN"]),
    async (req, res) => {
      try {
        const db = supabaseAdmin;
        const { error } = await db
          .from("care_plan_templates")
          .update({ status: "archived" })
          .eq("id", paramId(req));
          
        if (error) throw error;
        jsonSuccess(res, 200, { ok: true });
      } catch (e) {
        jsonErrorDb(res, "official_templates_archive", e);
      }
    }
  );

  app.delete(
    "/admin/official-templates/:id",
    authRequired,
    requireAppRoles(["SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      try {
        await deleteCarePlanTemplate(
          supabaseAdmin,
          paramId(req),
          claims.userId // The delete service checks doctorId, might need to be careful here if not owned by this admin
        );
        jsonSuccess(res, 200, { ok: true });
      } catch (e) {
        jsonErrorDb(res, "official_templates_delete", e);
      }
    }
  );
}
