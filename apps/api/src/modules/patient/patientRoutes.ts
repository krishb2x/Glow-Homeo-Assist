import type { Express } from "express";
import { z } from "zod";
import { jsonError, jsonSuccess } from "../../lib/apiEnvelope";
import { logAndSanitizeError } from "../../lib/safeError";
import { checkLoginRateLimit } from "../../lib/loginRateLimit";
import { supabaseAdmin } from "../../supabase";
import { loginPatientWithCode } from "./patientCodeAuth";
import { requirePatientAuth } from "./patientAuth";
import type { PatientRequest } from "./types";

const LoginBodySchema = z.object({
  patientCode: z.string().min(4).max(32)
});

export function registerPatientRoutes(app: Express): void {
  /**
   * Patient mobile login — no OTP.
   * Patient enters the code printed on their prescription (e.g. GH-CLN-00042).
   */
  app.post("/patient/auth/login", async (req, res) => {
    const limit = checkLoginRateLimit(req);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSec));
      jsonError(res, 429, "Too many login attempts. Please wait and try again.", { code: "RATE_LIMITED" });
      return;
    }

    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      jsonError(res, 400, "Invalid request body", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
      return;
    }

    try {
      const result = await loginPatientWithCode(parsed.data.patientCode);
      jsonSuccess(res, 200, {
        session: result.session,
        token: result.session.access_token,
        patient: {
          id: result.patient.id,
          name: result.patient.name,
          phone: result.patient.phone,
          patientCode: result.patient.patient_code
        },
        clinic: result.clinic
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "INVALID_PATIENT_CODE") {
        jsonError(res, 401, "Patient code not found. Check the code on your prescription.", {
          code: "INVALID_PATIENT_CODE"
        });
        return;
      }
      if (code === "PATIENT_CODE_MISSING") {
        jsonError(res, 400, "This patient record has no code yet. Ask your clinic to update your profile.", {
          code: "PATIENT_CODE_MISSING"
        });
        return;
      }
      logAndSanitizeError("patient_auth_login", e);
      jsonError(res, 500, "Unable to sign in. Please try again later.", { code: "AUTH_FAILED" });
    }
  });

  app.get("/patient/me", requirePatientAuth, async (req, res) => {
    const { patientId, clinicId } = (req as PatientRequest).patient;

    const { data: patientRow, error: pErr } = await supabaseAdmin
      .from("patients")
      .select(
        "id,name,phone,date_of_birth,gender,blood_group,allergies,ongoing_conditions,emergency_contact_name,emergency_contact_phone,tags,follow_up_status,visit_count,last_visit_at,last_prescription_at,patient_code"
      )
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (pErr) {
      logAndSanitizeError("patient_me_patient", pErr);
      jsonError(res, 500, "Unable to load profile.", { code: "PATIENT_LOOKUP_FAILED" });
      return;
    }
    if (!patientRow) {
      jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
      return;
    }

    const p = patientRow as Record<string, unknown>;

    const { data: clinicRow, error: cErr } = await supabaseAdmin
      .from("clinics")
      .select("id,name,phone,email,location")
      .eq("id", clinicId)
      .maybeSingle();

    if (cErr) {
      logAndSanitizeError("patient_me_clinic", cErr);
      jsonError(res, 500, "Unable to load clinic.", { code: "CLINIC_LOOKUP_FAILED" });
      return;
    }

    jsonSuccess(res, 200, {
      patient: {
        id: p.id,
        name: p.name,
        phone: p.phone ?? undefined,
        dateOfBirth: p.date_of_birth ?? undefined,
        gender: p.gender ?? undefined,
        bloodGroup: p.blood_group ?? undefined,
        allergies: p.allergies ?? undefined,
        ongoingConditions: p.ongoing_conditions ?? undefined,
        emergencyContact:
          p.emergency_contact_name || p.emergency_contact_phone
            ? {
                name: (p.emergency_contact_name as string) ?? undefined,
                phone: (p.emergency_contact_phone as string) ?? undefined
              }
            : undefined,
        tags: Array.isArray(p.tags) ? p.tags : undefined,
        followUpStatus: p.follow_up_status ?? undefined,
        visitCount: p.visit_count ?? undefined,
        lastVisitAt: p.last_visit_at ?? undefined,
        lastPrescriptionAt: p.last_prescription_at ?? undefined,
        patientCode: p.patient_code ?? undefined
      },
      clinic: clinicRow
        ? {
            id: (clinicRow as { id: string }).id,
            name: (clinicRow as { name: string }).name,
            phone: (clinicRow as { phone?: string | null }).phone ?? undefined,
            email: (clinicRow as { email?: string | null }).email ?? undefined,
            address: (clinicRow as { location?: string | null }).location ?? undefined
          }
        : { id: clinicId, name: "Clinic" }
    });
  });
}
