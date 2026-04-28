import type { Response } from "express";

/** Standard JSON body for new/updated endpoints (incremental migration from legacy `{ error }` only). */
export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string; code?: string; details?: unknown };

export function jsonSuccess<T>(res: Response, status: number, data: T): void {
  res.status(status).json({ success: true, data } satisfies ApiSuccess<T>);
}

export function jsonError(res: Response, status: number, error: string, opts?: { code?: string; details?: unknown }): void {
  const body: ApiFailure = { success: false, error, ...opts };
  res.status(status).json(body);
}
