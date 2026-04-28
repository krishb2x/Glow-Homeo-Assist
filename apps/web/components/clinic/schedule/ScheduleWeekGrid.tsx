"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, GripVertical, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/cn";
import type { AppointmentListItem } from "../../../lib/doctor-api";
import { startOfWeekMonday } from "./schedule-helpers";

const START_H = 8;
const END_H = 19;
const SLOT_MIN = 30;
const SLOTS = ((END_H - START_H) * 60) / SLOT_MIN; // 22
const SLOT_H = 2; // rem per slot (30 min)

/** For API range queries aligned to the same week the grid uses */
export function getWeekRangeIso(weekOffset: number): { from: string; to: string } {
  const mon = startOfWeekMonday(new Date());
  mon.setDate(mon.getDate() + weekOffset * 7);
  const to = new Date(mon);
  to.setDate(to.getDate() + 7);
  return { from: mon.toISOString(), to: to.toISOString() };
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDayTitle(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function slotToDate(weekStart: Date, dayIndex: number, slotIndex: number): Date {
  const day = addDays(weekStart, dayIndex);
  const totalM = START_H * 60 + slotIndex * SLOT_MIN;
  const hh = Math.floor(totalM / 60);
  const mm = totalM % 60;
  day.setHours(hh, mm, 0, 0);
  return day;
}

function layoutInColumn(a: AppointmentListItem, dayStart: Date): { startSlot: number; span: number } | null {
  const t = new Date(a.scheduledFor);
  if (t.toDateString() !== dayStart.toDateString()) return null;
  const mins = t.getHours() * 60 + t.getMinutes() - START_H * 60;
  if (mins < 0 || mins >= (END_H - START_H) * 60) return null;
  const startSlot = Math.floor(mins / SLOT_MIN);
  if (startSlot >= SLOTS) return null;
  const span = Math.min(Math.max(1, Math.ceil(a.durationMinutes / SLOT_MIN)), SLOTS - startSlot);
  return { startSlot, span };
}

type ScheduleWeekGridProps = {
  appointments: AppointmentListItem[];
  weekOffset: number;
  onWeekOffset: (d: number) => void;
  onEmptySlot: (dayIndex: number, startIso: string) => void;
  onReschedule: (id: string, newScheduledForIso: string) => void;
};

export function ScheduleWeekGrid({
  appointments,
  weekOffset,
  onWeekOffset,
  onEmptySlot,
  onReschedule
}: ScheduleWeekGridProps): JSX.Element {
  const weekStart = useMemo(() => {
    const base = new Date();
    const mon = startOfWeekMonday(base);
    mon.setDate(mon.getDate() + weekOffset * 7);
    return mon;
  }, [weekOffset]);

  const byDay = useMemo(() => {
    const out: AppointmentListItem[][] = Array.from({ length: 7 }, () => []);
    for (const a of appointments) {
      const t = new Date(a.scheduledFor);
      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        if (t.getFullYear() === day.getFullYear() && t.getMonth() === day.getMonth() && t.getDate() === day.getDate()) {
          if (layoutInColumn(a, day)) out[d]!.push(a);
          break;
        }
      }
    }
    return out;
  }, [appointments, weekStart]);

  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/appointment-id", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent, dayIndex: number, slotIndex: number) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/appointment-id");
      if (!id) return;
      onReschedule(id, slotToDate(weekStart, dayIndex, slotIndex).toISOString());
    },
    [onReschedule, weekStart]
  );

  return (
    <div className="w-full min-w-0">
      <div className="mb-ds-md flex flex-wrap items-center justify-between gap-ds-md">
        <div className="flex items-center gap-ds-sm">
          <button
            type="button"
            onClick={() => onWeekOffset(weekOffset - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hs-border/50 bg-hs-paper text-hs-ink transition duration-200 hover:border-hs-primary/35"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onWeekOffset(weekOffset + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hs-border/50 bg-hs-paper text-hs-ink transition duration-200 hover:border-hs-primary/35"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="font-heading text-body-md font-semibold text-hs-ink">Week of {formatDayTitle(weekStart)}</p>
        </div>
        <Link
          href="/consultation"
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border-2 border-hs-primary/30 bg-hs-paper px-ds-md text-caption-md font-semibold text-hs-primary transition duration-200 hover:bg-hs-primary-very-light/80"
        >
          <Stethoscope className="h-4 w-4" />
          Walk-in visit
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-hs-border/30 bg-hs-paper/95 shadow-card">
        <div className="flex min-w-[1040px]">
          <div
            className="flex w-16 shrink-0 flex-col border-r border-hs-border/25 bg-hs-cream/40"
            style={{ height: `calc(2.5rem + ${SLOTS} * ${SLOT_H}rem)` }}
          >
            <div className="h-10 shrink-0 border-b border-hs-border/20" />
            {Array.from({ length: SLOTS }, (_, s) => {
              const m = START_H * 60 + s * SLOT_MIN;
              const hh = Math.floor(m / 60);
              const mm = m % 60;
              const label = new Date(2000, 0, 1, hh, mm).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit"
              });
              return (
                <div
                  key={s}
                  className="shrink-0 border-b border-hs-border/10 pr-1 text-right text-[0.65rem] leading-none text-hs-text-tertiary"
                  style={{ height: `${SLOT_H}rem` }}
                >
                  {s % 2 === 0 ? label : ""}
                </div>
              );
            })}
          </div>

          {Array.from({ length: 7 }, (_, dayIndex) => {
            const day = addDays(weekStart, dayIndex);
            const dayApts = byDay[dayIndex] ?? [];
            const today = new Date();
            const isToday =
              day.getFullYear() === today.getFullYear() &&
              day.getMonth() === today.getMonth() &&
              day.getDate() === today.getDate();
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-w-[8.5rem] flex-1 border-r border-hs-border/20 last:border-r-0",
                  isToday && "bg-hs-primary-very-light/35"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 flex-col items-center justify-center border-b border-hs-border/20 px-1",
                    isToday ? "bg-hs-primary-very-light/80" : "bg-hs-cream/50"
                  )}
                >
                  <span
                    className={cn(
                      "text-caption-sm font-medium",
                      isToday ? "text-hs-primary" : "text-hs-text-tertiary"
                    )}
                  >
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span
                    className={cn(
                      "font-heading text-body-sm font-semibold",
                      isToday ? "text-hs-primary" : "text-hs-ink"
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="relative" style={{ height: `${SLOTS * SLOT_H}rem` }}>
                  {Array.from({ length: SLOTS }, (_, slotIndex) => (
                    <button
                      key={slotIndex}
                      type="button"
                      className={cn(
                        "absolute left-0 right-0 w-full border-b border-hs-border/10 transition duration-200 hover:bg-hs-primary-very-light/25",
                        slotIndex % 2 === 0 ? "bg-hs-cream/15" : "bg-hs-paper/20"
                      )}
                      style={{ top: `${slotIndex * SLOT_H}rem`, height: `${SLOT_H}rem` }}
                      onClick={() => onEmptySlot(dayIndex, slotToDate(weekStart, dayIndex, slotIndex).toISOString())}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => onDrop(e, dayIndex, slotIndex)}
                    />
                  ))}
                  {dayApts.map((a) => {
                    const pos = layoutInColumn(a, day);
                    if (!pos) return null;
                    return (
                      <motion.div
                        key={a.id}
                        layout
                        className="group absolute left-0.5 right-0.5 z-10 flex overflow-hidden rounded-lg border border-hs-primary/30 bg-hs-primary-very-light/95 shadow-ds-sm"
                        style={{
                          top: `${pos.startSlot * SLOT_H}rem`,
                          height: `${pos.span * SLOT_H}rem`
                        }}
                        whileHover={{ y: -1, boxShadow: "var(--ds-shadow-md)" }}
                        transition={{ duration: 0.2 }}
                        title="Drag handle to reschedule in another time slot"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(e) => onDragStart(e, a.id)}
                          className="flex w-4 shrink-0 cursor-grab items-center justify-center border-r border-hs-border/20 bg-hs-cream/50 text-hs-text-tertiary active:cursor-grabbing"
                          aria-label="Drag to reschedule"
                        >
                          <GripVertical className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1 px-0.5 py-0.5 text-left">
                          <Link
                            href={`/consultation?patientId=${encodeURIComponent(a.patientId)}&appointmentId=${encodeURIComponent(a.id)}`}
                            className="line-clamp-2 text-caption-sm font-semibold leading-tight text-hs-ink"
                          >
                            {a.patientName}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            {a.status === "IN_PROGRESS" ? (
                              <span className="inline-flex items-center rounded bg-hs-primary px-1 text-[0.55rem] font-bold uppercase tracking-wide text-white">
                                Live
                              </span>
                            ) : null}
                            {a.status === "CONFIRMED" ? (
                              <span className="inline-flex items-center rounded border border-hs-primary/30 bg-hs-paper px-1 text-[0.55rem] font-semibold uppercase tracking-wide text-hs-primary">
                                Booked
                              </span>
                            ) : null}
                            {a.reason ? (
                              <span className="line-clamp-1 text-[0.6rem] text-hs-text-secondary">{a.reason}</span>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
