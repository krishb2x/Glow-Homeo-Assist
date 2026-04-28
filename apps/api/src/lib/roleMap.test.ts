import { describe, it, expect } from "vitest";
import { mapProfileRoleStringToDomain } from "./roleMap";

describe("mapProfileRoleStringToDomain", () => {
  it("maps known profile roles", () => {
    expect(mapProfileRoleStringToDomain("super_admin")).toBe("SUPER_ADMIN");
    expect(mapProfileRoleStringToDomain("admin")).toBe("DOCTOR");
    expect(mapProfileRoleStringToDomain("doctor")).toBe("DOCTOR");
    expect(mapProfileRoleStringToDomain("support")).toBe("DOCTOR");
    expect(mapProfileRoleStringToDomain("patient")).toBe("PATIENT");
  });

  it("defaults unknown and empty to PATIENT (no privilege escalation)", () => {
    expect(mapProfileRoleStringToDomain("root")).toBe("PATIENT");
    expect(mapProfileRoleStringToDomain("")).toBe("PATIENT");
    expect(mapProfileRoleStringToDomain(null)).toBe("PATIENT");
    expect(mapProfileRoleStringToDomain(undefined)).toBe("PATIENT");
  });
});
