import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerContentRoutes } from "./contentRoutes";
import * as contentService from "./contentService";
import * as auth from "../../auth";
import * as clinicScope from "../../lib/clinicScope";

vi.mock("./contentService", () => ({
  listCourses: vi.fn(),
  getCourseDetail: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
  addModule: vi.fn(),
  updateModule: vi.fn(),
  deleteModule: vi.fn(),
  addLesson: vi.fn(),
  updateLesson: vi.fn(),
  deleteLesson: vi.fn()
}));

vi.mock("../../auth", () => ({
  authRequired: vi.fn((req, res, next) => {
    req.user = { userId: "test-user-id", role: "DOCTOR" };
    next();
  }),
  requireAppRoles: vi.fn(() => (req, res, next) => next())
}));

vi.mock("../../lib/clinicScope", () => ({
  resolveClinicScope: vi.fn(() => "test-clinic-id")
}));

vi.mock("../../db", () => ({
  getDb: vi.fn(() => ({}))
}));

describe("contentRoutes", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    registerContentRoutes(app);
  });

  describe("GET /doctor/content/courses", () => {
    it("returns 200 and calls listCourses with clinic scope", async () => {
      vi.mocked(contentService.listCourses).mockResolvedValueOnce([{ id: "c1", title: "Test Course" }] as any);

      const res = await request(app).get("/doctor/content/courses");
      
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ id: "c1", title: "Test Course" }]);
      expect(contentService.listCourses).toHaveBeenCalledWith(expect.anything(), "test-clinic-id");
    });
  });

  describe("POST /doctor/content/courses", () => {
    it("returns 201 on success", async () => {
      vi.mocked(contentService.createCourse).mockResolvedValueOnce({ id: "c2" } as any);

      const payload = { title: "New Course", status: "draft" };
      const res = await request(app)
        .post("/doctor/content/courses")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ id: "c2" });
      expect(contentService.createCourse).toHaveBeenCalledWith(
        expect.anything(),
        "test-clinic-id",
        "test-user-id",
        payload
      );
    });
  });

  describe("Modules & Lessons", () => {
    it("adds a module", async () => {
      vi.mocked(contentService.addModule).mockResolvedValueOnce({ id: "m1" } as any);
      const res = await request(app)
        .post("/doctor/content/courses/c1/modules")
        .send({ title: "M1" });
      
      expect(res.status).toBe(201);
      expect(contentService.addModule).toHaveBeenCalledWith(expect.anything(), "c1", { title: "M1" });
    });

    it("adds a lesson", async () => {
      vi.mocked(contentService.addLesson).mockResolvedValueOnce({ id: "l1" } as any);
      const res = await request(app)
        .post("/doctor/content/modules/m1/lessons")
        .send({ title: "L1", contentType: "video" });
      
      expect(res.status).toBe(201);
      expect(contentService.addLesson).toHaveBeenCalledWith(expect.anything(), "m1", { title: "L1", contentType: "video" });
    });
  });
});
