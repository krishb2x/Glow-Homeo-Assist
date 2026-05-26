import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export type RequestWithContext = Request & { requestId?: string };

/** Attach correlation id for structured logs and downstream audit. */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
  (req as RequestWithContext).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

export function getRequestId(req: Request): string | null {
  return (req as RequestWithContext).requestId ?? null;
}
