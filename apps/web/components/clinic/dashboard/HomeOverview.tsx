"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ConsultationLink } from "../ConsultationLink";
import {
  consultationStartHref,
  liveConsultationHref,
  openConsultationTab,
  shouldOpenConsultationInNewTab
} from "../../../lib/consultation-navigation";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Mic,
  Search,
  Users,
  X
} from "lucide-react";
import {
  fetchDashboardRecent,
  fetchDoctorInbox,
  fetchMyDay,
  fetchPatientsPage,
  fetchWorkspaceContext,
  getToken,
  searchPatientsLight,
  type DashboardRecentItem,
  type InboxMessageItem,
  type MyDayResponse,
  type PatientListItem,
  type WorkspaceContext
} from "../../../lib/doctor-api";
import { getLastCase, type LastCase } from "../../../lib/workflow-storage";
import { ErrorState } from "../../ui/LoadState";
import { PatientTagBadges } from "../PatientTagBadges";
import { ClinicalWorkflowOverview } from "../workflow/ClinicalWorkflowOverview";
import { DashboardMemoWidget } from "../memos/DashboardMemoWidget";
import { TodayScheduleTimeline } from "./TodayScheduleTimeline";
import { OperationalQueuePanel } from "./OperationalQueuePanel";
import { TelemedicineOpsPanel } from "./TelemedicineOpsPanel";
import { MissedConsultationsStrip } from "./MissedConsultationsStrip";
import { DeadLetterJobsPanel } from "./DeadLetterJobsPanel";
import { DashboardRightRail } from "./DashboardRightRail";
import {
  formatTimeLabel,
  greetingForDate,
  initialsFromName,
  isLocalToday,
  nextTodaySlot,
  sameLocalDay
} from "./home-utils";

function DoctorAvatar({ name }: { name: string }): JSX.Element {
  const i = initialsFromName(name);
  return (
    <div
      className="font-heading flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-lg font-semibold text-white shadow-xl ring-1 ring-white/10 backdrop-blur-md sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl transition-all duration-300 hover:scale-105"
      aria-hidden
    >
      {i}
    </div>
  );
}

function MetricPill({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <span className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm transition duration-200 hover:bg-white/10 hover:border-white/20 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">{label}</span>
      <span className="font-heading text-2xl font-semibold tabular-nums text-white">{value}</span>
    </span>
  );
  if (href) {
    const TabLink = shouldOpenConsultationInNewTab(href) ? ConsultationLink : Link;
    return (
      <TabLink href={href} className="transition-all hover:scale-[1.02] active:scale-[0.98]">
        {inner}
      </TabLink>
    );
  }
  return inner;
}

