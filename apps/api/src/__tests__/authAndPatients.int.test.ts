import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Application } from "express";

/**
 * `server` imports `supabase.ts`, which throws if these are unset — same guard as `health.int.test.ts`.
 * Without them, the whole file is skipped.
 */
const hasSupabaseEnv =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

function isDevBypassEnabled(): boolean {
  return process.env.DEV_BYPASS_AUTH === "true" || process.env.DEV_BYPASS_AUTH === "1";
}

let app: Application;

describe.skipIf(!hasSupabaseEnv)("Auth + patients (supertest, integration)", () => {
  beforeAll(async () => {
    const mod = await import("../server");
    app = mod.app;
  });

  it("POST /auth/login returns 400 for invalid body (Zod)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send({ email: "not-email", password: "x" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, details: expect.objectContaining({ formErrors: expect.anything() }) })
    );
  }, 10_000);

  it("POST /auth/login returns 401 for invalid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send({ email: "nonexistent-user+ha-test@example.com", password: "badpass9999" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, error: expect.any(String) })
    );
  }, 15_000);

  it("GET /doctor/patients returns 401 without Authorization", async () => {
    const res = await request(app).get("/doctor/patients");
    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, error: "Missing authentication token" })
    );
  });

  it("GET /doctor/patients returns 401 for non-Supabase bearer token", async () => {
    const res = await request(app)
      .get("/doctor/patients")
      .set("Authorization", "Bearer not-a-valid-access-token-xxxxxxxx");
    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, error: expect.any(String) })
    );
  });

  /**
   * Optional: only when `DEV_BYPASS_AUTH` is in env (e.g. root `.env`).
   * Resolves a clinic via internal doctor claims + service-role DB; expects `{ success, data }` list.
   */
  describe.skipIf(!isDevBypassEnabled())("with DEV_BYPASS_AUTH (local)", () => {
    it("GET /doctor/patients returns 200 and envelope with dev-bypass token", async () => {
      const token = process.env.DEV_BYPASS_BEARER ?? "dev-bypass";
      const res = await request(app)
        .get("/doctor/patients")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );
    });
  });
});
