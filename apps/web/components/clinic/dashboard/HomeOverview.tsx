"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  MessageCircle,
  Mic,
  Pill,
  Plus,
  Search,
  Stethoscope,
  Users,
  Video,
  X
} from "lucide-react";
import { appointmentDisplayTag } from "../../../lib/appointment-display-tag";
import {
  fetchDashboardRecent,
  fetchDoctorInbox,
  fetchMyDay,
  fetchPatients,
  fetchWorkspaceContext,
  getToken,
  type DashboardRecentItem,
  type InboxMessageItem,
  type MyDayAppointment,
  type MyDayResponse,
  type PatientListItem,
  type WorkspaceContext
} from "../../../lib/doctor-api";
import { getLastCase, type LastCase } from "../../../lib/workflow-storage";
import { ErrorState } from "../../ui/LoadState";
import { PatientTagBadges } from "../PatientTagBadges";
import {
  formatTimeLabel,
  greetingForDate,
  initialsFromName,
  isLocalToday,
  nextTodaySlot,
  sameLocalDay
} from "./home-utils";

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function DoctorAvatar({ name }: { name: string }): JSX.Element {
  const i = initialsFromName(name);
  return (
    <div
      className="font-heading flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/12 text-lg font-semibold text-white shadow-lg ring-2 ring-white/10 backdrop-blur sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl"
      aria-hidden
    >
      {i}
    </div>
  );
}

function MetricPill({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-white/55">{label}</span>
      <span className="font-heading text-2xl font-semibold tabular-nums text-white">{value}</span>
    </span>
  );
  if (href)
    return (
      <Link href={href} className="transition hover:opacity-80">
        {inner}
      </Link>
    );
  return inner;
}

