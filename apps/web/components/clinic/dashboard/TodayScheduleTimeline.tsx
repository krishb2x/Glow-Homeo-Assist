"use client";

import Link from "next/link";
import { ConsultationLink } from "../ConsultationLink";
import { consultationStartHref } from "../../../lib/consultation-navigation";
import { useMemo } from "react";
import { Clock, Video } from "lucide-react";
import type { MyDayAppointment, PatientListItem } from "../../../lib/doctor-api";
import { appointmentDisplayTag } from "../../../lib/appointment-display-tag";
import { formatTimeLabel } from "./home-utils";
import { PatientTagBadges } from "../PatientTagBadges";
import { cn } from "../../../lib/cn";

type SlotStatus = "past" | "current" | "next" | "upcoming";

function slotStatus(
  scheduledFor: string,
  durationMinutes: number,
  now: Date,
  isNextFuture: boolean
): SlotStatus {
  const start = new Date(scheduledFor).getTime();
  const end = start + durationMinutes * 60_000;
  const t = now.getTime();
  if (t >= end) return "past";
  if (t >= start && t < end) return "current";
  if (isNextFuture) return "next";
  return "upcoming";
}

type Props = {
  appointments: MyDayAppointment[];
  rosterById: Map<string, PatientListItem | undefined>;
  now: Date;
};

export function TodayScheduleTimeline({ appointments, rosterById, now }: Props): JSX.Element {
  const sorted = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()),
    [appointments]
  );

  const nextFutureId = useMemo(() => {
    const t = now.getTime();
    const f = sorted.find((a) => new Date(a.scheduledFor).getTime() + a.durationMinutes * 60_000 > t);
    return f?.id ?? null;
  }, [sorted, now]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPercent = (nowMinutes / (24 * 60)) * 100;

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-hs-border/50 bg-hs-cream/40 px-4 py-6 text-center text-body-sm text-hs-text-tertiary">
        No appointments scheduled for today.{" "}
        <Link href="/appointments" className="font-semibold text-hs-primary hover:underline">
          Add slots →
        </Link>
      </p>
    );
  }

  let insertedNowMarker = false;

  return (
    <div className="relative">
      {/* Day progress rail */}
      <div className="mb-4 hidden h-1.5 overflow-hidden rounded-full bg-hs-cream sm:block" aria-hidden>
        <div
          className="h-full rounded-full bg-hs-primary/35 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, nowPercent))}%` }}
        />
      </div>

      <ul className="relative space-y-0 border-l-2 border-hs-border/40 pl-4 sm:pl-5">
        {sorted.map((a) => {
          const status = slotStatus(a.scheduledFor, a.durationMinutes, now, a.id === nextFutureId);
          const start = new Date(a.scheduledFor);
          const showNowBefore =
            !insertedNowMarker &&
            nextFutureId === a.id &&
            now.getTime() < start.getTime();

          if (showNowBefore) {
            insertedNowMarker = true;
          }

          const rows = (
            <>
              {showNowBefore ? (
                <li key={`now-${a.id}`} className="relative -ml-[calc(1rem+1px)] pb-3 sm:-ml-[calc(1.25rem+1px)]">
                  <div className="flex items-center gap-2">
                    <span className="absolute -left-[0.5625rem] flex h-3 w-3 rounded-full bg-hs-primary ring-2 ring-hs-paper" aria-hidden />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-hs-primary/35 bg-hs-primary-very-light px-2.5 py-0.5 text-caption-sm font-bold text-hs-primary">
                      <Clock className="h-3 w-3" aria-hidden />
                      Now · {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                </li>
              ) : null}
              <li
                key={a.id}
                className={cn(
                  "relative pb-4 last:pb-0",
                  status === "past" && "opacity-55"
                )}
              >
                <span
                  className={cn(
                    "absolute -left-[calc(1rem+0.3125rem)] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-hs-paper sm:-left-[calc(1.25rem+0.3125rem)]",
                    status === "current" && "bg-hs-primary animate-pulse",
                    status === "next" && "bg-hs-warning",
                    status === "upcoming" && "bg-hs-border-dark",
                    status === "past" && "bg-hs-text-tertiary"
                  )}
                  aria-hidden
                />
                <article
                  className={cn(
                    "rounded-xl border px-3.5 py-3 transition",
                    status === "current" && "border-hs-primary/40 bg-hs-primary-very-light/50 shadow-ds-sm ring-1 ring-hs-primary/15",
                    status === "next" && "border-hs-warning/40 bg-amber-50/50",
                    status === "upcoming" && "border-hs-border/30 bg-hs-cream/40",
                    status === "past" && "border-hs-border/25 bg-hs-paper/80"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm font-semibold text-hs-ink">{a.patientName}</p>
                        {a.consultationMode === "ONLINE" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                            <Video className="h-3 w-3" aria-hidden />
                            Video
                          </span>
                        ) : null}
                        <PatientTagBadges tags={[appointmentDisplayTag(a, rosterById.get(a.patientId))]} />
                        {status === "current" ? (
                          <span className="rounded-full bg-hs-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            In progress
                          </span>
                        ) : null}
                        {status === "next" ? (
                          <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                            Up next
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-caption-sm text-hs-text-secondary">
                        {formatTimeLabel(a.scheduledFor)} · {a.durationMinutes} min
                        {a.chiefComplaint ? ` · ${a.chiefComplaint}` : ""}
                      </p>
                    </div>
                    <ConsultationLink
                      href={consultationStartHref({
                        patientId: a.patientId,
                        appointmentId: a.id,
                        consultationMode: a.consultationMode
                      })}
                      className={cn(
                        "shrink-0 rounded-lg px-3 py-1.5 text-caption-sm font-semibold transition",
                        status === "past"
                          ? "border border-hs-border/50 text-hs-text-secondary hover:border-hs-primary/30"
                          : "bg-hs-primary text-white hover:bg-hs-primary-light"
                      )}
                    >
                      {status === "past" ? "Open" : "Start"}
                    </ConsultationLink>
                  </div>
                </article>
              </li>
            </>
          );

          return rows;
        })}

        {!insertedNowMarker && sorted.length > 0 && now.getTime() > new Date(sorted[sorted.length - 1]!.scheduledFor).getTime() ? (
          <li className="relative -ml-[calc(1rem+1px)] pt-1 sm:-ml-[calc(1.25rem+1px)]">
            <span className="inline-flex items-center gap-1.5 text-caption-sm text-hs-text-tertiary">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              No more visits scheduled today
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
