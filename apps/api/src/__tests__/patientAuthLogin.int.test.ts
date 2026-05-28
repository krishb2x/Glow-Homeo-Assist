import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { supabaseAdmin } from "../supabase";

const hasSupabaseEnv =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

let app: Application;

describe.skipIf(!hasSupabaseEnv)("Patient auth login (integration)", () => {
  beforeAll(async () => {
    const mod = await import("../server");
    app = mod.app;
  });

  it("POST /patient/auth/login returns 400 for invalid body", async () => {
    const res = await request(app)
      .post("/patient/auth/login")
      .set("Content-Type", "application/json")
      .send({ patientCode: "x" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /patient/auth/login returns 401 for unknown code", async () => {
    const res = await request(app)
      .post("/patient/auth/login")
      .set("Content-Type", "application/json")
      .send({ patientCode: "GH-ZZZZ-99999" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, code: "INVALID_PATIENT_CODE" })
    );
  });

  it("login with real patient_code then GET /patient/me", async () => {
    const { data: row, error } = await supabaseAdmin
      .from("patients")
      .select("patient_code")
      .not("patient_code", "is", null)
      .limit(1)
      .maybeSingle();

    if (error?.message?.includes("patient_code") || error?.code === "42703") {
      console.warn("skip: patients.patient_code column missing — apply migration 20260528000000");
      return;
    }
    expect(error).toBeNull();
    const code = (row as { patient_code: string | null } | null)?.patient_code;
    if (!code) {
      console.warn("skip: no patient with patient_code in database");
      return;
    }

    const login = await request(app)
      .post("/patient/auth/login")
      .set("Content-Type", "application/json")
      .send({ patientCode: code });
    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.data?.token).toBeTruthy();
    expect(login.body.data?.patient?.patientCode).toBe(code);

    const token = login.body.data.token as string;
    const me = await request(app).get("/patient/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data?.patient?.patientCode).toBe(code);
  }, 30_000);
});
