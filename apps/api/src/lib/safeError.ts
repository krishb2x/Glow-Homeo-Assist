import type { Response } from "express";
import { jsonError } from "./apiEnvelope";
import { logger } from "./logger";

/** Client-safe message; internal details are never sent to browsers. */
export const CLIENT_SAFE_MSG = "Something went wrong. Please try again.";

export function logAndSanitizeError(context: string, err: unknown): void {
  const message =
    err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
  logger.error(context, { message });
}

/**
 * After logging the real error, return a generic 400 with standard JSON envelope.
 */
export function jsonErrorDb(res: Response, context: string, err: unknown, code = "DB_ERROR"): void {
  logAndSanitizeError(context, err);
  jsonError(res, 400, CLIENT_SAFE_MSG, { code });
}
