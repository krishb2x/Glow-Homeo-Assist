export type ErrorKind = "operational" | "system" | "retryable";

export class AppError extends Error {
  readonly kind: ErrorKind;
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    opts: { kind?: ErrorKind; code?: string; statusCode?: number; retryable?: boolean }
  ) {
    super(message);
    this.name = "AppError";
    this.kind = opts.kind ?? "operational";
    this.code = opts.code ?? "APP_ERROR";
    this.statusCode = opts.statusCode ?? 400;
    this.retryable = opts.retryable ?? opts.kind === "retryable";
  }
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof AppError) return err.retryable;
  if (err && typeof err === "object" && "retryable" in err) return Boolean((err as { retryable: boolean }).retryable);
  return false;
}
