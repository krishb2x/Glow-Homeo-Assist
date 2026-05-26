"use client";

import Link from "next/link";
import { ConsultationLink } from "../ConsultationLink";
import { liveConsultationHref, consultationStartHref } from "../../../lib/consultation-navigation";
import { formatTimeLabel } from "./home-utils";
import type { MyDayAppointment, MyDayResponse } from "../../../lib/doctor-api";
import { cn } from "../../../lib/cn";
import { AlertCircle, Clock, UserCheck, Video } from "lucide-react";

type Props = {
  myDay: MyDayResponse | null;
  upcomingToday: MyDayAppointment[];
  now: Date;
  className?: string;
};

/** Clinic operations strip — online visits, waiting patients, upcoming video slots. */
export function TelemedicineOpsPanel({ myDay, upcomingToday, now, className }: Props): JSX.Element | null {
  const onlineLive = myDay?.activeConsultations?.online ?? [];
  const waiting = onlineLive.filter((v) => v.patientWaitingSince);
  const upcomingOnline = upcomingToday.filter(
    (a) => a.consultationMode === "ONLINE" && new Date(a.scheduledFor).getTime() >= now.getTime()
  );
  const nextOnline = upcomingOnline[0];

  if (waiting.length === 0 && onlineLive.length === 0 && upcomingOnline.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-sm",
        className
      )}
      aria-label="Telemedicine operations"
    >
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-sky-700" aria-hidden />
        <h2 className="font-heading text-body-sm font-semibold text-sky-950">Video consultations</h2>
      </div>

      {waiting.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {waiting.map((v) => (
            <li key={v.id}>
              <ConsultationLink
                href={liveConsultationHref(v.id)}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 transition hover:border-amber-400"
              >
                <span className="flex items-center gap-2 text-body-sm font-medium text-amber-950">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  {v.patientName} — waiting in lobby
                </span>
                <span className="text-caption-sm font-semibold text-amber-800">Open consult →</span>
              </ConsultationLink>
            </li>
          ))}
        </ul>
      ) : null}

      {onlineLive.length > 0 ? (
        <div className="mt-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-sky-800/70">Live now</p>
          <ul className="mt-1.5 space-y-1.5">
            {onlineLive.slice(0, 4).map((v) => (
              <li key={v.id}>
                <ConsultationLink
                  href={liveConsultationHref(v.id)}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-body-sm text-sky-950 hover:bg-sky-100/60"
                >
                  <span>{v.patientName}</span>
                  <span className="text-caption-sm text-sky-700">
                    {v.videoStatus === "LIVE" ? "In call" : "Open room"}
                  </span>
                </ConsultationLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {nextOnline ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-sky-200/80 bg-white/80 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-sky-800/70">Up next</p>
            <p className="truncate text-body-sm font-medium text-sky-950">
              {nextOnline.patientName} · {formatTimeLabel(nextOnline.scheduledFor)}
            </p>
          </div>
          <ConsultationLink
            href={consultationStartHref({
              patientId: nextOnline.patientId,
              appointmentId: nextOnline.id,
              consultationMode: "ONLINE"
            })}
            className="shrink-0 rounded-lg bg-sky-700 px-3 py-1.5 text-caption-sm font-semibold text-white hover:bg-sky-800"
          >
            Start
          </ConsultationLink>
        </div>
      ) : null}

      {waiting.length === 0 && onlineLive.length === 0 && upcomingOnline.length > 0 ? (
        <p className="mt-2 flex items-center gap-1.5 text-caption-sm text-sky-800/70">
          <Clock className="h-3.5 w-3.5" />
          {upcomingOnline.length} online visit{upcomingOnline.length === 1 ? "" : "s"} scheduled today
        </p>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 text-[0.65rem] text-sky-900/55">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        Patients join via WhatsApp link — no app install required.
      </p>
    </section>
  );
}
