import { describe, expect, it } from "vitest";
import { activeReminderSlot, isQuietHours, parseTimeToMinutes } from "./patientReminderLogic";

describe("parseTimeToMinutes", () => {
  it("parses HH:MM", () => {
    expect(parseTimeToMinutes("07:30")).toBe(7 * 60 + 30);
  });
});

describe("activeReminderSlot", () => {
  it("returns morning when now is within window", () => {
    const now = new Date("2026-05-25T07:35:00.000Z");
    const slot = activeReminderSlot(
      { morning: "07:30", afternoon: "13:30", evening: "19:30", night: "22:00" },
      now,
      15
    );
    expect(slot).toBe("morning");
  });

  it("returns null when outside all windows", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const slot = activeReminderSlot(
      { morning: "07:30", afternoon: "13:30", evening: "19:30", night: "22:00" },
      now,
      5
    );
    expect(slot).toBeNull();
  });
});

describe("isQuietHours", () => {
  it("detects overnight quiet period", () => {
    const late = new Date("2026-05-25T23:00:00.000Z");
    expect(isQuietHours({ start: "22:30", end: "06:30" }, late)).toBe(true);
    const morning = new Date("2026-05-25T06:00:00.000Z");
    expect(isQuietHours({ start: "22:30", end: "06:30" }, morning)).toBe(true);
    const day = new Date("2026-05-25T10:00:00.000Z");
    expect(isQuietHours({ start: "22:30", end: "06:30" }, day)).toBe(false);
  });
});
