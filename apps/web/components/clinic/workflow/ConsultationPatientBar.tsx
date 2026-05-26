"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Phone, User } from "lucide-react";
import type { LastCaseOutcome } from "../../../lib/doctor-api";
import { formatVisitAge } from "../../../lib/operational-queue";
import { cn } from "../../../lib/cn";

type Props = {
  patientId: string;
  patientName: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  allergies?: string | null;
  visitType?: string;
  lastVisitAt?: string | null;
  lastCaseOutcome?: LastCaseOutcome | null;
  consultationMode?: "IN_CLINIC" | "ONLINE";
  /** ISO timestamp when this visit started — shown as elapsed session time. */
  startedAt?: string | null;
  /** Today's presenting complaint for wrong-patient prevention. */
  chiefComplaint?: string | null;
  className?: string;
};

function formatVisitDate(iso: string | null | undefined): string {
  if (!iso) return "First visit";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export function ConsultationPatientBar({
  patientId,
  patientName,
  age,
  gender,
  phone,
  allergies,
  visitType,
  lastVisitAt,
  lastCaseOutcome,
  consultationMode,
  startedAt,
  chiefComplaint,
  className
}: Props): JSX.Element {
  const hasAllergies = Boolean(allergies?.trim());
  const visitLabel =
    visitType === "INITIAL" || visitType === "initial" ? "New case" : "Follow-up";
  const modeLabel = consultationMode === "ONLINE" ? "Online" : "In-clinic";

  const sessionAge =
    startedAt && !Number.isNaN(new Date(startedAt).getTime())
      ? formatVisitAge(Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000))
      : null;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-hs-border/40 bg-hs-paper px-3 py-2 sm:px-4",
        className
      )}
      role="region"
      aria-label="Patient context"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-hs-primary/20 bg-hs-primary-very-light/80 text-hs-primary"
          aria-hidden
        >
          <User className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-body-sm font-bold text-hs-ink">{patientName}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption-sm text-hs-text-secondary">
            {age != null ? <span>{age} yrs</span> : null}
            {gender?.trim() ? <span>{gender}</span> : null}
            <span className="rounded-full border border-hs-border/50 bg-hs-cream px-1.5 text-[10px] font-semibold uppercase tracking-wide text-hs-text-tertiary">
              {visitLabel}
            </span>
            <span className="rounded-full border border-hs-primary/25 bg-hs-primary-very-light px-1.5 text-[10px] font-semibold uppercase tracking-wide text-hs-primary">
              {modeLabel}
            </span>
            {sessionAge ? (
              <span className="rounded-full border border-hs-border/50 bg-hs-cream px-1.5 text-[10px] font-semibold text-hs-text-secondary">
                Open {sessionAge}
              </span>
            ) : null}
          </p>
          {chiefComplaint?.trim() ? (
            <p className="mt-0.5 truncate text-caption-sm text-hs-text-secondary">
              <span className="font-semibold text-hs-ink">Today:</span> {chiefComplaint.trim()}
            </p>
          ) : null}
        </div>

        <div className="ml-1 flex flex-wrap items-center gap-3 text-caption-sm text-hs-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 text-hs-text-tertiary" aria-hidden />
            {formatVisitDate(lastVisitAt)}
          </span>
          {lastCaseOutcome ? (
            <span className="capitalize">
              {lastCaseOutcome.outcome.replace(/_/g, " ").toLowerCase()}
            </span>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1 font-medium text-hs-primary hover:underline"
            >
              <Phone className="h-3 w-3" aria-hidden />
              {phone}
            </a>
          ) : null}
        </div>

        {hasAllergies ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-caption-sm font-semibold text-amber-950">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
            {allergies!.length > 36 ? `${allergies!.slice(0, 36)}…` : allergies}
          </span>
        ) : null}

        <Link
          href={`/patients/${encodeURIComponent(patientId)}/timeline`}
          className="ml-auto hidden text-caption-sm font-semibold text-hs-primary hover:underline sm:inline-flex"
        >
          Chart →
        </Link>
      </div>
    </div>
  );
}
