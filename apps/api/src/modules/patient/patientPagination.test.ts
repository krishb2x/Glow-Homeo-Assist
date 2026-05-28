import { describe, expect, it } from "vitest";
import { encodeCursor, decodeCursor, clampLimit } from "./patientPagination";

describe("patientPagination", () => {
  it("round-trips cursor", () => {
    const iso = "2026-05-12T10:00:00.000Z";
    const id = "11111111-1111-1111-1111-111111111101";
    const cursor = encodeCursor(iso, id);
    expect(decodeCursor(cursor)).toEqual({ iso, id });
  });

  it("clamps limit", () => {
    expect(clampLimit(undefined)).toBe(20);
    expect(clampLimit(100)).toBe(50);
    expect(clampLimit(0)).toBe(1);
  });
});
