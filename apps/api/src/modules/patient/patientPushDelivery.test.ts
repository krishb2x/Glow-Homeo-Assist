import { describe, expect, it, vi, beforeEach } from "vitest";
import { isPatientPushTopic, processPatientPushJob } from "./patientPushDelivery";
import type { NotificationJobRow } from "../distribution/types";

describe("isPatientPushTopic", () => {
  it("matches patient namespace", () => {
    expect(isPatientPushTopic("patient.medication_reminder")).toBe(true);
    expect(isPatientPushTopic("prescription_delivery_email")).toBe(false);
  });
});

describe("processPatientPushJob", () => {
  beforeEach(() => {
    process.env.NOTIFICATION_MOCK_SEND = "true";
  });

  it("returns false without patient_id", async () => {
    const admin = { from: vi.fn() } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const job = {
      id: "j1",
      clinic_id: "c1",
      patient_id: null,
      channel: "push",
      topic: "patient.medication_reminder",
      payload: {},
      idempotency_key: "k1",
      scheduled_for: new Date().toISOString(),
      status: "QUEUED",
      attempts: 0
    } as NotificationJobRow;
    expect(await processPatientPushJob(admin, job)).toBe(false);
  });

  it("sends when tokens exist", async () => {
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: async () => ({
            data: [{ token: "ExponentPushToken[test]" }],
            error: null
          })
        })
      }))
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const job = {
      id: "j1",
      clinic_id: "c1",
      patient_id: "p1",
      channel: "push",
      topic: "patient.medication_reminder",
      payload: { slot: "morning" },
      idempotency_key: "k1",
      scheduled_for: new Date().toISOString(),
      status: "QUEUED",
      attempts: 0
    } as NotificationJobRow;

    expect(await processPatientPushJob(admin, job)).toBe(true);
  });
});
