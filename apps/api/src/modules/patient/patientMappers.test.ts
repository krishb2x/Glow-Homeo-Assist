import { describe, expect, it } from "vitest";
import {
  mergeAdvice,
  mapPrescriptionItems,
  dietItemsFromAdvice,
  restrictionsFromAdvice,
  firstLineFromNote
} from "./patientMappers";

describe("mergeAdvice", () => {
  it("merges clinical_record cards and legacy diet/lifestyle strings", () => {
    const cards = mergeAdvice(
      { diet: "Warm fluids only", lifestyle: "Sleep before 11pm" },
      {
        advice: [
          { id: "a1", category: "diet", title: "Fluids", detail: "Warm water" },
          { id: "r1", category: "restriction", title: "Coffee", detail: "No coffee" }
        ]
      }
    );
    expect(cards.some((c) => c.category === "restriction" && c.detail === "No coffee")).toBe(true);
    expect(cards.some((c) => c.detail === "Warm fluids only")).toBe(true);
  });
});

describe("mapPrescriptionItems", () => {
  it("maps stored jsonb lines with timing slots", () => {
    const items = mapPrescriptionItems([
      {
        id: "line-1",
        name: "Arsenicum Album",
        potency: "30C",
        doseCount: "4 pills",
        timingSlots: ["morning", "evening"],
        frequency: "TDS",
        duration: "7 days"
      }
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("line-1");
    expect(items[0]?.timingSlots).toEqual(["morning", "evening"]);
  });
});

describe("dietItemsFromAdvice", () => {
  it("splits diet detail into checklist rows", () => {
    const items = dietItemsFromAdvice({ diet: "Warm water, Avoid cold drinks" }, null);
    expect(items.length).toBeGreaterThanOrEqual(2);
  });
});

describe("restrictionsFromAdvice", () => {
  it("collects restriction category cards", () => {
    const list = restrictionsFromAdvice(
      null,
      { advice: [{ id: "x", category: "restriction", title: "X", detail: "No coffee" }] }
    );
    expect(list).toContain("No coffee");
  });
});

describe("firstLineFromNote", () => {
  it("reads chief complaints from note draft", () => {
    expect(firstLineFromNote({ chiefComplaints: "Sneezing for 4 days" })).toBe("Sneezing for 4 days");
  });
});
