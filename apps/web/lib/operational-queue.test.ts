import { describe, expect, it } from "vitest";
import { dedupeActiveVisits, groupFollowUps } from "./operational-queue";

describe("dedupeActiveVisits", () => {
  it("keeps one row per patient (newest visit)", () => {
    const rows = dedupeActiveVisits(
      [
        { id: "c1", patientId: "p1", patientName: "A", startedAt: "2026-05-25T08:00:00Z" },
        { id: "c2", patientId: "p1", patientName: "A", startedAt: "2026-05-25T10:00:00Z" }
      ],
      []
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("c2");
    expect(rows[0]!.duplicateCount).toBe(1);
  });
});

describe("groupFollowUps", () => {
  it("dedupes follow-ups by patient keeping highest priority", () => {
    const now = new Date("2026-05-25T12:00:00Z");
    const grouped = groupFollowUps(
      [
        {
          id: "f1",
          patientId: "p1",
          patientName: "A",
          dueAt: "2026-05-30T10:00:00Z",
          overdue: false,
          title: "Later",
          sourceConsultationId: "c1",
          source: "intentional"
        },
        {
          id: "f2",
          patientId: "p1",
          patientName: "A",
          dueAt: "2026-05-24T10:00:00Z",
          overdue: true,
          title: "Overdue",
          sourceConsultationId: "c1",
          source: "intentional"
        }
      ],
      now
    );
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.group).toBe("overdue");
    expect(grouped[0]!.id).toBe("f2");
  });
});
