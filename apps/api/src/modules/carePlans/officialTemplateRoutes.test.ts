import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerOfficialTemplateRoutes } from "./officialTemplateRoutes";
import * as carePlanService from "./carePlanService";
import { supabaseAdmin } from "../../supabase";

vi.mock("./carePlanService", () => ({
  listCarePlanTemplates: vi.fn(),
  getCarePlanTemplateDetail: vi.fn(),
  createCarePlanTemplate: vi.fn(),
  updateCarePlanTemplate: vi.fn(),
  deleteCarePlanTemplate: vi.fn()
}));

vi.mock("../../auth", () => ({
  authRequired: vi.fn((req, res, next) => {
    req.user = { userId: "super-admin-id", role: "SUPER_ADMIN" };
    next();
  }),
  requireAppRoles: vi.fn(() => (req, res, next) => next())
}));

vi.mock("../../supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [{ id: "t1" }], error: null })
        }))
      }))
    }))
  }
}));

describe("officialTemplateRoutes", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    registerOfficialTemplateRoutes(app);
  });

  describe("GET /admin/official-templates", () => {
    it("returns official templates successfully", async () => {
      vi.mocked(carePlanService.listCarePlanTemplates).mockResolvedValueOnce([{ id: "t1" }] as any);

      const res = await request(app).get("/admin/official-templates");
      
      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([{ id: "t1" }]);
      expect(carePlanService.listCarePlanTemplates).toHaveBeenCalledWith(
        supabaseAdmin,
        "00000000-0000-0000-0000-000000000000",
        "super-admin-id",
        expect.objectContaining({ templateType: "official" })
      );
    });
  });

  describe("POST /admin/official-templates", () => {
    it("returns validation error on bad request", async () => {
      const res = await request(app)
        .post("/admin/official-templates")
        .send({}); // Missing required fields

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("creates an official template", async () => {
      vi.mocked(carePlanService.createCarePlanTemplate).mockResolvedValueOnce({ id: "t2" } as any);

      const validPayload = {
        title: "Official Plan",
        slug: "official-plan",
        primaryCategory: "wellness_plan",
        severity: "any",
        visibility: "clinic"
      };

      const res = await request(app)
        .post("/admin/official-templates")
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ id: "t2" });
    });
  });

  describe("POST /admin/official-templates/:id/publish", () => {
    it("publishes the template", async () => {
      const res = await request(app).post("/admin/official-templates/t1/publish");
      
      expect(res.status).toBe(200);
      expect(res.body.data.ok).toBe(true);
      
      expect(supabaseAdmin.from).toHaveBeenCalledWith("care_plan_templates");
    });
  });
});
