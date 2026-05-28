import type { MedicationSlot } from "./types";

const SLOTS: MedicationSlot[] = ["morning", "afternoon", "evening", "night"];

/** Parse `HH:MM` (24h) into minutes from midnight. */
export function parseTimeToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function minutesNowUtc(date = new Date()): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/**
 * Returns the medication slot whose reminder time falls within `windowMinutes` of now (UTC).
 * Production apps should pass locale-adjusted `now` when timezone support is added.
 */
export function activeReminderSlot(
  reminderTimes: Record<string, string>,
  now = new Date(),
  windowMinutes = 15
): MedicationSlot | null {
  const nowMin = minutesNowUtc(now);
  for (const slot of SLOTS) {
    const target = parseTimeToMinutes(reminderTimes[slot] ?? "");
    if (target == null) continue;
    const diff = Math.abs(nowMin - target);
    const wrap = Math.min(diff, 1440 - diff);
    if (wrap <= windowMinutes) return slot;
  }
  return null;
}

/** True when `now` (UTC minutes) falls inside quiet hours (may span midnight). */
export function isQuietHours(
  quiet: { start?: string; end?: string },
  now = new Date()
): boolean {
  const start = parseTimeToMinutes(quiet.start ?? "22:30");
  const end = parseTimeToMinutes(quiet.end ?? "06:30");
  if (start == null || end == null) return false;
  const cur = minutesNowUtc(now);
  if (start <= end) {
    return cur >= start && cur < end;
  }
  return cur >= start || cur < end;
}
