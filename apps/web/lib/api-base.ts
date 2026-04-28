/**
 * Base URL for the Homeo backend (Express). Used by auth and marketing lead API.
 * Must match `apps/api` CORS allowlist in development.
 */
export function getPublicApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
}
