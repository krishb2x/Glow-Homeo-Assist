"use client";

import { CheckCircle2, FileSignature } from "lucide-react";
import type { ReactNode } from "react";
import { StepShell } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type FinalizeSummaryItem = {
  id: string;
  label: string;
  status: "done" | "missing" | "warn";
  hint?: string;
};

type Props = {
  stepNumber: number;
  items: FinalizeSummaryItem[];
  alreadyFinalized: boolean;
  finalizing: boolean;
  blockedReason?: string;
  outcomeSlot?: ReactNode;
  /** Deprecated — canonical Finalize action lives in the step extras panel. */
  onFinalize?: () => void;
  onDownloadPdf?: () => void;
  onPreviewPdf?: () => void;
};

/**
 * Pre-flight checklist + finalized badge. The "Finalize & send" CTA itself
 * lives in the step extras panel below, where send options (WhatsApp/Email)
 * are configured. Step09 is the status view; extras is the action zone.
 */
export function Step09Finalize({
  stepNumber,
  items,
  alreadyFinalized,
  blockedReason,
  outcomeSlot
}: Props): JSX.Element {
  const missingCount = items.filter((i) => i.status === "missing").length;

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={FileSignature}
      title="Finalize"
      description="Confirm everything is ready, then send below."
      status={alreadyFinalized ? "done" : "active"}
      actions={
        alreadyFinalized ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-caption-sm font-bold text-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Finalized
          </span>
        ) : null
      }
    >
      <div className="space-y-3">
        <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
          Pre-flight checklist
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {items.map((i) => (
            <li
              key={i.id}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-caption-sm",
                i.status === "done" && "border-emerald-200/70 bg-emerald-50/50 text-emerald-900",
                i.status === "warn" && "border-amber-200/70 bg-amber-50/60 text-amber-950",
                i.status === "missing" && "border-rose-200/70 bg-rose-50/60 text-rose-900"
              )}
            >
              <CheckCircle2
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  i.status === "done" && "text-emerald-600",
                  i.status === "warn" && "text-amber-600",
                  i.status === "missing" && "text-rose-600"
                )}
                aria-hidden
              />
              <span className="font-medium">{i.label}</span>
            </li>
          ))}
        </ul>

        {!alreadyFinalized && missingCount > 0 ? (
          <p className="text-caption-sm text-rose-700">
            {missingCount} item{missingCount === 1 ? "" : "s"} missing — complete{" "}
            {missingCount === 1 ? "it" : "them"} before sending.
          </p>
        ) : null}
        {blockedReason ? <p className="text-caption-sm text-rose-700">{blockedReason}</p> : null}

        {outcomeSlot ? <div className="pt-1">{outcomeSlot}</div> : null}
      </div>
    </StepShell>
  );
}
