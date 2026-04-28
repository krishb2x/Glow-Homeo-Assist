import type { Response } from "express";

/** Stable machine-facing codes for clients; `error` remains human-readable. */
export function sendApiError(
  res: Response,
  status: number,
  message: string,
  opts?: { code?: string; details?: unknown }
): void {
  res.status(status).json({
    error: message,
    ...(opts?.code ? { code: opts.code } : {}),
    ...(opts?.details !== undefined ? { details: opts.details } : {})
  });
}
