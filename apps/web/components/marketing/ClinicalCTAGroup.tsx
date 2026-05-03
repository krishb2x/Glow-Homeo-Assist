"use client";

import Link from "next/link";
import { cn } from "../../lib/cn";

type Variant = "light" | "dark";
type Size = "default" | "hero";

export type ClinicalCTAGroupProps = {
  className?: string;
  variant?: Variant;
  /** Hero: larger primary for above-the-fold. */
  size?: Size;
};

const primaryLabel = "Book a 20-minute walkthrough";
const secondaryLabel = "Apply for 90-day guided trial";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/**
 * Exactly two CTAs: walkthrough (primary) + guided trial (secondary). Same copy sitewide.
 */
export function ClinicalCTAGroup({
  className = "",
  variant = "light",
  size = "default"
}: ClinicalCTAGroupProps): JSX.Element {
  const isDark = variant === "dark";
  const isHero = size === "hero";

  const primaryClass = cn(
    "flex w-full items-center justify-center text-balance text-center font-semibold tracking-tight antialiased transition-[transform,box-shadow,background-color] duration-200 ease-out motion-safe:hover:-translate-y-0.5",
    focusRing,
    isHero
      ? "min-h-[3.5rem] rounded-2xl px-6 py-4 text-[0.9375rem] leading-snug sm:min-h-[3.625rem] sm:px-8 sm:text-[1.0625rem] sm:leading-snug"
      : "min-h-[52px] rounded-2xl px-6 py-3.5 text-[0.9375rem] leading-snug",
    isDark
      ? "bg-white text-hs-primary-dark shadow-[0_6px_24px_-8px_rgb(61_141_123/0.25)] ring-1 ring-white/20 hover:bg-hs-primary-very-light motion-safe:hover:-translate-y-0.5"
      : "bg-hs-primary text-white shadow-[0_8px_32px_-8px_rgb(61_141_123/0.4)] ring-1 ring-hs-primary-dark/15 hover:bg-hs-primary-light hover:shadow-[0_14px_40px_-10px_rgb(61_141_123/0.45)] active:motion-safe:translate-y-0"
  );

  const secondaryClass = cn(
    "flex w-full items-center justify-center text-balance text-center font-semibold tracking-tight antialiased transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out",
    focusRing,
    isHero
      ? "min-h-[3.5rem] rounded-2xl px-6 py-4 text-[0.9375rem] leading-snug sm:min-h-[3.625rem] sm:px-8 sm:text-[1.0625rem] sm:leading-snug"
      : "min-h-[52px] rounded-2xl px-6 py-3.5 text-[0.9375rem] leading-snug",
    isDark
      ? "border border-white/30 bg-white/[0.07] text-white shadow-none hover:border-white/45 hover:bg-white/12"
      : "border border-slate-200/95 bg-white text-slate-800 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-white hover:shadow-[0_8px_28px_-10px_rgba(15,23,42,0.12)] active:scale-[0.995]"
  );

  const gridGap = isHero ? "gap-5 sm:gap-8" : "gap-6 sm:gap-8";
  const maxW = isHero ? "max-w-[36rem] sm:max-w-[40.5rem]" : "max-w-lg sm:max-w-[40rem]";

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-full grid-cols-1 sm:grid-cols-2 sm:items-stretch",
        gridGap,
        maxW,
        className
      )}
    >
      <div className="flex min-w-0 flex-col items-stretch">
        <Link href="/demo" className={primaryClass}>
          {primaryLabel}
        </Link>
        <p
          className={cn(
            "mt-3 min-h-[2.75rem] text-pretty text-center text-[0.8125rem] leading-snug sm:min-h-0",
            isDark ? "text-slate-400" : "text-slate-500"
          )}
        >
          See how it works for your clinic
        </p>
      </div>

      <div className="flex min-w-0 flex-col items-stretch">
        <Link href="/request-access" className={secondaryClass}>
          {secondaryLabel}
        </Link>
        <p
          className={cn(
            "mt-3 min-h-[2.75rem] text-pretty text-center text-[0.8125rem] leading-snug sm:min-h-0",
            isDark ? "text-slate-400" : "text-slate-500"
          )}
        >
          Start with guided onboarding and support
        </p>
      </div>
    </div>
  );
}
