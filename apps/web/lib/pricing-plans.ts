/**
 * Pricing data — canonical source for the /pricing page, homepage teaser, and
 * any sales material. Prices are in INR per clinic per month, billed monthly.
 * Annual billing offers ~17% discount (2 months free).
 */

export type PricingPlanId = "solo" | "clinic" | "scale";

export type PricingFeature = {
  label: string;
  /** Optional sub-line displayed below the bullet for emphasis. */
  detail?: string;
  /** When true, render in a slightly muted way (e.g. "included" affirmations). */
  muted?: boolean;
};

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  tagline: string;
  /** Audience description — one short sentence. */
  audience: string;
  /** Monthly price in INR when billed monthly. */
  monthlyPriceInr: number;
  /** Set true for the visually highlighted plan. */
  featured?: boolean;
  /** Doctors allowed on the plan. `null` = unlimited / contact sales. */
  doctorSeats: number | null;
  features: PricingFeature[];
  /** Primary CTA label for the plan card. */
  ctaLabel: string;
  /** Where the CTA leads (relative). */
  ctaHref: string;
};

const SHARED_FEATURES: PricingFeature[] = [
  { label: "Unlimited patients & cases", muted: true },
  { label: "Patient care app under your clinic brand", muted: true },
  { label: "Professional prescription PDFs (doctor & patient versions)", muted: true },
  { label: "In-clinic & online consultations on the same chart", muted: true }
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "solo",
    name: "Solo",
    tagline: "For one practitioner running their own clinic.",
    audience: "Solo practitioners",
    monthlyPriceInr: 1499,
    doctorSeats: 1,
    features: [
      ...SHARED_FEATURES,
      { label: "Appointment scheduling & follow-up queue" },
      { label: "Email & WhatsApp delivery for prescriptions" }
    ],
    ctaLabel: "Start with Solo",
    ctaHref: "/demo"
  },
  {
    id: "clinic",
    name: "Clinic",
    tagline: "For a clinic with a receptionist and up to three doctors.",
    audience: "Small clinics (1–3 doctors)",
    monthlyPriceInr: 3499,
    featured: true,
    doctorSeats: 3,
    features: [
      ...SHARED_FEATURES,
      { label: "Everything in Solo" },
      { label: "Receptionist & multi-doctor roles", detail: "Records scoped per doctor; clinic-level visibility for admins" },
      { label: "Appointment scheduling & follow-up queue" },
      { label: "Practice growth toolkit", detail: "Clinic page, referral links, branded communications" }
    ],
    ctaLabel: "Choose Clinic",
    ctaHref: "/demo"
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "For multi-doctor practices and clinic groups.",
    audience: "4+ doctors or multiple locations",
    monthlyPriceInr: 0,
    doctorSeats: null,
    features: [
      ...SHARED_FEATURES,
      { label: "Everything in Clinic" },
      { label: "Unlimited doctor seats" },
      { label: "Multi-clinic management" },
      { label: "Priority onboarding & dedicated success manager" },
      { label: "Custom data migration from paper or other systems" }
    ],
    ctaLabel: "Talk to us",
    ctaHref: "/request-access"
  }
];

/** Annual discount factor: 2 months free → ~16.67% off. */
export const ANNUAL_DISCOUNT = 2 / 12;

/**
 * Returns the effective monthly price for a given billing cycle, rounded to a
 * whole rupee. Annual plans show a 16.67% discount (2 months free).
 */
export function effectiveMonthlyPriceInr(
  plan: PricingPlan,
  cycle: "monthly" | "annual"
): number {
  if (plan.monthlyPriceInr === 0) return 0;
  if (cycle === "monthly") return Math.round(plan.monthlyPriceInr);
  return Math.round(plan.monthlyPriceInr * (1 - ANNUAL_DISCOUNT));
}

/** Total billed amount for a year on the given cycle (in INR). */
export function annualBilledInr(plan: PricingPlan, cycle: "monthly" | "annual"): number {
  if (plan.monthlyPriceInr === 0) return 0;
  return effectiveMonthlyPriceInr(plan, cycle) * 12;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

/** Formats an INR amount with the Indian thousand-separator and ₹ symbol. */
export function formatInr(amount: number): string {
  if (amount === 0) return "Custom";
  return inrFormatter.format(amount);
}

/**
 * Returns the plan by id, or `null` if not found. Useful in tests and pages
 * that highlight one plan at a time.
 */
export function findPlan(id: PricingPlanId): PricingPlan | null {
  return PRICING_PLANS.find((p) => p.id === id) ?? null;
}
