"use client";

import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../../lib/cn";
import { useStepLayout } from "./StepLayoutContext";

/**
 * Visual shell every step renders inside.
 * In focused workspace mode (`bare`), renders flat typography without nested cards.
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
  const { bare } = useStepLayout();

  if (bare) {
    return (
      <section className={cn("space-y-8", className)} aria-label={title} data-step-number={stepNumber}>
        <header className="space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <h2 className="font-heading text-[1.625rem] font-medium leading-tight tracking-[-0.02em] text-neutral-900 sm:text-[1.75rem]">
                {title}
              </h2>
              {description ? (
                <p className="max-w-xl text-[0.9375rem] leading-relaxed text-neutral-500">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </header>
        <div className="space-y-5">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-hs-border/35 bg-hs-paper shadow-ds-sm transition",
        status === "active" && "ring-1 ring-hs-primary/12",
        className
      )}
      aria-label={title}
      data-step-number={stepNumber}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hs-border/20 px-4 pt-4 pb-2.5 lg:px-5">
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
      <div className="px-4 py-4 lg:px-5 lg:py-5">{children}</div>
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
        className="block text-[0.8125rem] font-medium text-neutral-700"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-[0.75rem] leading-relaxed text-neutral-400">{hint}</p> : null}
    </div>
  );
}

/** Default text input style used across the step forms. */
export const STEP_INPUT_CLS = "cw-input";

/** Default textarea style. */
export const STEP_TEXTAREA_CLS = "cw-textarea";
