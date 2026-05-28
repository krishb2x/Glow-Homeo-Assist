import { describe, expect, it, vi } from "vitest";
import { upsertMedicationLog } from "./patientAdherenceService";
import type { PatientContext } from "./types";

const ctx: PatientContext = {
  authUserId: "auth-1",
  patientId: "pat-1",
  clinicId: "clinic-1",
  accessToken: "token"
};

function mockAdmin(overrides: {
  prescriptionFound?: boolean;
  upsertRow?: Record<string, unknown>;
}) {
  const from = vi.fn((table: string) => {
    if (table === "prescriptions") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: overrides.prescriptionFound === false ? null : { id: "rx-1" },
                  error: null
                })
              })
            })
          })
        })
      };
    }
    if (table === "patient_medication_logs") {
      return {
        upsert: () => ({
          select: () => ({
            single: async () => ({
              data: overrides.upsertRow ?? {
                id: "log-1",
                prescription_id: "rx-1",
                item_id: "line-1",
                slot: "morning",
                status: "TAKEN"
              },
              error: null
            })
          })
        })
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("upsertMedicationLog", () => {
  it("rejects unknown prescription", async () => {
    await expect(
      upsertMedicationLog(mockAdmin({ prescriptionFound: false }), ctx, {
        prescriptionId: "rx-missing",
        itemId: "line-1",
        slot: "morning",
        status: "TAKEN"
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("upserts when prescription belongs to patient", async () => {
    const row = await upsertMedicationLog(mockAdmin({}), ctx, {
      prescriptionId: "rx-1",
      itemId: "line-1",
      slot: "morning",
      status: "TAKEN"
    });
    expect((row as { prescription_id: string }).prescription_id).toBe("rx-1");
  });
});
