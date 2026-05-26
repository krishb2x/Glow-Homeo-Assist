import { describe, expect, it } from "vitest";
import { prescriptionEntriesToApiItems } from "./prescription-api-items";

describe("prescription-api-items", () => {
  it("maps remedy entries to structured API lines", () => {
    const items = prescriptionEntriesToApiItems([
      {
        kind: "remedy",
        name: "Arsenicum album",
        potency: "30C",
        doseCount: "4 globules",
        frequency: "twice",
        timingSlots: ["morning", "night"],
        duration: "7 days",
        instructions: "Avoid coffee"
      }
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.remedyName).toBe("Arsenicum album");
    expect(items[0]?.potency).toBe("30C");
    expect(items[0]?.frequency).toBe("Twice daily");
    expect(items[0]?.instructions).toBe("Avoid coffee");
  });

  it("skips blank lines", () => {
    expect(prescriptionEntriesToApiItems([{ name: "  ", potency: "30C" }])).toHaveLength(0);
  });
});
