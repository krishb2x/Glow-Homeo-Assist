/**
 * Plan-based feature access control.
 *
 * Features default to the set defined by the clinic's plan tier.
 * Admins can override any feature per-clinic via `clinic_feature_overrides`.
 *
 * Adding a new feature:
 *   1. Add it to the `FeatureKey` union.
 *   2. Add it to the relevant plan(s) in PLAN_FEATURES.
 *   3. Guard the relevant API endpoint(s) with `requireClinicFeature()`.
 *   4. Expose it via `workspace-context` so the frontend can lock/unlock UI.
 */

export type FeatureKey =
  | "ai_notetaker"
  | "messages"
  | "whatsapp_integration";

export type PlanTier = "BASIC" | "PRO" | "ENTERPRISE";

/**
 * Which features each plan tier includes by default.
 * Higher tiers always include everything from lower tiers.
 */
export const PLAN_FEATURES: Record<PlanTier, ReadonlyArray<FeatureKey>> = {
  BASIC:      ["messages"],
  PRO:        ["messages", "ai_notetaker"],
  ENTERPRISE: ["messages", "ai_notetaker", "whatsapp_integration"],
};

export type ClinicFeatures = {
  planTier: PlanTier;
  aiNotetaker: boolean;
  messages: boolean;
  whatsappIntegration: boolean;
};

const VALID_TIERS: ReadonlyArray<string> = ["BASIC", "PRO", "ENTERPRISE"];

function normalizeTier(raw: string | null | undefined): PlanTier {
  if (raw && VALID_TIERS.includes(raw)) return raw as PlanTier;
  return "BASIC";
}

/**
 * Compute effective feature flags for a clinic.
 *
 * @param planTier    The clinic's plan_tier column value.
 * @param overrides   Map of feature_key → enabled from clinic_feature_overrides rows.
 */
export function resolveFeatures(
  planTier: string | null | undefined,
  overrides: Record<string, boolean> = {},
): ClinicFeatures {
  const tier = normalizeTier(planTier);
  const planIncludes = PLAN_FEATURES[tier];

  function feat(key: FeatureKey): boolean {
    // Admin override takes precedence over plan defaults
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      return overrides[key] as boolean;
    }
    return planIncludes.includes(key);
  }

  return {
    planTier: tier,
    aiNotetaker: feat("ai_notetaker"),
    messages: feat("messages"),
    whatsappIntegration: feat("whatsapp_integration"),
  };
}

/**
 * Convenience: produce a display-friendly name for a plan tier.
 */
export function planLabel(tier: PlanTier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase(); // "Basic" / "Pro" / "Enterprise"
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-backed helper (requires supabaseAdmin – import lazily to avoid circular deps)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch resolved feature flags for a clinic straight from the DB.
 * Uses the service-role client to bypass RLS.
 */
export async function getClinicFeatures(clinicId: string | null | undefined): Promise<ClinicFeatures> {
  if (!clinicId) return resolveFeatures("BASIC", {});
  // Lazy import avoids circular dependency issues
  const { supabaseAdmin } = await import("../supabase");

  const [{ data: clinic }, { data: overrideRows }] = await Promise.all([
    supabaseAdmin
      .from("clinics")
      .select("plan_tier")
      .eq("id", clinicId)
      .maybeSingle(),
    supabaseAdmin
      .from("clinic_feature_overrides")
      .select("feature_key, enabled")
      .eq("clinic_id", clinicId),
  ]);

  const tier = (clinic as { plan_tier?: string } | null)?.plan_tier ?? "BASIC";
  const rows = (overrideRows ?? []) as Array<{ feature_key: string; enabled: boolean }>;
  const overrideMap: Record<string, boolean> = {};
  for (const row of rows) {
    overrideMap[row.feature_key] = row.enabled;
  }

  return resolveFeatures(tier, overrideMap);
}

/**
 * Check a single feature for a clinic. Returns false when clinicId is falsy.
 */
export async function isFeatureEnabled(clinicId: string | null | undefined, feature: FeatureKey): Promise<boolean> {
  if (!clinicId) return false;
  const feats = await getClinicFeatures(clinicId);
  return feats[feature === "ai_notetaker" ? "aiNotetaker"
    : feature === "whatsapp_integration" ? "whatsappIntegration"
    : "messages"] as boolean;
}
