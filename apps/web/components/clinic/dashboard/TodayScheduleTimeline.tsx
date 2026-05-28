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
                  "relative pb-5 last:pb-0 transition-opacity duration-300",
                  status === "past" && "opacity-50"
                )}
              >
                {/* Bullet indicator with inner dots */}
                <div
                  className={cn(
                    "absolute -left-[calc(1rem+0.42rem)] top-3.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-hs-paper ring-2 ring-hs-paper sm:-left-[calc(1.25rem+0.42rem)]",
                    status === "current" && "ring-hs-primary/30",
                    status === "next" && "ring-hs-warning/30",
                    status === "upcoming" && "ring-hs-border",
                    status === "past" && "ring-hs-border/60"
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      status === "current" && "bg-hs-primary scale-125 animate-pulse",
                      status === "next" && "bg-hs-warning",
                      status === "upcoming" && "bg-hs-text-tertiary",
                      status === "past" && "bg-hs-border-dark"
                    )}
                  />
                </div>

                <article
                  className={cn(
                    "rounded-2xl border px-4 py-3.5 transition-all duration-300 hover:translate-x-1",
                    status === "current" && "border-hs-primary/30 bg-hs-primary-very-light/40 shadow-ds-sm ring-1 ring-hs-primary/10",
                    status === "next" && "border-hs-warning/30 bg-amber-50/40 shadow-sm",
                    status === "upcoming" && "border-hs-border/20 bg-hs-paper hover:border-hs-primary/20 hover:shadow-ds-sm",
                    status === "past" && "border-hs-border/10 bg-hs-paper/40"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm font-bold text-hs-ink">{a.patientName}</p>
                        {a.consultationMode === "ONLINE" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700 border border-sky-200/50">
                            <Video className="h-2.5 w-2.5" aria-hidden />
                            Video
                          </span>
                        ) : null}
                        <PatientTagBadges tags={[appointmentDisplayTag(a, rosterById.get(a.patientId))]} />
                        {status === "current" ? (
                          <span className="rounded-full bg-hs-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            In progress
                          </span>
                        ) : null}
                        {status === "next" ? (
                          <span className="rounded-full border border-amber-300/50 bg-amber-100/70 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900">
                            Up next
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-hs-text-secondary flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-hs-text-tertiary" />
                        <span>{formatTimeLabel(a.scheduledFor)} · {a.durationMinutes} min</span>
                        {a.chiefComplaint ? (
                          <>
                            <span className="text-hs-border-dark">•</span>
                            <span className="text-hs-text-tertiary truncate">{a.chiefComplaint}</span>
                          </>
                        ) : ""}
                      </p>
                    </div>
                    <ConsultationLink
                      href={consultationStartHref({
                        patientId: a.patientId,
                        appointmentId: a.id,
                        consultationMode: a.consultationMode
                      })}
                      className={cn(
                        "shrink-0 rounded-lg px-3.5 py-1.5 text-caption-sm font-bold transition-all duration-200 active:scale-[0.97]",
                        status === "past"
                          ? "border border-hs-border/40 bg-hs-cream/30 text-hs-text-secondary hover:border-hs-primary/30 hover:bg-hs-primary-very-light/20"
                          : "bg-hs-primary text-white hover:bg-hs-primary-light shadow-sm"
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
