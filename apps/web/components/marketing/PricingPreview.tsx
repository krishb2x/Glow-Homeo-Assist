import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  PRICING_PLANS,
  effectiveMonthlyPriceInr,
  formatInr,
  type PricingPlan
} from "../../lib/pricing-plans";

type PlanCardProps = {
  plan: PricingPlan;
  /** Show the discounted (annual) monthly price by default in the teaser. */
  cycle?: "monthly" | "annual";
};

function PlanCard({ plan, cycle = "annual" }: PlanCardProps): JSX.Element {
  const price = effectiveMonthlyPriceInr(plan, cycle);
  const isFeatured = !!plan.featured;
  const isCustom = plan.monthlyPriceInr === 0;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-shadow",
        isFeatured
          ? "border-hs-primary/30 shadow-[0_12px_40px_-16px_rgba(14,124,102,0.32)]"
          : "border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.18)]"
      )}
      aria-labelledby={`plan-${plan.id}-name`}
    >
      {isFeatured ? (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-hs-primary px-3 py-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
          Most clinics choose this
        </span>
      ) : null}

      <header>
        <h3
          id={`plan-${plan.id}-name`}
          className="font-heading text-[1.05rem] font-semibold text-slate-900"
        >
          {plan.name}
        </h3>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-slate-500">{plan.tagline}</p>
      </header>

      <div className="mt-5 flex items-baseline gap-1">
        {isCustom ? (
          <span className="font-heading text-3xl font-semibold text-slate-900">Custom</span>
        ) : (
          <>
            <span className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
              {formatInr(price)}
            </span>
            <span className="text-[0.78rem] font-medium text-slate-500">/clinic/month</span>
          </>
        )}
      </div>
      {!isCustom ? (
        <p className="mt-1 text-[0.72rem] text-slate-400">
          {cycle === "annual" ? "Billed annually (2 months free)" : "Billed monthly"}
        </p>
      ) : (
        <p className="mt-1 text-[0.72rem] text-slate-400">Tailored to your clinic group</p>
      )}

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.slice(0, 6).map((f) => (
          <li key={f.label} className="flex items-start gap-2.5 text-[0.85rem] text-slate-600">
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-hs-primary/10 text-hs-primary"
              aria-hidden
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.ctaHref}
        className={cn(
          "mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-[0.85rem] font-semibold transition-colors",
          isFeatured
            ? "bg-hs-primary text-white shadow-[0_8px_24px_-12px_rgba(14,124,102,0.5)] hover:bg-hs-primary-dark"
            : "border border-slate-200 bg-white text-slate-800 hover:border-slate-300"
        )}
      >
        {plan.ctaLabel}
      </Link>
    </article>
  );
}

export function PricingPreview(): JSX.Element {
  return (
    <section
      id="pricing-preview"
      className="scroll-mt-20 bg-slate-50/60 px-5 py-20 sm:px-6 sm:py-24 md:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
            Pricing
          </p>
          <h2 className="font-heading mt-3 text-balance text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2rem] md:text-[2.25rem]">
            Simple pricing built for clinics, not large hospital chains.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-relaxed text-slate-500">
            One price per clinic. No per-patient fees, no surprise add-ons. Annual plans include
            two months free.
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <p className="mt-8 text-center text-[0.82rem] text-slate-500">
          See the full breakdown on the{" "}
          <Link href="/pricing" className="font-semibold text-hs-primary hover:underline">
            pricing page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
