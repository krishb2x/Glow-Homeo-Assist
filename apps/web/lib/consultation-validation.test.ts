import { describe, expect, it } from "vitest";
import { emptyConsultationSnapshot } from "@homeoassist/testing";
import {
  validateAllSteps,
  validateExamination,
  validatePatient,
  validatePrescription
} from "./consultation-validation";

describe("validatePatient", () => {
  it("requires chief complaint", () => {
    const s = emptyConsultationSnapshot();
    expect(validatePatient(s).done).toBe(false);
    expect(validatePatient(s).missing).toContain("Chief complaint");
  });

  it("passes with complaint", () => {
    const s = emptyConsultationSnapshot();
    s.patient.initialChiefComplaint = "Headache";
    expect(validatePatient(s).done).toBe(true);
  });
});

describe("validateExamination", () => {
  it("warns on unusual vitals", () => {
    const s = emptyConsultationSnapshot();
    s.vitals.pulse = "250";
    s.vitals.bp = "120/80";
    const v = validateExamination(s);
    expect(v.done).toBe(true);
    expect(v.warnings.some((w) => w.includes("Pulse"))).toBe(true);
  });
});

describe("validatePrescription", () => {
  it("requires at least one remedy", () => {
    const s = emptyConsultationSnapshot();
    s.prescription = [{ name: "" }];
    expect(validatePrescription(s).done).toBe(false);
  });
});

describe("validateAllSteps", () => {
  it("returns all nine step keys", () => {
    const all = validateAllSteps(emptyConsultationSnapshot());
    expect(Object.keys(all).sort()).toEqual(
      ["advice", "ai", "examination", "finalize", "followup", "history", "notes", "patient", "prescription"].sort()
    );
  });
});
