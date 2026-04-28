import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthClaims } from "../auth";
import { jsonError } from "./apiEnvelope";

const uuidStr = z.string().uuid();

/**
 * Resolves which clinic the request is scoped to.
 *
 * - **DOCTOR / ADMIN / etc.:** use `claims.clinicId` (must be set).
 * - **SUPER_ADMIN:** must pass `?clinicId=` (UUID) or `X-Clinic-Id` header so tenant data
 *   queries have an explicit clinic (platform operators are not blocked by a null profile `clinic_id`).
 *
 * If Supabase RLS still blocks cross-clinic reads for a user JWT, adjust RLS or use a service path in a follow-up.
 */
export function resolveClinicScope(req: Request, claims: AuthClaims, res: Response): string | null {
  if (claims.role === "SUPER_ADMIN") {
    const q = req.query.clinicId;
    const fromQuery = typeof q === "string" ? uuidStr.safeParse(q) : { success: false as const };
    if (fromQuery.success) {
      return fromQuery.data;
    }
    const h = req.headers["x-clinic-id"];
    const fromHeader = typeof h === "string" ? uuidStr.safeParse(h) : { success: false as const };
    if (fromHeader.success) {
      return fromHeader.data;
    }
    jsonError(
      res,
      400,
      "Missing clinic scope. Pass clinicId as a query parameter or X-Clinic-Id header (platform administrator).",
      { code: "CLINIC_SCOPE_REQUIRED" }
    );
    return null;
  }

  if (!claims.clinicId) {
    jsonError(res, 400, "Active clinic membership is required", { code: "CLINIC_REQUIRED" });
    return null;
  }
  return claims.clinicId;
}
