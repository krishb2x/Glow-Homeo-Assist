import { describe, expect, it } from "vitest";
import { mapStoredPrescriptionItem } from "./map-prescription-items";

describe("mapStoredPrescriptionItem", () => {
  it("maps rich client entry to print line", () => {
    const line = mapStoredPrescriptionItem({
      kind: "remedy",
      name: "Natrum muriaticum",
      potency: "200C",
      doseCount: "4 pills",
      frequency: "twice",
      timingSlots: ["morning", "night"],
      duration: "7 days",
      instructions: "30 min before food"
    });
    expect(line.remedyName).toBe("Natrum muriaticum");
    expect(line.frequency).toBe("Twice daily");
    expect(line.dosage).toContain("4 pills");
    expect(line.dosage).toContain("Morning");
  });
});
