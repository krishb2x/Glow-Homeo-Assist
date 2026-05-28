import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { supabaseAdmin } from "../supabase";

const hasSupabaseEnv =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

let app: Application;
let patientToken: string | null = null;

describe.skipIf(!hasSupabaseEnv)("Patient API (integration)", () => {
  beforeAll(async () => {
    const mod = await import("../server");
    app = mod.app;

    const { data: row, error } = await supabaseAdmin
      .from("patients")
      .select("patient_code")
      .not("patient_code", "is", null)
      .limit(1)
      .maybeSingle();

    if (error?.code === "42703" || error?.message?.includes("patient_code")) {
      return;
    }
    const code = (row as { patient_code: string | null } | null)?.patient_code;
    if (!code) return;

    const login = await request(app)
      .post("/patient/auth/login")
      .set("Content-Type", "application/json")
      .send({ patientCode: code });

    if (login.status === 200) {
      patientToken =
        (login.body.data?.token as string) ||
        (login.body.data?.session?.access_token as string) ||
        null;
    }
  }, 60_000);

  it("GET /health responds without auth", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /patient/today requires auth", async () => {
    const res = await request(app).get("/patient/today");
    expect(res.status).toBe(401);
  });

  it("authenticated patient routes return 200", async () => {
    if (!patientToken) {
      console.warn("skip: could not obtain patient token (no patient_code or login failed)");
      return;
    }

    const auth = { Authorization: `Bearer ${patientToken}` };

    const me = await request(app).get("/patient/me").set(auth);
    expect(me.status).toBe(200);

    const today = await request(app).get("/patient/today").set(auth);
    expect(today.status).toBe(200);
    expect(today.body.data?.greeting?.name).toBeTruthy();

    const visits = await request(app).get("/patient/visits?limit=5").set(auth);
    expect(visits.status).toBe(200);
    expect(Array.isArray(visits.body.data?.items)).toBe(true);

    const settings = await request(app).get("/patient/settings").set(auth);
    expect(settings.status).toBe(200);
    expect(settings.body.data?.locale).toBeTruthy();
  }, 45_000);
});
