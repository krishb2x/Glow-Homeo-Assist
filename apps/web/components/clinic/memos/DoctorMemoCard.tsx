"use client";

import { AlertCircle, Check, Clock, Pin, PinOff, X } from "lucide-react";
import type { DoctorMemo } from "../../../lib/doctor-api";
import { cn } from "../../../lib/cn";
import { KIND_LABEL, formatMemoDue } from "./memo-utils";

type Props = {
  memo: DoctorMemo;
  compact?: boolean;
  onComplete?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  className?: string;
};

export function DoctorMemoCard({
  memo,
  compact = false,
  onComplete,
  onDismiss,
  onTogglePin,
  className
}: Props): JSX.Element {
  const dueLabel = formatMemoDue(memo.dueAt);
  const isUrgent = memo.priority === "urgent" || memo.overdue;

  return (
    <article
      className={cn(
        "group relative rounded-xl border bg-hs-paper transition",
        memo.pinned ? "border-hs-primary/35 shadow-ds-sm" : "border-hs-border/30",
        isUrgent && memo.status === "open" && "border-l-[3px] border-l-amber-500",
        compact ? "px-3 py-2" : "px-3.5 py-2.5",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-hs-border/40 bg-hs-cream/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hs-text-secondary">
              {KIND_LABEL[memo.kind]}
            </span>
            {memo.pinned ? (
              <Pin className="h-3 w-3 text-hs-primary" aria-label="Pinned" />
            ) : null}
            {memo.priority === "urgent" ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-800">
                <AlertCircle className="h-3 w-3" aria-hidden />
                Urgent
              </span>
            ) : null}
            {memo.overdue ? (
              <span className="text-[10px] font-semibold text-rose-700">Overdue</span>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-1 text-hs-ink leading-snug",
              compact ? "line-clamp-2 text-caption-sm" : "text-body-sm"
            )}
          >
            {memo.body}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-hs-text-tertiary">
            {memo.patientName ? (
              <span className="font-medium text-hs-text-secondary">{memo.patientName}</span>
            ) : (
              <span>Clinic</span>
            )}
            {dueLabel ? (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" aria-hidden />
                {dueLabel}
              </span>
            ) : null}
          </div>
        </div>

        {memo.status === "open" ? (
          <div className="flex shrink-0 flex-col gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            {onComplete ? (
              <button
                type="button"
                onClick={() => onComplete(memo.id)}
                title="Mark done"
                className="rounded-lg p-1 text-hs-text-tertiary transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
            {onTogglePin ? (
              <button
                type="button"
                onClick={() => onTogglePin(memo.id, !memo.pinned)}
                title={memo.pinned ? "Unpin" : "Pin"}
                className="rounded-lg p-1 text-hs-text-tertiary transition hover:bg-hs-cream hover:text-hs-primary"
              >
                {memo.pinned ? (
                  <PinOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Pin className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={() => onDismiss(memo.id)}
                title="Dismiss"
                className="rounded-lg p-1 text-hs-text-tertiary transition hover:bg-hs-cream hover:text-hs-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
