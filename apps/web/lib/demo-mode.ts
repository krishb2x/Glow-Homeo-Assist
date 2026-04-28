/**
 * Demo / offline sample data for UI review and tests without a live API.
 * Set `NEXT_PUBLIC_HA_DEMO=1` to use demo data for all doctor API reads.
 * Set `NEXT_PUBLIC_HA_DEMO_FALLBACK=1` to use demo data when a fetch fails.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_HA_DEMO === "1" || process.env.NEXT_PUBLIC_HA_DEMO === "true";
}

export function isDemoFallback(): boolean {
  return process.env.NEXT_PUBLIC_HA_DEMO_FALLBACK === "1" || process.env.NEXT_PUBLIC_HA_DEMO_FALLBACK === "true";
}

export function isUsingDemoData(): boolean {
  return isDemoMode() || isDemoFallback();
}
