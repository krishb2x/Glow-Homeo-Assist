"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  createAppointment,
  fetchAppointmentsRange,
  fetchPatients,
  getToken,
  updateAppointment,
  type AppointmentListItem,
  type PatientListItem
} from "../../lib/doctor-api";
import { friendlyLoadError } from "../../lib/friendly-error";
import { isDemoMode } from "../../lib/demo-mode";
import { ErrorState, EmptyState } from "../ui/LoadState";
import { useToast } from "../ui/toast";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { PageSkeleton } from "../ui/skeleton";
import { ScheduleWeekGrid, getWeekRangeIso } from "./schedule/ScheduleWeekGrid";

function localDatetimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalInput(s: string): string {
  return new Date(s).toISOString();
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export function SchedulePageClient(): JSX.Element {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [rows, setRows] = useState<AppointmentListItem[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [startLocal, setStartLocal] = useState(() => localDatetimeInputValue(new Date()));
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [listErr, setListErr] = useState<unknown>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [rescheduleErr, setRescheduleErr] = useState<string | null>(null);

  const week = useMemo(() => getWeekRangeIso(weekOffset), [weekOffset]);

  const load = useCallback(async () => {
    setErr(null);
    setListErr(null);
    setLoading(true);
    try {
      const list = await fetchPatients();
      setPatients(list);
      setPatientId((prev) => (prev || (list[0]?.id ?? "")));
    } catch (e) {
      setErr(friendlyLoadError(e));
      setLoading(false);
      return;
    }
    try {
      const appts = await fetchAppointmentsRange(week.from, week.to);
      const sorted = [...appts].sort(
        (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
      );
      setRows(sorted);
    } catch (e) {
      setListErr(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [week.from, week.to]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  const canSubmit = patientId.length > 0 && !saving;

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setSaving(true);
    try {
      await createAppointment({
        patientId,
        scheduledFor: parseLocalInput(startLocal),
        durationMinutes: duration,
        reason: reason.trim() || undefined
      });
      await load();
      setReason("");
      setBookOpen(false);
      showToast({ variant: "success", title: "Slot booked", description: "Added to your schedule." });
    } catch (e) {
      setErr(friendlyLoadError(e));
    } finally {
      setSaving(false);
    }
  }

  const onEmptySlot = useCallback((_dayIndex: number, startIso: string) => {
    setErr(null);
    setStartLocal(localDatetimeInputValue(new Date(startIso)));
    setBookOpen(true);
  }, []);

  const onReschedule = useCallback(
    async (id: string, newIso: string) => {
      setRescheduleErr(null);
      if (isDemoMode()) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, scheduledFor: newIso } : r))
        );
        showToast({ variant: "success", title: "Slot updated", description: "Rescheduled (demo)." });
        return;
      }
      try {
        await updateAppointment(id, { scheduledFor: newIso });
        await load();
        showToast({ variant: "success", title: "Rescheduled", description: "Appointment time updated." });
      } catch (e) {
        setRescheduleErr(friendlyLoadError(e));
        showToast({ variant: "error", title: "Couldn’t reschedule", description: friendlyLoadError(e) });
      }
    },
    [load, showToast]
  );

  return (
    <div className="w-full min-w-0 max-w-full">
      <header className="mb-ds-xl border-b border-hs-border/20 pb-ds-lg">
        <h1 className="font-heading text-typo-hero text-hs-ink">Schedule</h1>
        <p className="mt-ds-sm max-w-2xl text-typo-body text-hs-text-secondary">
          Week view — click a slot to book, drag a visit by the grip to move it. Walk-ins can start from the walk-in
          action without a prior slot.
        </p>
      </header>

      {rescheduleErr ? (
        <div className="mb-ds-md">
          <ErrorState err={new Error(rescheduleErr)} title="Reschedule" onRetry={() => setRescheduleErr(null)} />
        </div>
      ) : null}

      {err && !loading ? (
        <div className="mb-ds-md">
          <ErrorState err={new Error(err)} title="Couldn’t save booking" onRetry={() => void load()} />
        </div>
      ) : null}

      {listErr ? (
        <div className="mb-ds-md">
          <ErrorState err={listErr} title="Couldn’t load schedule" onRetry={() => void load()} />
        </div>
      ) : null}

      {loading ? <PageSkeleton /> : null}

      {!loading && !listErr ? (
        <>
          <section className="mb-ds-xl" aria-label="Week calendar">
            <ScheduleWeekGrid
              appointments={rows}
              weekOffset={weekOffset}
              onWeekOffset={setWeekOffset}
              onEmptySlot={onEmptySlot}
              onReschedule={onReschedule}
            />
          </section>

          {rows.length === 0 ? (
            <div className="mb-ds-lg">
              <EmptyState
                title="No visits this week"
                description="Book from the week grid, or add walk-ins from Consultation when they arrive."
                action={
                  <>
                    <Link
                      href="/consultation"
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-hs-primary px-ds-md text-body-sm font-bold text-white shadow-ds-md"
                    >
                      Start walk-in
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setStartLocal(localDatetimeInputValue(new Date()));
                        setBookOpen(true);
                      }}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-hs-border/50 px-ds-md text-body-sm font-semibold"
                    >
                      Book a slot
                    </button>
                  </>
                }
              />
            </div>
          ) : null}

          <section className="rounded-2xl border border-hs-border/30 bg-hs-paper/95 p-ds-lg shadow-card" aria-label="List">
            <h2 className="font-heading text-heading-sm text-hs-ink">Upcoming (this week)</h2>
            <ol className="relative mt-ds-md space-y-0 border-l-2 border-hs-primary/20 pl-0">
              {rows.map((a) => (
                <li key={a.id} className="relative pb-ds-md pl-6 last:pb-0">
                  <span
                    className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-hs-paper bg-hs-primary shadow-ds-sm"
                    aria-hidden
                  />
                  <div className="flex flex-col gap-3 rounded-xl border border-hs-border/20 bg-hs-cream/20 p-ds-md lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-caption-sm font-medium text-hs-text-secondary">{formatWhen(a.scheduledFor)}</p>
                      <p className="mt-0.5 font-heading text-body-md font-semibold text-hs-ink">{a.patientName}</p>
                      {a.reason ? <p className="mt-0.5 text-typo-body text-hs-text-secondary">{a.reason}</p> : null}
                    </div>
                    <Link
                      href={`/consultation?patientId=${encodeURIComponent(a.patientId)}&appointmentId=${encodeURIComponent(a.id)}`}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-hs-primary px-ds-md text-caption-md font-bold text-white shadow-ds-md"
                    >
                      Start consultation
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}

      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Book a slot"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="quick-book-form"
              variant="primary"
              disabled={!canSubmit}
            >
              {saving ? "Saving…" : "Add to schedule"}
            </Button>
          </>
        }
      >
        {loading ? null : (
          <form id="quick-book-form" onSubmit={(e) => void onSubmit(e)} className="space-y-ds-md">
            <div>
              <label htmlFor="appt-patient" className="text-caption-md font-medium text-hs-ink">
                Patient
              </label>
              <select
                id="appt-patient"
                className="mt-ds-sm w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 py-2.5 pl-3 text-typo-body"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="appt-start" className="text-caption-md font-medium text-hs-ink">
                Start
              </label>
              <input
                id="appt-start"
                type="datetime-local"
                className="mt-ds-sm w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 py-2.5 px-3 text-typo-body"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="appt-dur" className="text-caption-md font-medium text-hs-ink">
                Duration (minutes)
              </label>
              <input
                id="appt-dur"
                type="number"
                min={10}
                max={180}
                step={5}
                className="mt-ds-sm w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 py-2.5 px-3 text-typo-body"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="appt-reason" className="text-caption-md font-medium text-hs-ink">
                Reason (optional)
              </label>
              <input
                id="appt-reason"
                type="text"
                className="mt-ds-sm w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 py-2.5 px-3 text-typo-body"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {err ? <p className="text-caption-sm text-hs-danger">{err}</p> : null}
            {saving ? (
              <p className="flex items-center gap-2 text-typo-body text-hs-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </p>
            ) : null}
          </form>
        )}
      </Modal>
    </div>
  );
}
