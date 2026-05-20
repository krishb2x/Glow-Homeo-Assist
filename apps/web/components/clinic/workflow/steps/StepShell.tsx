"use client";

import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../../lib/cn";

/**
 * Visual shell every step renders inside. Keeps spacing / heading
 * treatment consistent in the continuous-scroll consult feed.
 */
export function StepShell({
  stepNumber,
  icon: Icon,
  title,
  description,
  status,
  children,
  className,
  actions
}: {
  stepNumber: number;
  icon: LucideIcon;
  title: string;
  description?: string;
  status?: "active" | "done" | "idle";
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <section
      className={cn(
        "rounded-2xl border border-hs-border/30 bg-hs-paper/95 shadow-card transition",
        status === "active" && "ring-1 ring-hs-primary/15",
        className
      )}
      aria-label={title}
      data-step-number={stepNumber}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hs-border/25 px-5 pt-5 pb-3 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-body-sm font-bold",
              status === "done"
                ? "border-emerald-300/70 bg-emerald-50 text-emerald-700"
                : status === "active"
                  ? "border-hs-primary/40 bg-hs-primary-very-light text-hs-primary"
                  : "border-hs-border/50 bg-hs-cream/60 text-hs-text-secondary"
            )}
            aria-hidden
          >
            {stepNumber}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-hs-text-secondary" aria-hidden />
              <h2 className="font-heading text-heading-sm font-semibold tracking-tight text-hs-ink">
                {title}
              </h2>
            </div>
            {description ? (
              <p className="mt-0.5 text-caption-sm text-hs-text-secondary">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/** Compact form field row — label on top, control below. */
export function FieldRow({
  label,
  hint,
  htmlFor,
  children,
  className
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("space-y-1", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-caption-sm font-semibold text-hs-text-secondary"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-caption-sm text-hs-text-tertiary">{hint}</p> : null}
    </div>
  );
}

/** Default text input style used across the step forms. */
export const STEP_INPUT_CLS =
  "w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60";

/** Default textarea style. */
export const STEP_TEXTAREA_CLS =
  "w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2.5 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60";
