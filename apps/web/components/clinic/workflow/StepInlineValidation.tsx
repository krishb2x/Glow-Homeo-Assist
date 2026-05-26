"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { StepValidation } from "../../../lib/consultation-validation";
import { cn } from "../../../lib/cn";

/**
 * Advisory hints — soft, non-blocking nudges below the active step form.
 */
export function StepInlineValidation({
  active,
  validation,
  className
}: {
  active: boolean;
  validation?: StepValidation;
  className?: string;
}): JSX.Element | null {
  if (!active || !validation) return null;
  const { missing, warnings } = validation;
  if (missing.length === 0 && warnings.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg px-3.5 py-3 text-[0.8125rem] leading-relaxed",
        missing.length > 0
          ? "bg-amber-50/80 text-amber-950 ring-1 ring-amber-200/60"
          : "bg-neutral-50 text-neutral-600 ring-1 ring-black/[0.05]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {missing.length > 0 ? (
        <p>
          <span className="font-medium text-amber-900">Still needed: </span>
          {missing.join(" · ")}
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <p className={cn("flex items-start gap-1.5", missing.length > 0 && "mt-1.5")}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600/80" aria-hidden />
          <span>{warnings.join(" · ")}</span>
        </p>
      ) : null}
    </div>
  );
}
