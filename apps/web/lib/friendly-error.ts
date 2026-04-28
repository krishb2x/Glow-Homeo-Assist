/**
 * User-facing copy for load/network failures (avoid raw "Failed to fetch").
 */
export function friendlyLoadError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Something went wrong. Please try again.";
  }
  const m = err.message;
  if (/failed to fetch|networkerror|load failed|network request failed|fetch/i.test(m)) {
    return "We couldn’t connect. Check your internet, or that the clinic app is running, then try again.";
  }
  if (/401|unauthorized|session|not authenticated|invalid.*token/i.test(m)) {
    return "Your session may have expired. Please sign in again.";
  }
  if (/50\d|server error|bad gateway|service unavailable/i.test(m)) {
    return "The server is having trouble. Please try again in a moment.";
  }
  if (m.length < 100 && m.trim().length > 0) {
    return m;
  }
  return "We couldn’t load your workspace. Please try again.";
}
