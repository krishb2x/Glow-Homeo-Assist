"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoRequestDialog } from "./DemoRequestDialog";

type CTAVariant = "light" | "dark";

/**
 * Marketing CTAs: Start free (login) + Book demo (modal form).
 * Use `variant="dark"` on slate / high-contrast bands.
 */
export function CTAButtons({ className = "", variant = "light" }: { className?: string; variant?: CTAVariant }): JSX.Element {
  const [demoOpen, setDemoOpen] = useState(false);
  const isDark = variant === "dark";
  return (
    <>
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center ${className}`}>
        <span className="marketing-btn-glow-wrap">
          <Link
            href="/login?requestAccess=true"
            className={`marketing-btn-glow-inner ${isDark ? "marketing-btn-glow-inner--on-dark" : ""}`}
          >
            Start free
          </Link>
        </span>
        <button
          type="button"
          onClick={() => setDemoOpen(true)}
          className={
            isDark
              ? "inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-white/30 bg-transparent px-8 text-sm font-medium text-white transition duration-200 hover:border-white/50 hover:bg-white/10 sm:max-w-xs"
              : "inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-slate-300/90 bg-white px-8 text-sm font-medium text-slate-800 shadow-sm transition duration-200 hover:border-slate-400 hover:bg-slate-50/80 sm:max-w-xs"
          }
        >
          Book demo
        </button>
      </div>
      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </>
  );
}