export function HomeOverview(): JSX.Element {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [roster, setRoster] = useState<PatientListItem[]>([]);
  const [myDay, setMyDay] = useState<MyDayResponse | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [now, setNow] = useState(() => new Date());
  const [doctor, setDoctor] = useState<WorkspaceContext | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [lastCase, setLastCaseState] = useState<LastCase | null>(null);
  const [activity, setActivity] = useState<DashboardRecentItem[]>([]);
  const [inbox, setInbox] = useState<InboxMessageItem[]>([]);
  const [searchResults, setSearchResults] = useState<PatientListItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Global Ctrl+K / / shortcut to focus patient search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const reload = useCallback(() => {
    void (async () => {
      try {
        setLoadError(null);
        const [patientsPage, day, ctx, act, msg] = await Promise.all([
          fetchPatientsPage({ limit: 8, offset: 0, sort: "last_visit_at", sortDir: "desc" }),
          fetchMyDay(7),
          fetchWorkspaceContext().catch(
            (): WorkspaceContext => ({ fullName: "Doctor", firstName: "Doctor", clinicName: null, clinicId: null })
          ),
          fetchDashboardRecent(),
          fetchDoctorInbox(40)
        ]);
        setRoster(patientsPage.items);
        setMyDay(day);
        setDoctor(ctx);
        setActivity(act);
        setInbox(msg);
      } catch (e) {
        setLoadError(e);
        setRoster([]);
        setMyDay(null);
        setActivity([]);
        setInbox([]);
        setDoctor({ fullName: "Doctor", firstName: "Doctor", clinicName: null, clinicId: null });
      }
    })();
  }, []);

  // Server-side patient search — scales to large rosters (200+ patients).
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      void searchPatientsLight(q, 12)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (typeof window === "undefined" || !getToken()) {
      router.replace("/login");
      return;
    }
    setLastCaseState(getLastCase());
    reload();
  }, [router, reload]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    const onFocus = () => setLastCaseState(getLastCase());
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const dateShort = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  // Appointments & schedule
  const schedule = useMemo(() => myDay?.upcomingAppointments ?? [], [myDay]);
  const todaysAppointments = useMemo(
    () =>
      [...schedule]
        .filter((a) => isLocalToday(a.scheduledFor, now))
        .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()),
    [schedule, now]
  );
  const nextToday = useMemo(() => nextTodaySlot(todaysAppointments, now), [todaysAppointments, now]);

  const rosterById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);

  // Stats
  const uniquePatientsToday = useMemo(
    () => new Set(todaysAppointments.map((a) => a.patientId)).size,
    [todaysAppointments]
  );
  const pendingFollowUps = (myDay?.followUps ?? []).length;
  const overdueFollowUps = useMemo(
    () => (myDay?.followUps ?? []).filter((f) => f.overdue || sameLocalDay(new Date(f.dueAt), new Date())).length,
    [myDay]
  );
  const draftNotes = (myDay?.needsNoteFinalization ?? []).length;
  const unreadMessages = useMemo(() => inbox.filter((m) => !m.fromDoctor && !m.readAt).length, [inbox]);

  // Recent patients (last 5 by last visit or created_at)
  const recentPatients = useMemo(
    () =>
      [...roster]
        .sort((a, b) => {
          const ta = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : new Date(a.createdAt).getTime();
          const tb = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : new Date(b.createdAt).getTime();
          return tb - ta;
        })
        .slice(0, 5),
    [roster]
  );

  // Patient search uses server-side results; roster slice is for recent patients only.
  const filteredRoster = searchResults;

  const selectedPatient = useMemo(
    () =>
      selectedPatientId
        ? (searchResults.find((p) => p.id === selectedPatientId) ??
          roster.find((p) => p.id === selectedPatientId))
        : undefined,
    [roster, searchResults, selectedPatientId]
  );

  const onKeySearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && filteredRoster[0]) {
        openConsultationTab(consultationStartHref({ patientId: filteredRoster[0].id }));
      }
    },
    [filteredRoster, router]
  );

  // Active visits — rendered via OperationalQueuePanel
  const primaryCta = useMemo(() => {
    if (lastCase?.visitStatus === "in_progress") {
      return {
        label: "Resume visit",
        hint: lastCase.patientName ?? "In-progress consultation",
        href: liveConsultationHref(lastCase.consultationId)
      };
    }
    if (nextToday) {
      return {
        label: "Start next visit",
        hint: `${nextToday.patientName} · ${formatTimeLabel(nextToday.scheduledFor)}`,
        href: consultationStartHref({
          patientId: nextToday.patientId,
          appointmentId: nextToday.id,
          consultationMode: nextToday.consultationMode
        })
      };
    }
    return null;
  }, [lastCase, nextToday]);

  return (
    <div className="font-sans text-hs-ink">
      {loadError ? (
        <div className="mb-6">
          <ErrorState err={loadError} title="Couldn't load your dashboard" onRetry={reload} />
        </div>
      ) : null}

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section
        className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 shadow-ds-md"
        aria-label="Welcome"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c221c] via-[#094d3f] to-[#041a15]" />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_85%_0%,rgba(14,160,133,0.3),transparent_60%)]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/[0.03]" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 sm:gap-6">
              {doctor === null ? (
                <div
                  className="flex h-16 w-16 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 sm:h-[4.5rem] sm:w-[4.5rem]"
                  aria-hidden
                />
              ) : (
                <DoctorAvatar name={doctor.fullName || doctor.firstName || "Doctor"} />
              )}
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-bold uppercase leading-none tracking-[0.2em] text-white/50">
                  {dateShort}
                </p>
                <h1 className="font-heading mt-2.5 text-2xl font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-[2.25rem]">
                  {doctor === null ? (
                    <span className="inline-block h-8 w-56 animate-pulse rounded-lg bg-white/10 align-middle" aria-busy="true" />
                  ) : (
                    <>
                      {greetingForDate(now)},{" "}
                      {doctor.fullName || (doctor.firstName ? `Dr. ${doctor.firstName}` : "Doctor")}
                    </>
                  )}
                </h1>
                {doctor?.clinicName ? (
                  <p className="mt-1 text-body-sm font-medium text-white/60">{doctor.clinicName}</p>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5 text-sm text-white/90">
                  <MetricPill label="Today's visits" value={uniquePatientsToday} href="/appointments" />
                  <MetricPill label="Follow-ups" value={pendingFollowUps} href="/follow-ups" />
                  {draftNotes > 0 ? (
                    <MetricPill
                      label="Draft notes"
                      value={draftNotes}
                      href={
                        (myDay?.needsNoteFinalization ?? [])[0]?.consultationId
                          ? liveConsultationHref((myDay!.needsNoteFinalization!)[0]!.consultationId, "notes")
                          : undefined
                      }
                    />
                  ) : null}
                  {unreadMessages > 0 ? (
                    <MetricPill label="Unread" value={unreadMessages} href="/messages" />
                  ) : null}
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <Link
                    href="/appointments"
                    className="inline-flex items-center gap-1.5 text-caption-sm font-semibold text-white/70 transition hover:text-white"
                  >
                    <Calendar className="h-3.5 w-3.5 text-hs-primary-light" aria-hidden />
                    View full schedule
                  </Link>
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex shrink-0 lg:min-w-[240px]">
              {primaryCta ? (
                <ConsultationLink
                  href={primaryCta.href}
                  className="font-heading flex min-h-12 w-full flex-col items-center justify-center rounded-xl bg-white px-6 text-center shadow-lg transition duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-neutral-50"
                >
                  <span className="text-body-sm font-semibold text-hs-ink">{primaryCta.label}</span>
                  <span className="text-[11px] font-normal text-hs-text-secondary">{primaryCta.hint}</span>
                </ConsultationLink>
              ) : (
                <Link
                  href="/consultation"
                  className="font-heading inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-body-sm font-semibold text-hs-ink shadow-lg transition duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-neutral-50"
                >
                  <Mic className="h-4.5 w-4.5 text-hs-primary" aria-hidden />
                  Start visit
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="ds-page">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-start">

          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="ds-page-sections lg:col-span-8">

            <ClinicalWorkflowOverview />

            <TelemedicineOpsPanel myDay={myDay} upcomingToday={todaysAppointments} now={now} />

            <MissedConsultationsStrip myDay={myDay} className="mb-4" />
            <DeadLetterJobsPanel className="mb-4" />

            {/* Operational queue — active visits, draft notes, pending outcomes */}
            <OperationalQueuePanel myDay={myDay} />

            {/* Patient search + start visit */}
            <section className="ds-card ds-card-pad hover:shadow-ds-md transition-shadow duration-300">
              <div>
                <h2 className="font-heading text-body-md font-semibold text-hs-ink flex items-center justify-between">
                  <span>Find a patient</span>
                  <span className="text-[10px] font-semibold text-hs-text-tertiary bg-hs-cream/60 px-2 py-0.5 rounded-md border border-hs-border/30">
                    Search roster
                  </span>
                </h2>
                <p className="mt-0.5 text-caption-sm text-hs-text-secondary">
                  Search to open a visit.{" "}
                  <Link href="/consultation" className="font-semibold text-hs-primary hover:underline">
                    Walk-in
                  </Link>
                  {" · "}
                  <Link href="/patients/new" className="font-semibold text-hs-primary hover:underline">
                    Add patient
                  </Link>
                </p>
              </div>

              <div className="relative mt-4">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hs-text-tertiary"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={onKeySearch}
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-hs-border/30 bg-hs-cream/20 pl-10 pr-20 text-body-sm shadow-input placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/10 transition-all duration-200"
                  placeholder="Name, phone, or complaint · Enter to start"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
                  <kbd className="h-5 select-none items-center gap-1 rounded border border-hs-border/40 bg-hs-cream px-1.5 font-mono text-[9px] font-bold text-hs-text-secondary/80 shadow-sm flex">
                    <span>CTRL</span><span>K</span>
                  </kbd>
                </div>
                {searching ? (
                  <p className="mt-1 text-caption-sm text-hs-text-tertiary">Searching…</p>
                ) : null}
              </div>

              {search.trim().length >= 2 && !searching && filteredRoster.length === 0 ? (
                <p className="mt-2 text-caption-sm text-hs-text-tertiary">
                  No patients match — try phone number or add a{" "}
                  <Link href="/patients/new" className="font-semibold text-hs-primary hover:underline">
                    new patient
                  </Link>
                  .
                </p>
              ) : null}

              {filteredRoster.length > 0 ? (
                <ul className="mt-3 max-h-52 divide-y divide-hs-border/10 overflow-y-auto rounded-xl border border-hs-border/20 bg-hs-paper shadow-ds-md transition-all duration-200">
                  {filteredRoster.map((p) => (
                    <li key={p.id} className="flex items-stretch transition-colors hover:bg-hs-primary-very-light/30">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setSearch("");
                        }}
                        className="min-w-0 flex-1 px-3.5 py-2.5 text-left text-body-sm text-hs-ink"
                      >
                        <span className="font-semibold text-hs-ink">{p.name}</span>
                        {p.phone ? (
                          <span className="ml-2 text-hs-text-secondary text-[11px] font-medium bg-hs-cream px-1.5 py-0.5 rounded border border-hs-border/30">{p.phone}</span>
                        ) : null}
                      </button>
                      <ConsultationLink
                        href={consultationStartHref({ patientId: p.id })}
                        className="flex items-center px-4 text-caption-sm font-bold text-hs-primary hover:text-hs-primary-dark border-l border-hs-border/10 transition-colors"
                      >
                        Start →
                      </ConsultationLink>
                    </li>
                  ))}
                </ul>
              ) : null}

              {selectedPatient ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-hs-primary/20 bg-hs-primary-very-light/40 px-3.5 py-3 transition-all duration-250">
                  <div>
                    <p className="text-body-sm font-semibold text-hs-ink">{selectedPatient.name}</p>
                    <PatientTagBadges tags={selectedPatient.tags} className="mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ConsultationLink
                      href={consultationStartHref({ patientId: selectedPatient.id })}
                      className="rounded-lg bg-hs-primary px-3 py-1.5 text-caption-sm font-bold text-white transition hover:bg-hs-primary-light active:scale-[0.98]"
                    >
                      Start visit
                    </ConsultationLink>
                    <button
                      type="button"
                      onClick={() => setSelectedPatientId(null)}
                      className="rounded-md p-1.5 text-hs-text-tertiary hover:bg-hs-cream hover:text-hs-ink transition"
                      aria-label="Clear"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Today's schedule */}
            <section className="ds-card ds-card-pad">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-heading flex items-center gap-2 text-body-md font-semibold text-hs-ink">
                  <Clock className="h-4 w-4 shrink-0 text-hs-primary" aria-hidden />
                  Today&rsquo;s schedule
                </h2>
                <Link
                  href="/appointments"
                  className="text-body-sm font-semibold text-hs-primary transition hover:text-hs-primary-light"
                >
                  Full view →
                </Link>
              </div>
              <TodayScheduleTimeline appointments={todaysAppointments} rosterById={rosterById} now={now} />
            </section>

            {/* Recent patients */}
            <section className="ds-card ds-card-pad">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-heading flex items-center gap-2 text-body-md font-semibold text-hs-ink">
                  <Users className="h-4 w-4 shrink-0 text-hs-primary" aria-hidden />
                  Recent patients
                </h2>
                <Link
                  href="/patients"
                  className="text-body-sm font-semibold text-hs-primary transition hover:text-hs-primary-light"
                >
                  All patients →
                </Link>
              </div>
              {recentPatients.length === 0 ? (
                <p className="text-body-sm text-hs-text-tertiary">
                  No patients yet.{" "}
                  <Link href="/patients/new" className="font-semibold text-hs-primary hover:underline">
                    Add your first →
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-hs-border/20">
                  {recentPatients.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-medium text-hs-ink">{p.name}</p>
                        {p.initialChiefComplaint ? (
                          <p className="line-clamp-1 text-caption-sm text-hs-text-secondary">
                            {p.initialChiefComplaint}
                          </p>
                        ) : null}
                        <PatientTagBadges tags={p.tags} className="mt-0.5" />
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Link
                          href={`/patients/${encodeURIComponent(p.id)}/timeline`}
                          className="text-caption-sm font-medium text-hs-text-secondary hover:text-hs-primary"
                        >
                          Chart
                        </Link>
                        <ConsultationLink
                          href={consultationStartHref({ patientId: p.id })}
                          className="text-caption-sm font-semibold text-hs-primary hover:underline"
                        >
                          Visit →
                        </ConsultationLink>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
          <aside className="ds-page-sections lg:col-span-4">
            <DashboardMemoWidget />
            <DashboardRightRail
              followUps={myDay?.followUps ?? []}
              activity={activity}
              overdueCount={overdueFollowUps}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
