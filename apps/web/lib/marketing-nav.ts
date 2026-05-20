/**
 * Canonical marketing navigation — referenced by `LandingHeader`, the marketing
 * footer, and tests. Centralising here keeps every surface consistent and lets
 * us guarantee a Login entry is always present.
 */

export type MarketingNavItem = {
  label: string;
  href: string;
  /** True if this should be matched against the route start (e.g. /features). */
  exact?: boolean;
};

export const MARKETING_PRIMARY_NAV: MarketingNavItem[] = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "FAQ", href: "/#faq" }
];

export const MARKETING_FOOTER_PRODUCT: MarketingNavItem[] = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "How it works", href: "/#how" },
  { label: "FAQ", href: "/#faq" }
];

export const MARKETING_FOOTER_LEGAL: MarketingNavItem[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "Refunds", href: "/refunds" }
];

/**
 * Returns the canonical app login path (handles same-origin and cross-origin
 * marketing deployments). Always normalised — no trailing slashes, no spaces.
 */
export function resolveLoginHref(appOrigin: string, opts?: { next?: string }): string {
  const base = (appOrigin ?? "").trim().replace(/\/+$/, "");
  const safeNext =
    opts?.next && typeof opts.next === "string" && opts.next.startsWith("/") && !opts.next.startsWith("//")
      ? opts.next
      : null;
  const path = "/login";
  if (!base) {
    return safeNext ? `${path}?next=${encodeURIComponent(safeNext)}` : path;
  }
  return safeNext ? `${base}${path}?next=${encodeURIComponent(safeNext)}` : `${base}${path}`;
}
