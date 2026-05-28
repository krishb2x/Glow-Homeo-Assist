import type { RequestHandler, Response } from "express";
import { jsonError } from "../../lib/apiEnvelope";
import { logAndSanitizeError } from "../../lib/safeError";
import type { PatientRequest } from "./types";

export function handlePatientRouteError(res: Response, context: string, e: unknown): void {
  const code = (e as { code?: string }).code;
  if (code === "NOT_FOUND") {
    jsonError(res, 404, "Not found", { code: "NOT_FOUND" });
    return;
  }
  if (code === "VALIDATION_ERROR") {
    jsonError(res, 400, (e as Error).message || "Invalid request", { code: "VALIDATION_ERROR" });
    return;
  }
  if (code === "TENANT_SCOPE") {
    jsonError(res, 403, "Forbidden", { code: "FORBIDDEN" });
    return;
  }
  if (code === "MEETING_WINDOW" || code === "MEETING_UNAVAILABLE" || code === "NOT_ONLINE") {
    jsonError(res, 403, (e as Error).message, { code });
    return;
  }
  if (code === "NO_DOCTOR") {
    jsonError(res, 503, (e as Error).message, { code });
    return;
  }
  logAndSanitizeError(context, e);
  jsonError(res, 500, "Something went wrong. Please try again.", { code: "INTERNAL_ERROR" });
}

export function patientHandler(
  context: string,
  fn: (req: PatientRequest, res: Response) => Promise<void>
): RequestHandler {
  return async (req, res): Promise<void> => {
    try {
      await fn(req as PatientRequest, res);
    } catch (e) {
      if (!res.headersSent) {
        handlePatientRouteError(res, context, e);
      }
    }
  };
}
