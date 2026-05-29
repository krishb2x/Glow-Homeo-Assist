import { Router, type Application, type Request } from "express";
import { z } from "zod";
import { authRequired, requireAppRoles, type AuthClaims } from "../../auth";
import { resolveClinicScope } from "../../lib/clinicScope";
import { jsonSuccess, jsonError } from "../../lib/apiEnvelope";
import { jsonErrorDb } from "../../lib/safeError";
import { getDb } from "../../db";
import { ContentCourseInputSchema, ContentModuleInputSchema, ContentLessonInputSchema } from "@homeoassist/domain";
import {
  listCourses,
  getCourseDetail,
  createCourse,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  deleteModule,
  addLesson,
  updateLesson,
  deleteLesson,
  cloneCourse
} from "./contentService";

export function registerContentRoutes(app: Application) {
  const router = Router();
  router.use(authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]));

  // -- Courses --
  router.get("/courses", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const clinicId = resolveClinicScope(req, claims, res);
    if (!clinicId) return;
    const db = getDb(claims);
    try {
      const data = await listCourses(db, clinicId);
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "list_courses", e);
    }
  });

  router.get("/courses/:id", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await getCourseDetail(db, req.params.id);
      if (!data) return jsonError(res, 404, "Course not found", { code: "NOT_FOUND" });
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "get_course", e);
    }
  });

  router.post("/courses", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const clinicId = resolveClinicScope(req, claims, res);
    if (!clinicId) return;
    const db = getDb(claims);
    try {
      const data = await createCourse(db, clinicId, claims.userId, req.body);
      jsonSuccess(res, 201, data);
    } catch (e) {
      jsonErrorDb(res, "create_course", e);
    }
  });

  router.patch("/courses/:id", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await updateCourse(db, req.params.id, req.body);
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "update_course", e);
    }
  });

  router.delete("/courses/:id", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await deleteCourse(db, req.params.id);
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "delete_course", e);
    }
  });

  router.post("/courses/:id/clone", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const clinicId = resolveClinicScope(req, claims, res);
    if (!clinicId) return;
    const db = getDb(claims);
    const title = typeof req.body?.title === "string" ? req.body.title : undefined;
    try {
      const data = await cloneCourse(db, clinicId, claims.userId, req.params.id, title);
      if (!data) return jsonError(res, 404, "Source course not found", { code: "NOT_FOUND" });
      jsonSuccess(res, 201, data);
    } catch (e) {
      jsonErrorDb(res, "clone_course", e);
    }
  });

  // -- Modules --
  router.post("/courses/:id/modules", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await addModule(db, req.params.id, req.body);
      jsonSuccess(res, 201, data);
    } catch (e) {
      jsonErrorDb(res, "create_module", e);
    }
  });

  router.patch("/modules/:id", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await updateModule(db, req.params.id, req.body);
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "update_module", e);
    }
  });

  router.delete("/modules/:id", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await deleteModule(db, req.params.id);
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "delete_module", e);
    }
  });

  // -- Lessons --
  router.post("/modules/:id/lessons", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await addLesson(db, req.params.id, req.body);
      jsonSuccess(res, 201, data);
    } catch (e) {
      jsonErrorDb(res, "create_lesson", e);
    }
  });

  router.patch("/lessons/:id", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await updateLesson(db, req.params.id, req.body);
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "update_lesson", e);
    }
  });

  router.delete("/lessons/:id", async (req, res) => {
    const claims = (req as unknown as Request & { user: AuthClaims }).user;
    const db = getDb(claims);
    try {
      const data = await deleteLesson(db, req.params.id);
      jsonSuccess(res, 200, data);
    } catch (e) {
      jsonErrorDb(res, "delete_lesson", e);
    }
  });

  app.use("/doctor/content", router);
}
