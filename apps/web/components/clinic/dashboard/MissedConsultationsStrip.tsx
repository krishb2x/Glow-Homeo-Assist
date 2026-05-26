"use client";

import type { MyDayResponse } from "../../../lib/doctor-api";
import { formatTimeLabel } from "./home-utils";

type Props = {
  myDay: MyDayResponse | null;
  className?: string;
};

/** Surfaces today's missed online consultations for ops follow-up. */
export function MissedConsultationsStrip({ myDay, className }: Props): JSX.Element | null {
  const missed = myDay?.missedConsultationsToday ?? [];
  if (missed.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 ${className ?? ""}`}
      role="status"
    >
      <p className="text-caption-sm font-semibold uppercase tracking-wide text-amber-900/80">
        Missed consultations today
      </p>
      <ul className="mt-2 space-y-1.5">
        {missed.map((m) => (
          <li key={m.appointmentId} className="flex flex-wrap items-center gap-x-2 text-body-sm text-amber-950">
            <span className="font-medium">{m.patientName}</span>
            <span className="text-amber-800/70">{formatTimeLabel(m.scheduledFor)}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase ${
                m.noShowNotified
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {m.noShowNotified ? "WhatsApp queued" : "Notify pending"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
