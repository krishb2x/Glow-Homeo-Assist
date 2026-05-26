import type { Request } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { writeAuditV2Event } from "./auditV2";
import { getRequestId } from "./requestContext";

function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

function clientIp(req: Request): string | null {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0]?.trim() ?? null;
  return req.socket.remoteAddress ?? null;
}

/** Audit public PHI/token access without storing raw tokens. */
export async function auditPublicAccess(
  admin: SupabaseClient,
  req: Request,
  args: {
    action: string;
    purpose?: string;
    token: string;
    clinicId?: string | null;
    consultationId?: string | null;
    patientId?: string | null;
    outcome: "allowed" | "denied";
  }
): Promise<void> {
  void writeAuditV2Event(admin, {
    clinicId: args.clinicId ?? null,
    actorId: null,
    actorRole: "public",
    entityType: "patient_access_token",
    entityId: args.consultationId ?? null,
    action: args.action,
    ip: clientIp(req),
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
    payload: {
      outcome: args.outcome,
      purpose: args.purpose ?? null,
      tokenFp: tokenFingerprint(args.token),
      patientId: args.patientId ?? null,
      requestId: getRequestId(req)
    }
  });
}
