"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Calendar, FileEdit, Inbox, MessageSquare, PlayCircle, Sparkles } from "lucide-react";
import type { MyDayAppointment, MyDayResponse } from "../../../lib/doctor-api";
import { formatTimeLabel } from "./home-utils";
import type { LastCase } from "../../../lib/workflow-storage";

type Action = {
  id: string;
  title: string;
  hint: string;
  href: string;
  cta: string;
  primary: boolean;
  icon: typeof PlayCircle;
};

function buildActions(
  lastCase: LastCase | null,
  nextToday: MyDayAppointment | null,
  myDay: MyDayResponse | null
): Action[] {
  const out: Action[] = [];
  if (lastCase && lastCase.visitStatus === "in_progress") {
    out.push({
      id: "resume",
      title: "Resume open consultation",
      hint: lastCase.patientName ? `With ${lastCase.patientName}` : "In progress",
      href: `/consultation/${encodeURIComponent(lastCase.consultationId)}`,
      cta: "Continue",
      primary: true,
      icon: PlayCircle
    });
  }
  if (nextToday) {
    out.push({
      id: "next",
      title: `Next visit · ${formatTimeLabel(nextToday.scheduledFor)}`,
      hint: nextToday.patientName,
      href: `/consultation?patientId=${encodeURIComponent(nextToday.patientId)}&appointmentId=${encodeURIComponent(nextToday.id)}`,
      cta: "Start",
      primary: out.length === 0,
      icon: Calendar
    });
  }
  const f = myDay?.followUps?.find((x) => x.overdue) ?? myDay?.followUps?.[0];
  if (f) {
    out.push({
      id: "fu",
      title: f.overdue ? "Overdue follow-up" : "Follow-up",
      hint: `${f.patientName} — ${f.title}`,
      href: `/consultation?patientId=${encodeURIComponent(f.patientId)}`,
      cta: "Start visit",
      primary: out.length === 0,
      icon: Inbox
    });
  }
  const note = (myDay?.needsNoteFinalization ?? [])[0];
  if (note) {
    out.push({
      id: "note",
      title: "Note needs finalization",
      hint: note.patientName,
      href: `/consultation/${encodeURIComponent(note.consultationId)}`,
      cta: "Open",
      primary: out.length === 0,
      icon: FileEdit
    });
  }
  if (out.length === 0) {
    out.push({
      id: "ok",
      title: "You are up to date",
      hint: "Check the schedule or start a visit when a patient arrives.",
      href: "/appointments",
      cta: "Schedule",
      primary: true,
      icon: Calendar
    });
  }
  return out.slice(0, 4);
}

export function SmartNextActions({
  lastCase,
  nextToday,
  myDay
}: {
  lastCase: LastCase | null;
  nextToday: MyDayAppointment | null;
  myDay: MyDayResponse | null;
}): JSX.Element {
  const actions = useMemo(
    () => buildActions(lastCase, nextToday, myDay),
    [lastCase, nextToday, myDay]
  );

  return (
    <section
      className="rounded-2xl border-2 border-hs-primary/15 bg-gradient-to-br from-hs-card to-hs-primary-very-light/35 p-5 shadow-card transition duration-200 hover:border-hs-primary/30 hover:shadow-md sm:p-6"
      aria-label="What to do next"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-hs-ink">
        <Sparkles className="h-4 w-4 text-hs-primary" strokeWidth={2.25} />
        What to do next
      </div>
      <ul className="mt-4 space-y-2" role="list">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.id}>
              <Link
                href={a.href}
                className={
                  "group flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition " +
                  (a.primary
                    ? "border-hs-primary/30 bg-hs-paper/95 shadow-sm hover:border-hs-primary/50 hover:shadow"
                    : "border-hs-border/30 bg-hs-paper/70 hover:border-hs-border/60")
                }
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-hs-ink group-hover:text-hs-primary">{a.title}</p>
                  <p className="mt-0.5 truncate text-xs text-hs-text-secondary">{a.hint}</p>
                </div>
                <span
                  className={
                    "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition " +
                    (a.primary
                      ? "bg-hs-primary text-white group-hover:bg-hs-primary-light"
                      : "bg-hs-cream/90 text-hs-ink group-hover:bg-hs-primary-very-light/80")
                  }
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {a.cta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-hs-text-tertiary">
        <Link href="/messages" className="inline-flex items-center gap-0.5 font-medium text-hs-primary hover:underline">
          Messages
          <MessageSquare className="h-3 w-3" />
        </Link>
        <span aria-hidden>·</span>
        <Link href="/follow-ups" className="font-medium text-hs-primary hover:underline">
          All follow-ups
          <ArrowRight className="ml-0.5 inline h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
