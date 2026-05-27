import { describe, expect, it } from "vitest";
import { normalizePatientCode, patientAuthEmail, patientAuthPassword } from "./patientCodeAuth";

describe("normalizePatientCode", () => {
  it("uppercases and strips spaces", () => {
    expect(normalizePatientCode(" gh-cln-00042 ")).toBe("GH-CLN-00042");
  });
});

describe("patientAuthEmail", () => {
  it("is stable per patient id", () => {
    const id = "11111111-1111-1111-1111-111111111101";
    expect(patientAuthEmail(id)).toBe(`p.${id}@patient.internal.glowhomeo`);
  });
});

describe("patientAuthPassword", () => {
  it("is deterministic for a patient id", () => {
    process.env.PATIENT_AUTH_PEPPER = "test-pepper";
    const id = "11111111-1111-1111-1111-111111111101";
    expect(patientAuthPassword(id)).toBe(patientAuthPassword(id));
    expect(patientAuthPassword(id).length).toBeGreaterThan(20);
  });
});
