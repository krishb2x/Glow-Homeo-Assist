import { describe, expect, it } from "vitest";
import { formatSymptomsToMonitor, parseSymptomsToMonitor } from "./symptoms-monitor";

describe("symptoms-monitor", () => {
  it("parses comma-separated symptoms", () => {
    expect(parseSymptomsToMonitor("headache, fever\nsleep quality")).toEqual([
      "headache",
      "fever",
      "sleep quality"
    ]);
  });

  it("formats array back to display string", () => {
    expect(formatSymptomsToMonitor(["headache", "fever"])).toBe("headache, fever");
  });
});
