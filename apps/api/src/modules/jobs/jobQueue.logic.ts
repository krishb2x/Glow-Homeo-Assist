/** Pure queue rules — unit-tested without Supabase. */

export const DEFAULT_MAX_ATTEMPTS = 8;
export const BASE_BACKOFF_MS = 30_000;
export const MAX_BACKOFF_MS = 3_600_000;

export function computeBackoffMs(attempts: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS);
}

export function isRetryableJobError(errMsg?: string): boolean {
  if (!errMsg) return true;
  const lower = errMsg.toLowerCase();
  return !lower.includes("invalid") && !lower.includes("not found") && !lower.includes("template");
}

export function shouldDeadLetter(
  attempts: number,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  errMsg?: string
): boolean {
  return attempts >= maxAttempts || !isRetryableJobError(errMsg);
}

export function timelineHasMore(total: number, offset: number, returned: number): boolean {
  return offset + returned < total;
}
