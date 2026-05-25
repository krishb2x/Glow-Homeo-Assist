"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import {
  PRICING_PLANS,
  effectiveMonthlyPriceInr,
  formatInr,
  type PricingPlan
} from "../../lib/pricing-plans";

type Cycle = "monthly" | "annual";

type PlanCardProps = {
  plan: PricingPlan;
  cycle: Cycle;
};

function PlanCard({ plan, cycle }: PlanCardProps): JSX.Element {
  const price = effectiveMonthlyPriceInr(plan, cycle);
  const isFeatured = !!plan.featured;
  const isCustom = plan.monthlyPriceInr === 0;
  const seatLabel = plan.doctorSeats == null
    ? "Unlimited doctors"
    : plan.doctorSeats === 1
    ? "1 doctor"
    : `Up to ${plan.doctorSeats} doctors`;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-shadow",
        isFeatured
          ? "border-hs-primary/35 shadow-[0_18px_48px_-20px_rgba(14,124,102,0.4)]"
          : "border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:shadow-[0_18px_36px_-22px_rgba(15,23,42,0.18)]"
      )}
      aria-labelledby={`plan-full-${plan.id}-name`}
    >
      {isFeatured ? (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-hs-primary px-3 py-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
          Most clinics choose this
        </span>
      ) : null}

      <header>
        <h3
          id={`plan-full-${plan.id}-name`}
          className="font-heading text-[1.1rem] font-semibold text-slate-900"
        >
          {plan.name}
        </h3>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-slate-500">{plan.tagline}</p>
        <p className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold text-slate-600">
          {seatLabel}
        </p>
      </header>

      <div className="mt-5 flex items-baseline gap-1">
        {isCustom ? (
          <span className="font-heading text-3xl font-semibold text-slate-900">Let's talk</span>
        ) : (
          <>
            <span className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
              {formatInr(price)}
            </span>
            <span className="text-[0.8rem] font-medium text-slate-500">/clinic/month</span>
          </>
        )}
      </div>
      <p className="mt-1 text-[0.74rem] text-slate-400">
        {isCustom
          ? "Tailored to your clinic group"
          : cycle === "annual"
          ? "Billed annually (2 months free)"
          : "Billed monthly"}
      </p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2.5 text-[0.86rem]">
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-hs-primary/10 text-hs-primary"
              aria-hidden
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span className="text-slate-700">
              {f.label}
              {f.detail ? (
                <span className="block text-[0.78rem] leading-relaxed text-slate-500">
                  {f.detail}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.ctaHref}
        className={cn(
          "mt-7 inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-[0.88rem] font-semibold transition-colors",
          isFeatured
            ? "bg-hs-primary text-white shadow-[0_10px_28px_-12px_rgba(14,124,102,0.55)] hover:bg-hs-primary-dark"
            : "border border-slate-200 bg-white text-slate-800 hover:border-slate-300"
        )}
      >
        {plan.ctaLabel}
      </Link>
    </article>
  );
}

/**
 * Full-page pricing grid with a monthly / annual toggle. Used on `/pricing`.
 */
export function PricingPlans(): JSX.Element {
  const [cycle, setCycle] = useState<Cycle>("annual");

  return (
    <section className="bg-white px-5 py-12 sm:px-6 sm:py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-center">
          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
          >
            {([
              { id: "monthly" as Cycle, label: "Monthly" },
              { id: "annual" as Cycle, label: "Annual · save 17%" }
            ]).map((opt) => (
              <button
                key={opt.id}
                role="radio"
                aria-checked={cycle === opt.id}
                type="button"
                onClick={() => setCycle(opt.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[0.82rem] font-semibold transition-colors",
                  cycle === opt.id
                    ? "bg-hs-primary text-white shadow-[0_4px_12px_-4px_rgba(14,124,102,0.4)]"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} cycle={cycle} />
          ))}
        </div>
      </div>
    </section>
  );
}
