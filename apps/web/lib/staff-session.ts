import { parseApiData, readApiError, type AuthMe } from "./doctor-api";

/**
 * Verify a Supabase access token and return staff claims.
 * Routes through the Next.js server proxy (/api/auth/me) so the browser
 * never calls the Express API directly — avoids all CORS issues at login time.
 */
export async function fetchStaffAuthMe(accessToken: string): Promise<AuthMe> {
  const r = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const raw = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = readApiError(raw);
    if (r.status === 502) {
      throw new Error("Cannot reach the backend server. Make sure the API is running.");
    }
    throw new Error(msg ?? "Unable to verify your account.");
  }
  return parseApiData<AuthMe>(raw);
}
