import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { resolveClinicScope } from "./clinicScope";
import type { AuthClaims } from "../auth";

const CLINIC_A = "11111111-1111-1111-1111-111111111101";

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  return { res, json, status };
}

describe("resolveClinicScope", () => {
  it("uses claims.clinicId for DOCTOR", () => {
    const { res, json, status } = makeRes();
    const req = { query: {}, headers: {} } as unknown as Request;
    const claims: AuthClaims = {
      userId: "u",
      role: "DOCTOR",
      clinicId: CLINIC_A,
      accessToken: "t"
    };
    expect(resolveClinicScope(req, claims, res)).toBe(CLINIC_A);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("rejects DOCTOR without clinic", () => {
    const { res, json, status } = makeRes();
    const req = { query: {}, headers: {} } as unknown as Request;
    const claims: AuthClaims = {
      userId: "u",
      role: "DOCTOR",
      clinicId: null,
      accessToken: "t"
    };
    expect(resolveClinicScope(req, claims, res)).toBeNull();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN with clinicId query", () => {
    const { res, json, status } = makeRes();
    const req = { query: { clinicId: CLINIC_A }, headers: {} } as unknown as Request;
    const claims: AuthClaims = {
      userId: "u",
      role: "SUPER_ADMIN",
      clinicId: null,
      accessToken: "t"
    };
    expect(resolveClinicScope(req, claims, res)).toBe(CLINIC_A);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN with X-Clinic-Id header", () => {
    const { res, json, status } = makeRes();
    const req = {
      query: {},
      headers: { "x-clinic-id": CLINIC_A }
    } as unknown as Request;
    const claims: AuthClaims = {
      userId: "u",
      role: "SUPER_ADMIN",
      clinicId: null,
      accessToken: "t"
    };
    expect(resolveClinicScope(req, claims, res)).toBe(CLINIC_A);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("rejects SUPER_ADMIN without clinic scope", () => {
    const { res, status } = makeRes();
    const req = { query: {}, headers: {} } as unknown as Request;
    const claims: AuthClaims = {
      userId: "u",
      role: "SUPER_ADMIN",
      clinicId: null,
      accessToken: "t"
    };
    expect(resolveClinicScope(req, claims, res)).toBeNull();
    expect(status).toHaveBeenCalledWith(400);
  });
});
