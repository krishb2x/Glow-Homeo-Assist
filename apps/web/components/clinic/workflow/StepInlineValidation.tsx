"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { StepValidation } from "../../../lib/consultation-validation";
import { cn } from "../../../lib/cn";

/**
 * Advisory hints shown inside the active step (complements the top progress strip).
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
        "rounded-lg border px-3 py-2.5 text-caption-sm",
        missing.length > 0
          ? "border-amber-200/70 bg-amber-50/80 text-amber-950"
          : "border-hs-border/35 bg-hs-cream/50 text-hs-text-secondary",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {missing.length > 0 ? (
        <p>
          <span className="font-semibold text-amber-900">Still needed: </span>
          {missing.join(" · ")}
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <p className={cn("flex items-start gap-1.5", missing.length > 0 && "mt-1.5")}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          <span>{warnings.join(" · ")}</span>
        </p>
      ) : null}
    </div>
  );
}
