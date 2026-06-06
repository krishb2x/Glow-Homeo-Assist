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
  X,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

function MetricPill({ label, value, href, icon: Icon, trend }: { label: string; value: number; href?: string; icon?: React.ElementType; trend?: "up" | "down" }) {
  const inner = (
    <div className="relative group overflow-hidden flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 shadow-lg hover:shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </span>
        {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
        {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
      </div>
      <span className="font-heading text-3xl font-semibold tabular-nums text-white group-hover:scale-[1.02] transition-transform duration-300 origin-left">
        {value}
      </span>
    </div>
  );
  if (href) {
    const TabLink = shouldOpenConsultationInNewTab(href) ? ConsultationLink : Link;
    return (
      <TabLink href={href} className="block transition-all hover:-translate-y-1">
        {inner}
      </TabLink>
    );
  }
  return inner;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

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
    () => {
      let patients = [...roster];
      if (process.env.NODE_ENV === "production") {
        const testPattern = /test|crud|qa/i;
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        patients = patients.filter(p => !testPattern.test(p.name) && !uuidPattern.test(p.name));
      }
      return patients
        .sort((a, b) => {
          const ta = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : new Date(a.createdAt).getTime();
          const tb = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : new Date(b.createdAt).getTime();
          return tb - ta;
        })
        .slice(0, 5);
    },
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
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="font-sans text-hs-ink"
    >
      {loadError ? (
        <motion.div variants={itemVariants} className="mb-6">
          <ErrorState err={loadError} title="Couldn't load your dashboard" onRetry={reload} />
        </motion.div>
      ) : null}

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <motion.section
        variants={itemVariants}
        className="flex items-center justify-between h-[64px] mb-6 px-6 rounded-2xl bg-[#0E7C66] shadow-md relative overflow-hidden"
        aria-label="Welcome"
      >
        <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay pointer-events-none" aria-hidden />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex flex-col">
            <span className="text-[13px] font-[600] text-white">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {doctor === null ? "..." : (doctor.firstName ? `Dr. ${doctor.firstName}` : "Doctor")}
            </span>
            <span className="text-[11px] text-[rgba(255,255,255,0.65)] mt-0.5">
              {uniquePatientsToday} visits · {pendingFollowUps} follow-ups · {draftNotes} drafts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex items-center gap-4 text-white">
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-bold leading-tight">{uniquePatientsToday}</span>
              <span className="text-[10px] text-white/70 uppercase tracking-wide">Visits</span>
            </div>
            <div className={`flex flex-col items-center ${pendingFollowUps > 0 ? 'text-amber-400' : ''}`}>
              <span className="text-[14px] font-bold leading-tight">{pendingFollowUps}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">Follow-ups</span>
            </div>
            <div className={`flex flex-col items-center ${draftNotes > 0 ? 'text-amber-400' : ''}`}>
              <span className="text-[14px] font-bold leading-tight">{draftNotes}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">Drafts</span>
            </div>
          </div>

          {primaryCta ? (
            <ConsultationLink
              href={primaryCta.href}
              className="flex items-center h-9 px-4 rounded-lg bg-white text-[#0E7C66] text-[13px] font-bold shadow-sm hover:bg-slate-50 transition"
            >
              {primaryCta.label} <ChevronRight className="w-4 h-4 ml-1" />
            </ConsultationLink>
          ) : (
            <Link
              href="/consultation"
              className="flex items-center h-9 px-4 rounded-lg bg-white text-[#0E7C66] text-[13px] font-bold shadow-sm hover:bg-slate-50 transition"
            >
              <Mic className="h-4 w-4 mr-1.5" /> Start visit
            </Link>
          )}
        </div>
      </motion.section>

      {/* ── NEEDS ATTENTION ────────────────────────────────────────── */}
      {(draftNotes > 0 || (myDay?.pendingOutcomes && myDay.pendingOutcomes.length > 0)) ? (
        <motion.section variants={itemVariants} className="mb-6 rounded-2xl border border-hs-border/20 bg-white shadow-sm overflow-hidden">
          <div className="bg-red-50 text-red-700 px-4 py-2 text-[12px] font-bold border-b border-red-100 flex items-center justify-between">
            <span>{(draftNotes + (myDay?.pendingOutcomes?.length || 0))} items need your attention</span>
          </div>
          <div className="divide-y divide-slate-100">
            {(myDay?.needsNoteFinalization ?? []).map(note => {
              const daysAgo = Math.max(0, Math.floor((new Date().getTime() - new Date(note.startedAt).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={note.consultationId} className="flex items-center px-4 py-3 hover:bg-slate-50 transition">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 mr-4 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[600] text-slate-900 truncate">{note.patientName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">Consultation notes not finalised · {daysAgo === 0 ? "Today" : `${daysAgo} days ago`}</p>
                  </div>
                  <ConsultationLink href={liveConsultationHref(note.consultationId, "notes")} className="text-[12px] font-bold text-[#0E7C66] hover:text-emerald-700 ml-4 shrink-0">
                    Finalise →
                  </ConsultationLink>
                </div>
              );
            })}
            {(myDay?.pendingOutcomes ?? []).map(outcome => {
              const daysAgo = Math.max(0, Math.floor((new Date().getTime() - new Date(outcome.endedAt).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={outcome.consultationId} className="flex items-center px-4 py-3 hover:bg-slate-50 transition">
                  <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 mr-4 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[600] text-slate-900 truncate">{outcome.patientName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">Missing outcome record · {daysAgo === 0 ? "Today" : `${daysAgo} days ago`}</p>
                  </div>
                  <ConsultationLink href={liveConsultationHref(outcome.consultationId, "finalize")} className="text-[12px] font-bold text-[#0E7C66] hover:text-emerald-700 ml-4 shrink-0">
                    Record →
                  </ConsultationLink>
                </div>
              );
            })}
          </div>
        </motion.section>
      ) : null}

      <div className="flex flex-1 h-full max-w-7xl mx-auto w-full">
        <div className="flex-1 min-w-0 pr-8 pb-10">

          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="space-y-6">

            <motion.div variants={itemVariants}>
              <ClinicalWorkflowOverview />
            </motion.div>

            <motion.div variants={itemVariants}>
              <TelemedicineOpsPanel myDay={myDay} upcomingToday={todaysAppointments} now={now} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <MissedConsultationsStrip myDay={myDay} className="mb-4" />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <DeadLetterJobsPanel className="mb-4" />
            </motion.div>

            {/* Operational queue — active visits, draft notes, pending outcomes */}
            <motion.div variants={itemVariants}>
              <OperationalQueuePanel myDay={myDay} />
            </motion.div>

            {/* Recent patients / Search */}
            <motion.section variants={itemVariants} className="ds-card ds-card-pad border border-hs-border/20 bg-white/50 backdrop-blur-md">
              <div className="mb-5 flex items-center justify-between gap-2">
                <h2 className="font-heading flex items-center gap-2 text-lg font-semibold text-hs-ink">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                  </div>
                  Recent patients
                </h2>
                <Link
                  href="/patients"
                  className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 flex items-center gap-1 hover:gap-2 duration-300"
                >
                  All patients <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="relative mb-5">
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
                  className="h-10 w-full rounded-xl border border-hs-border/30 bg-hs-cream/20 pl-10 pr-20 text-body-sm shadow-sm placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/10 transition-all duration-200"
                  placeholder="Find patient by name, phone, or complaint…"
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
                <p className="text-caption-sm text-hs-text-tertiary mb-3">No patients match.</p>
              ) : null}

              <ul className="divide-y divide-hs-border/10 max-h-[300px] overflow-y-auto">
                {(search.trim().length >= 2 ? filteredRoster : recentPatients).map((p) => {
                  let initial = "DR";
                  const parts = p.name.trim().split(/\s+/).filter(Boolean);
                  if (parts.length > 0) {
                    if (parts.length === 1) initial = parts[0]!.slice(0, 2).toUpperCase();
                    else initial = `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
                  }

                  return (
                    <motion.li
                      whileHover={{ x: 4, backgroundColor: "rgba(0,0,0,0.02)" }}
                      transition={{ duration: 0.2 }}
                      key={p.id}
                      className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl first:mt-0 last:mb-0"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-[13px] font-bold text-slate-600 shadow-sm border border-slate-200/50">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-semibold text-hs-ink truncate">{p.name}</p>
                        {p.initialChiefComplaint ? (
                          <p className="line-clamp-1 text-caption-sm text-hs-text-secondary mt-0.5">
                            {p.initialChiefComplaint}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Link
                          href={`/patients/${encodeURIComponent(p.id)}/timeline`}
                          className="text-xs font-semibold text-hs-text-tertiary hover:text-hs-primary transition-colors bg-white px-3 py-1.5 rounded-lg border border-hs-border/20 hover:border-hs-primary/30 hover:shadow-sm"
                        >
                          Chart
                        </Link>
                        <ConsultationLink
                          href={consultationStartHref({ patientId: p.id })}
                          className="text-xs font-bold text-white bg-hs-primary px-3 py-1.5 rounded-lg transition-all hover:bg-hs-primary-dark hover:shadow-md hover:-translate-y-0.5"
                        >
                          Visit →
                        </ConsultationLink>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.section>




          </div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
        <motion.aside variants={itemVariants} className="w-[240px] shrink-0 pl-8 border-l border-hs-border/40 pb-10">
          <div className="space-y-6 sticky top-0">
            <DashboardRightRail
              followUps={myDay?.followUps ?? []}
              activity={activity}
              overdueCount={overdueFollowUps}
            />

            <section className="ds-card ds-card-pad border border-hs-border/20 bg-white/50 backdrop-blur-md">
              <div className="mb-5 flex items-center justify-between gap-2">
                <h2 className="font-heading text-body-md font-semibold text-hs-ink">Today's schedule</h2>
              </div>
              {todaysAppointments.length === 0 ? (
                <div className="text-caption-sm text-hs-text-tertiary">
                  <p>No appointments today.</p>
                  <Link href="/appointments" className="mt-1 block font-semibold text-hs-primary hover:underline">
                    Add slots →
                  </Link>
                </div>
              ) : (
                <TodayScheduleTimeline appointments={todaysAppointments} rosterById={rosterById} now={now} />
              )}
            </section>

            <DashboardMemoWidget />
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}
