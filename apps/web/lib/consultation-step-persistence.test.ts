import { describe, expect, it, beforeEach } from "vitest";
import {
  clearSavedConsultationStep,
  getSavedConsultationStep,
  saveConsultationStep
} from "./consultation-step-persistence";

describe("consultation-step-persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips saved steps", () => {
    saveConsultationStep("c1", "prescription");
    expect(getSavedConsultationStep("c1")).toBe("prescription");
  });

  it("maps ai to notes", () => {
    saveConsultationStep("c1", "ai");
    expect(getSavedConsultationStep("c1")).toBe("notes");
  });

  it("clears saved step", () => {
    saveConsultationStep("c1", "notes");
    clearSavedConsultationStep("c1");
    expect(getSavedConsultationStep("c1")).toBeNull();
  });
});
