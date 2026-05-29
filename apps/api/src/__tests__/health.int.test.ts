import { describe, it, expect } from "vitest";
import request from "supertest";

const hasSupabaseEnv =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Integration smoke: loads full `server` (Supabase + routes). Skips in CI without env.
 */
describe.skipIf(!hasSupabaseEnv)("GET /health (integration)", () => {
  it(
    "returns 200 and ok body",
    async () => {
      const { app } = await import("../server");
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: { ok: true, service: "glowhomeo-assist-api" }
      });
    },
    20_000
  );
});
