"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ConsultationLink } from "./ConsultationLink";
import { consultationStartHref } from "../../lib/consultation-navigation";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import {
  createAppointment,
  fetchAppointmentsRange,
  fetchPatientsPage,
  getToken,
  searchPatientsLight,
  updateAppointment,
  type AppointmentListItem,
  type PatientListItem
} from "../../lib/doctor-api";
import { cn } from "../../lib/cn";
import { friendlyLoadError } from "../../lib/friendly-error";
import { isDemoMode } from "../../lib/demo-mode";
import { useRealtimeChannel } from "../../lib/use-realtime-channel";
import { ErrorState, EmptyState } from "../ui/LoadState";
import { useToast } from "../ui/toast";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { PageSkeleton } from "../ui/skeleton";
import { PageHeader } from "../platform/PageHeader";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY, DS_LINK_ACTION } from "../../lib/desktop-ui";
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
  const [recentPatients, setRecentPatients] = useState<PatientListItem[]>([]);
  const [searchedPatients, setSearchedPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientCache, setSelectedPatientCache] = useState<PatientListItem | null>(null);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [rows, setRows] = useState<AppointmentListItem[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const patientSearchRef = useRef<HTMLInputElement>(null);
  const [startLocal, setStartLocal] = useState(() => localDatetimeInputValue(new Date()));
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [consultationMode, setConsultationMode] = useState<"IN_CLINIC" | "ONLINE">("IN_CLINIC");
  const [notifyPatient, setNotifyPatient] = useState(true);
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
      // Recent patients are shown in the Book-a-slot picker before the doctor
      // starts typing. We never load the entire roster client-side any more
      // (scales to 100k+ patients via the server-side search endpoint).
      const recent = await fetchPatientsPage({
        limit: 12,
        offset: 0,
        sort: "last_visit_at",
        sortDir: "desc"
      });
      setRecentPatients(recent.items);
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

  /**
   * Realtime — when an appointment is created, rescheduled, or cancelled
   * elsewhere (eg. receptionist on another machine, or the patient via the
   * online booking flow), debounce-refresh the week.
   */
  useRealtimeChannel({
    enabled: !isDemoMode(),
    table: "appointments",
    channelKey: "schedule-week",
    onChange: () => {
      void load();
    }
  });

  /**
   * Selected patient pill: keep a local cache so we can render the chip even
   * after the search results have rotated to a different query.
   */
  const selectedPatient = useMemo(() => {
    if (!patientId) return null;
    return (
      selectedPatientCache ??
      recentPatients.find((p) => p.id === patientId) ??
      searchedPatients.find((p) => p.id === patientId) ??
      null
    );
  }, [patientId, selectedPatientCache, recentPatients, searchedPatients]);

  /** Debounced server-side patient search. */
  useEffect(() => {
    if (!bookOpen) return;
    const q = patientSearch.trim();
    if (q.length < 2) {
      setSearchedPatients([]);
      setPatientSearchLoading(false);
      return;
    }
    setPatientSearchLoading(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const items = await searchPatientsLight(q, 15);
          setSearchedPatients(items);
        } catch {
          setSearchedPatients([]);
        } finally {
          setPatientSearchLoading(false);
        }
      })();
    }, 220);
    return () => clearTimeout(handle);
  }, [patientSearch, bookOpen]);

  const filteredPatients = useMemo(() => {
    if (patientSearch.trim().length >= 2) return searchedPatients.slice(0, 12);
    return recentPatients.slice(0, 8);
  }, [patientSearch, searchedPatients, recentPatients]);

  /** Detect overlap with existing same-day appointments. */
  const overlapWarning = useMemo(() => {
    if (!startLocal) return null;
    const startMs = new Date(parseLocalInput(startLocal)).getTime();
    const endMs = startMs + duration * 60_000;
    const clash = rows.find((r) => {
      const rStart = new Date(r.scheduledFor).getTime();
      const rEnd = rStart + (r.durationMinutes ?? 30) * 60_000;
      return startMs < rEnd && rStart < endMs;
    });
    if (!clash) return null;
    return `Overlaps with ${clash.patientName} at ${new Date(clash.scheduledFor).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    })}`;
  }, [rows, startLocal, duration]);

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
        reason: reason.trim() || undefined,
        consultationMode,
        notifyPatient
      });
      await load();
      setReason("");
      setPatientSearch("");
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
    <div className="ds-page w-full min-w-0 max-w-full">
      <PageHeader
        title="Schedule"
        description="Click a slot to book. Drag a visit by the grip to reschedule. Walk-ins can start without a slot."
        action={
          <button
            type="button"
            onClick={() => {
              setStartLocal(localDatetimeInputValue(new Date()));
              setBookOpen(true);
            }}
            className={DS_BTN_PRIMARY}
          >
            Book a slot
          </button>
        }
      />

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
                    <Link href="/consultation" className={DS_BTN_PRIMARY}>
                      Start walk-in
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setStartLocal(localDatetimeInputValue(new Date()));
                        setBookOpen(true);
                      }}
                      className={DS_BTN_SECONDARY}
                    >
                      Book a slot
                    </button>
                  </>
                }
              />
            </div>
          ) : null}

          <section className="ds-card ds-card-pad" aria-label="List">
            <h2 className="font-heading text-body-md font-semibold text-hs-ink">This week</h2>
            <ol className="relative mt-4 space-y-0 border-l-2 border-hs-primary/15 pl-0">
              {rows.map((a) => (
                <li key={a.id} className="relative pb-4 pl-5 last:pb-0">
                  <span
                    className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full border-2 border-hs-paper bg-hs-primary"
                    aria-hidden
                  />
                  <div className="flex flex-col gap-2 py-1 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-caption-sm text-hs-text-secondary">{formatWhen(a.scheduledFor)}</p>
                      <p className="mt-0.5 font-medium text-body-sm text-hs-ink">
                        {a.patientName}
                        {a.consultationMode === "ONLINE" ? (
                          <span className="ml-2 text-caption-sm font-medium text-emerald-700">· Video</span>
                        ) : null}
                      </p>
                      {a.reason ? (
                        <p className="mt-0.5 line-clamp-1 text-caption-sm text-hs-text-secondary">{a.reason}</p>
                      ) : null}
                    </div>
                    <ConsultationLink
                      href={consultationStartHref({
                        patientId: a.patientId,
                        appointmentId: a.id,
                        consultationMode: a.consultationMode === "ONLINE" ? "ONLINE" : "IN_CLINIC"
                      })}
                      className={cn(DS_LINK_ACTION, "shrink-0")}
                    >
                      {a.consultationMode === "ONLINE" ? "Start video →" : "Start visit →"}
                    </ConsultationLink>
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
              <label htmlFor="appt-patient-search" className="text-caption-md font-medium text-hs-ink">
                Patient
              </label>
              <p className="mt-1 text-caption-sm text-hs-text-tertiary">
                Search by name, phone, or patient ID.
              </p>
              {selectedPatient && !patientSearchOpen ? (
                <div className="mt-ds-sm flex items-center justify-between gap-2 rounded-xl border border-hs-primary/30 bg-hs-primary-very-light/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-hs-ink">
                      {selectedPatient.name}
                    </p>
                    <p className="truncate text-caption-sm text-hs-text-secondary">
                      {selectedPatient.phone ? `${selectedPatient.phone} · ` : ""}
                      ID {selectedPatient.id.slice(0, 8)}…
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientId("");
                      setPatientSearch("");
                      setPatientSearchOpen(true);
                      setTimeout(() => patientSearchRef.current?.focus(), 0);
                    }}
                    className="rounded-lg border border-hs-border/50 px-2 py-1 text-caption-sm font-semibold text-hs-text-secondary transition hover:border-hs-primary/40 hover:text-hs-ink"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative mt-ds-sm">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hs-text-tertiary"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    <input
                      id="appt-patient-search"
                      ref={patientSearchRef}
                      type="search"
                      autoComplete="off"
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setPatientSearchOpen(true);
                      }}
                      onFocus={() => setPatientSearchOpen(true)}
                      placeholder="Type name, phone, or patient ID…"
                      className="w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 py-2.5 pl-9 pr-3 text-typo-body shadow-input placeholder:text-hs-text-tertiary/80 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
                    />
                    {patientSearch ? (
                      <button
                        type="button"
                        onClick={() => setPatientSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-hs-text-tertiary hover:text-hs-ink"
                        aria-label="Clear"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  {patientSearchOpen ? (
                    patientSearchLoading ? (
                      <p className="mt-2 flex items-center gap-2 px-1 text-caption-sm text-hs-text-tertiary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        Searching the clinic roster…
                      </p>
                    ) : filteredPatients.length === 0 ? (
                      <p className="mt-2 rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-2 text-caption-sm text-hs-text-tertiary">
                        {patientSearch.trim().length < 2
                          ? "Type at least 2 characters to search across the clinic."
                          : "No patients match."}{" "}
                        <Link href="/patients/new" className="font-semibold text-hs-primary hover:underline">
                          Add a new patient →
                        </Link>
                      </p>
                    ) : (
                      <ul
                        role="listbox"
                        aria-label="Patient results"
                        className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-hs-border/30 bg-hs-paper shadow-ds-sm"
                      >
                        {filteredPatients.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setPatientId(p.id);
                                setSelectedPatientCache(p);
                                setPatientSearch("");
                                setPatientSearchOpen(false);
                              }}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-body-sm transition hover:bg-hs-cream/60"
                              role="option"
                              aria-selected={patientId === p.id}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-hs-ink">
                                  {p.name}
                                </span>
                                <span className="block truncate text-caption-sm text-hs-text-tertiary">
                                  {p.phone ? `${p.phone} · ` : ""}ID {p.id.slice(0, 8)}…
                                </span>
                              </span>
                              {p.lastVisitAt ? (
                                <span className="shrink-0 text-caption-sm text-hs-text-tertiary">
                                  Last visit{" "}
                                  {new Date(p.lastVisitAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric"
                                  })}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </>
              )}
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
            <fieldset className="space-y-2">
              <legend className="text-caption-md font-medium text-hs-ink">Visit type</legend>
              <label className="flex cursor-pointer items-center gap-2 text-typo-body">
                <input
                  type="radio"
                  name="consultationMode"
                  checked={consultationMode === "IN_CLINIC"}
                  onChange={() => setConsultationMode("IN_CLINIC")}
                />
                In-clinic
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-typo-body">
                <input
                  type="radio"
                  name="consultationMode"
                  checked={consultationMode === "ONLINE"}
                  onChange={() => setConsultationMode("ONLINE")}
                />
                Online video (WhatsApp + email invite)
              </label>
            </fieldset>
            {consultationMode === "ONLINE" ? (
              <label className="flex cursor-pointer items-center gap-2 text-typo-body">
                <input
                  type="checkbox"
                  checked={notifyPatient}
                  onChange={(e) => setNotifyPatient(e.target.checked)}
                />
                Send meeting invitation to patient now
              </label>
            ) : null}
            {overlapWarning ? (
              <p
                role="alert"
                className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-caption-sm font-medium text-amber-900"
              >
                ⚠ {overlapWarning}
              </p>
            ) : null}
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
