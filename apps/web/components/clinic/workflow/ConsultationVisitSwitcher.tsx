"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import type { ActiveVisitRow } from "../../../lib/operational-queue";
import { formatVisitAge } from "../../../lib/operational-queue";
import { cn } from "../../../lib/cn";

type Props = {
  visits: ActiveVisitRow[];
  currentConsultationId: string;
  className?: string;
};

/**
 * Compact in-consult switcher — surfaces other open visits without leaving the workspace.
 * Enterprise EMR pattern: always know how many patients are still in progress.
 */
export function ConsultationVisitSwitcher({
  visits,
  currentConsultationId,
  className
}: Props): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const others = visits.filter((v) => v.id !== currentConsultationId);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (others.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.6875rem] font-medium text-neutral-500 transition duration-200 hover:bg-black/[0.04] hover:text-neutral-700"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Users className="h-3 w-3" aria-hidden />
        <span className="tabular-nums">{others.length + 1}</span>
        <span className="hidden sm:inline">active</span>
        <ChevronDown className={cn("h-3 w-3 transition duration-200", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
        >
          <p className="border-b border-black/[0.06] px-3 py-2 text-[0.6875rem] font-medium text-neutral-400">
            Switch visit
          </p>
          <ul className="max-h-64 overflow-y-auto py-1">
            {others.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/consultation/${encodeURIComponent(v.id)}`}
                  className="flex items-start gap-2 px-3 py-2 text-left transition duration-200 hover:bg-black/[0.03]"
                  onClick={() => setOpen(false)}
                >
                  <span
                    className={cn(
                      "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                      v.stale ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-semibold text-hs-ink">
                      {v.patientName}
                    </span>
                    <span className="block text-caption-sm text-hs-text-tertiary">
                      {formatVisitAge(v.ageMinutes)} · {v.mode === "ONLINE" ? "Online" : "In-clinic"}
                      {v.stale ? " · stale" : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
