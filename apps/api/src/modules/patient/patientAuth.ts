import type { Request, Response, NextFunction } from "express";
import type { AuthClaims } from "../../auth";
import { authRequired } from "../../auth";
import { jsonError } from "../../lib/apiEnvelope";
import { supabaseAdmin } from "../../supabase";
import { logger } from "../../lib/logger";
import type { PatientContext, PatientRequest } from "./types";

/**
 * Middleware: ensure the caller is a logged-in patient and resolve their
 * `patients` row server-side. The patient id is NEVER read from the request body.
 *
 * Use as: `app.get("/patient/me", requirePatientAuth, handler)`.
 */
export async function requirePatientAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Delegate to the standard JWT extractor first.
  await new Promise<void>((resolve) => {
    authRequired(req, res, () => resolve());
  });
  if (res.headersSent) return;

  const claims = (req as Request & { user?: AuthClaims }).user;
  if (!claims) {
    jsonError(res, 401, "Not authenticated", { code: "UNAUTHORIZED" });
    return;
  }

  // Patients have role === "PATIENT" — never let staff roles reach patient routes.
  if (claims.role !== "PATIENT") {
    jsonError(res, 403, "This API is for the patient app only.", {
      code: "PATIENT_AUTH_REQUIRED"
    });
    return;
  }

  // Resolve the linked patients row via patients.auth_user_id.
  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("id,clinic_id")
    .eq("auth_user_id", claims.userId)
    .maybeSingle();

  if (error) {
    logger.warn("patient_auth_lookup_failed", {
      authUserId: claims.userId,
      message: error.message
    });
    jsonError(res, 500, "Unable to resolve patient context.", { code: "PATIENT_LOOKUP_FAILED" });
    return;
  }

  if (!data) {
    jsonError(res, 403, "No patient record is linked to this account yet.", {
      code: "PATIENT_NOT_LINKED"
    });
    return;
  }

  const row = data as { id: string; clinic_id: string };
  const ctx: PatientContext = {
    authUserId: claims.userId,
    patientId: row.id,
    clinicId: row.clinic_id,
    accessToken: claims.accessToken
  };
  (req as PatientRequest).patient = ctx;
  next();
}