function StatCard({
  label,
  value,
  sub,
  href,
  urgent
}: {
  label: string;
  value: number;
  sub?: string;
  href?: string;
  urgent?: boolean;
}): JSX.Element {
  const inner = (
    <div className="ds-app-card-interactive p-4">
      <p className="font-heading text-caption-sm font-medium uppercase tracking-[0.14em] text-hs-text-tertiary">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${
          urgent && value > 0 ? "text-amber-700" : "text-hs-ink"
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-caption-sm text-hs-text-secondary">{sub}</p> : null}
    </div>
  );
  if (href)
    return (
      <Link href={href} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-hs-primary/30">
        {inner}
      </Link>
    );
  return inner;
}

function ActiveVisitsBanner({
  inClinic,
  online
}: {
  inClinic: Array<{ id: string; patientName: string; startedAt: string }>;
  online: Array<{ id: string; patientName: string; startedAt: string }>;
}): JSX.Element | null {
  const all = [...inClinic, ...online];
  if (all.length === 0) return null;
  return (
    <section
      className="rounded-2xl border border-hs-primary/25 bg-hs-primary-very-light/60 p-4 sm:p-5"
      aria-label="Visits in progress"
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-hs-primary" aria-hidden />
        <h2 className="font-heading text-body-md font-semibold text-hs-ink">
          {all.length === 1 ? "1 visit in progress" : `${all.length} visits in progress`}
        </h2>
      </div>
      <ul className="mt-3 space-y-2">
        {all.map((v) => {
          const isOnline = online.some((o) => o.id === v.id);
          return (
            <li key={v.id}>
              <Link
                href={`/consultation/${encodeURIComponent(v.id)}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-hs-border/30 bg-hs-paper px-3.5 py-2.5 text-body-sm transition hover:border-hs-primary/35 hover:bg-hs-primary-very-light/30"
              >
                <span className="flex items-center gap-2 font-medium text-hs-ink">
                  {isOnline ? (
                    <Video className="h-4 w-4 text-sky-600" aria-hidden />
                  ) : (
                    <Stethoscope className="h-4 w-4 text-hs-primary" aria-hidden />
                  )}
                  {v.patientName}
                </span>
                <span className="shrink-0 text-caption-sm font-semibold text-hs-primary">Resume →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TodayTimeline({
  appointments,
  rosterById
}: {
  appointments: MyDayAppointment[];
  rosterById: Map<string, PatientListItem | undefined>;
}): JSX.Element {
  if (appointments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-hs-border/50 bg-hs-cream/40 px-4 py-6 text-center text-body-sm text-hs-text-tertiary">
        No appointments scheduled for today.{" "}
        <Link href="/appointments" className="font-semibold text-hs-primary hover:underline">
          Add slots →
        </Link>
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {appointments.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-hs-border/30 bg-hs-cream/40 px-3.5 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body-sm font-medium text-hs-ink">{a.patientName}</p>
              <PatientTagBadges tags={[appointmentDisplayTag(a, rosterById.get(a.patientId))]} />
            </div>
            <p className="mt-0.5 text-caption-sm text-hs-text-tertiary">
              {formatTimeLabel(a.scheduledFor)} · {a.durationMinutes} min
            </p>
          </div>
          <Link
            href={`/consultation?patientId=${encodeURIComponent(a.patientId)}&appointmentId=${encodeURIComponent(a.id)}`}
            className="shrink-0 rounded-lg bg-hs-primary px-3 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
          >
            Start
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentActivity({ items }: { items: DashboardRecentItem[] }): JSX.Element {
  const IconFor = (k: DashboardRecentItem["kind"]) => {
    if (k === "message") return MessageCircle;
    if (k === "prescription") return Pill;
    return CheckCircle2;
  };
  if (items.length === 0) {
    return (
      <p className="text-body-sm text-hs-text-tertiary">No recent activity.</p>
    );
  }
  return (
    <ul className="space-y-1" role="list">
      {items.map((item) => {
        const Icon = IconFor(item.kind);
        const row = (
          <div className="flex gap-3 rounded-xl px-2 py-2 transition hover:bg-hs-cream/60">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hs-primary-very-light text-hs-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-hs-ink">{item.title}</p>
              {item.subtitle ? (
                <p className="line-clamp-1 text-caption-sm text-hs-text-secondary">{item.subtitle}</p>
              ) : null}
              <p className="text-caption-sm text-hs-text-tertiary">{formatRelative(item.at)}</p>
            </div>
          </div>
        );
        return (
          <li key={item.id}>
            {item.href ? <Link href={item.href} className="block">{row}</Link> : row}
          </li>
        );
      })}
    </ul>
  );
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

  const reload = useCallback(() => {
    void (async () => {
      try {
        setLoadError(null);
        const [patients, day, ctx, act, msg] = await Promise.all([
          fetchPatients(),
          fetchMyDay(7),
          fetchWorkspaceContext().catch(
            (): WorkspaceContext => ({ fullName: "Doctor", firstName: "Doctor", clinicName: null, clinicId: null })
          ),
          fetchDashboardRecent(),
          fetchDoctorInbox(40)
        ]);
        setRoster(patients);
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

  // Patient search
  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return roster
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone?.toLowerCase() ?? "").includes(q) ||
          (p.initialChiefComplaint?.toLowerCase() ?? "").includes(q)
      )
      .slice(0, 8);
  }, [roster, search]);

  const selectedPatient = useMemo(
    () => (selectedPatientId ? roster.find((p) => p.id === selectedPatientId) : undefined),
    [roster, selectedPatientId]
  );

  const onKeySearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && filteredRoster[0]) {
        router.push(`/consultation?patientId=${encodeURIComponent(filteredRoster[0].id)}`);
      }
    },
    [filteredRoster, router]
  );

  // Active visits
  const inClinicActive = myDay?.activeConsultations?.inClinic ?? [];
  const onlineActive = myDay?.activeConsultations?.online ?? [];

  // CTA: resume in-progress, next appointment, or start fresh
  const primaryCta = useMemo(() => {
    if (lastCase?.visitStatus === "in_progress") {
      return {
        label: "Resume visit",
        hint: lastCase.patientName ?? "In-progress consultation",
        href: `/consultation/${encodeURIComponent(lastCase.consultationId)}`
      };
    }
    if (nextToday) {
      return {
        label: "Start next visit",
        hint: `${nextToday.patientName} · ${formatTimeLabel(nextToday.scheduledFor)}`,
        href: `/consultation?patientId=${encodeURIComponent(nextToday.patientId)}&appointmentId=${encodeURIComponent(nextToday.id)}`
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
        className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 shadow-card sm:mb-7 sm:rounded-3xl"
        aria-label="Welcome"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#152521] via-hs-primary-dark to-[#0c1815]" />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_85%_0%,rgba(61,141,123,0.45),transparent_55%)]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/[0.04]" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex gap-4 sm:gap-5">
              {doctor === null ? (
                <div
                  className="flex h-16 w-16 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-white/12 ring-2 ring-white/10 sm:h-[4.5rem] sm:w-[4.5rem]"
                  aria-hidden
                />
              ) : (
                <DoctorAvatar name={doctor.fullName || doctor.firstName || "Doctor"} />
              )}
              <div className="min-w-0">
                <p className="text-[0.7rem] font-medium uppercase leading-none tracking-[0.2em] text-white/70">
                  {dateShort}
                </p>
                <h1 className="font-heading mt-2.5 text-2xl font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-[2rem]">
                  {doctor === null ? (
                    <span className="inline-block h-8 w-56 animate-pulse rounded-lg bg-white/15 align-middle" aria-busy="true" />
                  ) : (
                    <>
                      {greetingForDate(now)},{" "}
                      {doctor.fullName || (doctor.firstName ? `Dr. ${doctor.firstName}` : "Doctor")}
                    </>
                  )}
                </h1>
                {doctor?.clinicName ? (
                  <p className="mt-1.5 text-body-sm font-medium text-white/70">{doctor.clinicName}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-sm text-white/90">
                  <MetricPill label="Today's visits" value={uniquePatientsToday} href="/appointments" />
                  <MetricPill label="Follow-ups pending" value={pendingFollowUps} href="/follow-ups" />
                  {unreadMessages > 0 ? (
                    <MetricPill label="Unread messages" value={unreadMessages} href="/messages" />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
              {primaryCta ? (
                <Link
                  href={primaryCta.href}
                  className="font-heading inline-flex min-h-12 w-full min-w-[200px] flex-col items-center justify-center rounded-xl bg-white px-6 text-center shadow-lg transition hover:bg-white/95"
                >
                  <span className="text-body-md font-semibold text-hs-ink">{primaryCta.label}</span>
                  <span className="text-caption-sm font-normal text-hs-text-secondary">{primaryCta.hint}</span>
                </Link>
              ) : (
                <Link
                  href="/consultation"
                  className="font-heading inline-flex min-h-12 w-full min-w-[200px] items-center justify-center gap-2 rounded-xl bg-white px-6 text-body-md font-semibold text-hs-ink shadow-lg transition hover:bg-white/95"
                >
                  <Mic className="h-5 w-5 text-hs-primary" aria-hidden />
                  Start consultation
                </Link>
              )}
              <Link
                href="/appointments"
                className="font-heading inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-body-sm font-medium text-white transition hover:bg-white/20"
              >
                <Calendar className="h-4 w-4" aria-hidden />
                View schedule
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-start">

          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-8">

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Today's patients" value={uniquePatientsToday} sub="Scheduled" href="/appointments" />
              <StatCard
                label="Follow-ups"
                value={pendingFollowUps}
                sub={overdueFollowUps > 0 ? `${overdueFollowUps} overdue` : "Pending"}
                href="/follow-ups"
                urgent={overdueFollowUps > 0}
              />
              <StatCard
                label="Draft notes"
                value={draftNotes}
                sub="To finalise"
                href={
                  (myDay?.needsNoteFinalization ?? [])[0]?.consultationId
                    ? `/consultation/${encodeURIComponent((myDay!.needsNoteFinalization!)[0]!.consultationId)}`
                    : undefined
                }
              />
              <StatCard
                label="Unread messages"
                value={unreadMessages}
                sub="From patients"
                href="/messages"
                urgent={unreadMessages > 0}
              />
            </div>

            {/* Active visits */}
            <ActiveVisitsBanner inClinic={inClinicActive} online={onlineActive} />

            {/* Patient search + start visit */}
            <section className="rounded-2xl border border-hs-border/25 bg-hs-paper/95 p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-heading-sm font-semibold text-hs-ink">Start a visit</h2>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/patients/new"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-hs-border/50 bg-hs-paper px-3 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    New patient
                  </Link>
                  <Link
                    href="/consultation"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-hs-primary px-3 text-caption-sm font-semibold text-white shadow-sm transition hover:bg-hs-primary-light"
                  >
                    <Stethoscope className="h-4 w-4" aria-hidden />
                    Walk-in
                  </Link>
                </div>
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
                  className="h-11 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 pl-10 pr-3 text-body-sm shadow-input placeholder:text-hs-text-tertiary/80 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
                  placeholder="Name, phone, or complaint · Enter to start"
                />
              </div>

              {search && filteredRoster.length > 0 ? (
                <ul className="mt-2 max-h-52 divide-y divide-hs-border/15 overflow-y-auto rounded-xl border border-hs-border/25 bg-hs-paper/95 shadow-ds-sm">
                  {filteredRoster.map((p) => (
                    <li key={p.id} className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setSearch("");
                        }}
                        className="min-w-0 flex-1 px-3.5 py-2.5 text-left text-body-sm text-hs-ink hover:bg-hs-cream/60"
                      >
                        <span className="font-medium">{p.name}</span>
                        {p.phone ? (
                          <span className="ml-2 text-hs-text-tertiary">{p.phone}</span>
                        ) : null}
                      </button>
                      <Link
                        href={`/consultation?patientId=${encodeURIComponent(p.id)}`}
                        className="flex items-center px-3 text-caption-sm font-semibold text-hs-primary hover:bg-hs-cream/60"
                      >
                        Start →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {selectedPatient ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/60 px-3.5 py-3">
                  <div>
                    <p className="text-body-sm font-semibold text-hs-ink">{selectedPatient.name}</p>
                    <PatientTagBadges tags={selectedPatient.tags} className="mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/consultation?patientId=${encodeURIComponent(selectedPatient.id)}`}
                      className="rounded-lg bg-hs-primary px-3 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
                    >
                      Start visit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelectedPatientId(null)}
                      className="rounded p-1 text-hs-text-tertiary hover:text-hs-ink"
                      aria-label="Clear"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Today's schedule */}
            <section className="rounded-2xl border border-hs-border/25 bg-hs-paper/95 p-5 shadow-card sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-heading flex items-center gap-2 text-heading-sm font-semibold text-hs-ink">
                  <Clock className="h-5 w-5 shrink-0 text-hs-primary" aria-hidden />
                  Today&rsquo;s schedule
                </h2>
                <Link
                  href="/appointments"
                  className="text-body-sm font-semibold text-hs-primary transition hover:text-hs-primary-light"
                >
                  Full view →
                </Link>
              </div>
              <TodayTimeline appointments={todaysAppointments} rosterById={rosterById} />
            </section>

            {/* Recent patients */}
            <section className="rounded-2xl border border-hs-border/25 bg-hs-paper/95 p-5 shadow-card sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-heading flex items-center gap-2 text-heading-sm font-semibold text-hs-ink">
                  <Users className="h-5 w-5 shrink-0 text-hs-primary" aria-hidden />
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
                <ul className="space-y-1.5">
                  {recentPatients.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-hs-border/20 px-3.5 py-2.5 transition hover:bg-hs-cream/40"
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
                      <div className="flex shrink-0 gap-1.5">
                        <Link
                          href={`/patients/${encodeURIComponent(p.id)}/timeline`}
                          className="rounded-lg border border-hs-border/50 px-2.5 py-1 text-caption-sm font-medium text-hs-ink transition hover:border-hs-primary/30"
                        >
                          Chart
                        </Link>
                        <Link
                          href={`/consultation?patientId=${encodeURIComponent(p.id)}`}
                          className="rounded-lg bg-hs-primary px-2.5 py-1 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
                        >
                          Visit
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
          <aside className="space-y-5 lg:col-span-4">
            {/* Follow-ups due */}
            {pendingFollowUps > 0 ? (
              <section className="rounded-2xl border border-hs-border/25 bg-hs-paper/95 p-5 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-heading-sm font-semibold text-hs-ink">Follow-ups</h2>
                  {overdueFollowUps > 0 ? (
                    <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-caption-sm font-semibold text-amber-900">
                      {overdueFollowUps} overdue
                    </span>
                  ) : (
                    <span className="rounded-full border border-hs-border/40 bg-hs-cream px-2 py-0.5 text-caption-sm text-hs-text-tertiary">
                      {pendingFollowUps}
                    </span>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {(myDay?.followUps ?? []).slice(0, 5).map((f) => (
                    <li key={f.id}>
                      <Link
                        href={`/consultation?patientId=${encodeURIComponent(f.patientId)}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-hs-border/20 px-3 py-2.5 text-body-sm transition hover:border-hs-primary/30 hover:bg-hs-cream/40"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-hs-ink">{f.patientName}</p>
                          <p className="text-caption-sm text-hs-text-tertiary">
                            {f.overdue ? "⚠ Overdue" : new Date(f.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span className="shrink-0 text-caption-sm font-semibold text-hs-primary">Start →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {pendingFollowUps > 5 ? (
                  <Link
                    href="/follow-ups"
                    className="mt-2 block text-center text-caption-sm font-semibold text-hs-primary hover:underline"
                  >
                    View all {pendingFollowUps} →
                  </Link>
                ) : null}
              </section>
            ) : null}

            {/* Recent activity */}
            <section className="rounded-2xl border border-hs-border/25 bg-hs-paper/95 p-5 shadow-card">
              <h2 className="font-heading text-heading-sm font-semibold text-hs-ink">Recent activity</h2>
              <div className="mt-3">
                <RecentActivity items={activity} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
