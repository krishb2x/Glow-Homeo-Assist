"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { PatientListSkeleton } from "../../../components/clinic/SkeletonCard";
import { PatientVisitCard } from "../../../components/clinic/workflow/PatientVisitCard";
import { OperationalQueuePanel } from "../../../components/clinic/dashboard/OperationalQueuePanel";
import { PageHeader } from "../../../components/platform/PageHeader";
import { motion } from "framer-motion";
import {
  fetchMyDay,
  fetchPatientsPage,
  getToken,
  isLocalCalendarToday,
  searchPatientsLight,
  startConsultation,
  type MyDayResponse,
  type PatientListItem
} from "../../../lib/doctor-api";
import {
  openConsultationTab,
  liveConsultationHref
} from "../../../lib/consultation-navigation";
import {
  activeVisitByPatientId,
  dedupeActiveVisits,
  findOpenVisitForPatient
} from "../../../lib/operational-queue";
import { ErrorState } from "../../../components/ui/LoadState";
import { cn } from "../../../lib/cn";
import {
  DS_BTN_PRIMARY_ROUNDED,
  DS_BTN_SECONDARY,
  DS_FIELD_SEARCH,
  DS_SURFACE_DASHED,
  DS_SURFACE_PANEL
} from "../../../lib/ds-classes";

function matchesSearch(p: PatientListItem, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  const parts = [
    p.name,
    p.phone,
    p.initialChiefComplaint,
    p.age != null ? String(p.age) : ""
  ]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase());
  return parts.some((t) => t.includes(s));
}

export default function ConsultationStartPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentIdFromQuery = searchParams.get("appointmentId");
  const [list, setList] = useState<PatientListItem[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [myDay, setMyDay] = useState<MyDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PatientListItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const autoStartedRef = useRef(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [page, day] = await Promise.all([
        fetchPatientsPage({ limit: 50, offset: 0, sort: "last_visit_at", sortDir: "desc" }),
        fetchMyDay(3)
      ]);
      setList(page.items);
      setTotalPatients(page.total);
      setMyDay(day);
      if (page.total <= 30) setBrowseAll(true);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  // Keep operational queue fresh during long clinic days.
  useEffect(() => {
    if (!getToken()) return;
    const refresh = (): void => {
      void fetchMyDay(3).then(setMyDay).catch(() => {});
    };
    refresh();
    const onVis = (): void => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(refresh, 60_000);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const consultationModeFromQuery =
    searchParams.get("consultationMode") === "ONLINE" ? ("ONLINE" as const) : ("IN_CLINIC" as const);

  const patientIdFromQuery = searchParams.get("patientId");

  const activeVisits = useMemo(
    () =>
      myDay
        ? dedupeActiveVisits(
            myDay.activeConsultations?.inClinic ?? [],
            myDay.activeConsultations?.online ?? []
          )
        : [],
    [myDay]
  );
  const openVisitByPatient = useMemo(() => activeVisitByPatientId(activeVisits), [activeVisits]);

  const quickStart = useCallback(
    async (patientId: string, opts?: { forceNew?: boolean }): Promise<void> => {
      if (!getToken()) {
        router.replace("/login");
        return;
      }
      const existing = findOpenVisitForPatient(patientId, activeVisits);
      if (existing && !opts?.forceNew) {
        openConsultationTab(liveConsultationHref(existing.id));
        return;
      }
      setStartingId(patientId);
      setErr(null);
      try {
        const { id } = await startConsultation(patientId, {
          appointmentId: appointmentIdFromQuery ?? undefined,
          consultationMode: consultationModeFromQuery
        });
        openConsultationTab(liveConsultationHref(id));
      } catch (e) {
        setErr(e);
      } finally {
        setStartingId(null);
      }
    },
    [router, appointmentIdFromQuery, consultationModeFromQuery, activeVisits]
  );

  useEffect(() => {
    if (list.length === 0) return;
    if (!patientIdFromQuery) return;
    const p = list.find((x) => x.id === patientIdFromQuery);
    if (p) setSearch(p.name);
  }, [list, patientIdFromQuery]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      void searchPatientsLight(q, 20)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!patientIdFromQuery) return;
    const existing = findOpenVisitForPatient(patientIdFromQuery, activeVisits);
    if (existing) {
      autoStartedRef.current = true;
      openConsultationTab(liveConsultationHref(existing.id));
      return;
    }
    const p =
      list.find((x) => x.id === patientIdFromQuery) ??
      searchResults?.find((x) => x.id === patientIdFromQuery);
    if (!p) return;
    autoStartedRef.current = true;
    void quickStart(p.id);
  }, [list, searchResults, patientIdFromQuery, quickStart, activeVisits, router]);

  const { today, other } = useMemo(() => {
    const t: PatientListItem[] = [];
    const o: PatientListItem[] = [];
    for (const p of list) {
      if (isLocalCalendarToday(p.createdAt)) t.push(p);
      else o.push(p);
    }
    return { today: t, other: o };
  }, [list]);

  const largeRoster = totalPatients > 30;
  const showSearchOnly = largeRoster && !browseAll && !search.trim();

  const filteredToday = useMemo(
    () => (search.trim() ? today.filter((p) => matchesSearch(p, search)) : today),
    [today, search]
  );
  const filteredOther = useMemo(
    () => (search.trim() ? other.filter((p) => matchesSearch(p, search)) : other),
    [other, search]
  );
  const searchFlat = useMemo(() => {
    if (!search.trim()) return null;
    return searchResults ?? list.filter((p) => matchesSearch(p, search));
  }, [list, search, searchResults]);

  const renderVisitCard = (p: PatientListItem, extra?: { showDateHint?: boolean; highlight?: boolean }) => {
    const open = openVisitByPatient.get(p.id);
    return (
      <PatientVisitCard
        patient={p}
        onStart={() => void quickStart(p.id)}
        openVisitId={open?.id}
        onStartNew={open ? () => void quickStart(p.id, { forceNew: true }) : undefined}
        starting={startingId === p.id}
        disabled={startingId !== null && startingId !== p.id}
        showDateHint={extra?.showDateHint}
        highlight={extra?.highlight}
      />
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl"
    >
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-900 to-hs-ink p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-5 mix-blend-overlay" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        
        <h1 className="relative font-heading text-3xl sm:text-4xl font-bold text-white mb-2">Start consultation</h1>
        <p className="relative text-emerald-100/70 max-w-2xl text-sm sm:text-base mb-6">
          Select a patient to open the clinical workflow. Every visit follows the same nine-step rhythm — from overview to finalize.
        </p>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="consult-search" className="sr-only">
              Find patient
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50" aria-hidden>
              <Search className="h-5 w-5" strokeWidth={2} />
            </span>
            <input
              id="consult-search"
              type="search"
              role="searchbox"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or complaint…"
              className="w-full rounded-xl bg-transparent py-3 pl-12 pr-4 text-white placeholder-white/40 focus:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all border-none"
              autoComplete="off"
            />
          </div>
          <div className="flex shrink-0 px-2 sm:px-0 sm:pr-2 pb-2 sm:pb-0">
            <Link href="/patients/new" className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
              <UserPlus className="h-4 w-4" aria-hidden />
              New patient
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-hs-border/40 bg-hs-cream/50 px-4 py-3">
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-caption-sm font-bold",
            consultationModeFromQuery === "ONLINE"
              ? "border-emerald-600/30 bg-emerald-50 text-emerald-800"
              : "border-hs-primary/30 bg-hs-primary-very-light text-hs-primary"
          )}
        >
          {consultationModeFromQuery === "ONLINE" ? "Online video" : "In-clinic"}
        </span>
        <p className="text-caption-sm text-hs-text-secondary">
          {totalPatients > 0 ? `${totalPatients} patients in roster` : "No patients yet"}
          {largeRoster && !browseAll ? " · search to find a patient quickly" : null}
          {consultationModeFromQuery === "ONLINE"
            ? " · Patient receives join link on WhatsApp/email when booked from Schedule"
            : null}
        </p>
      </div>

      {!loading ? <OperationalQueuePanel myDay={myDay} className="mb-6" /> : null}

      {err ? (
        <div className="mb-6">
          <ErrorState
            err={err}
            title="Something went wrong"
            onRetry={() => {
              setErr(null);
              void load();
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <PatientListSkeleton count={4} />
      ) : list.length === 0 ? (
        <div className={cn(DS_SURFACE_PANEL, "border-hs-primary/20 p-10 text-center")}>
          <p className="text-lg font-semibold text-hs-ink">No patients yet</p>
          <p className="mt-2 text-body-sm text-hs-text-secondary">Register a patient before starting your first visit.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/patients/new" className={DS_BTN_PRIMARY_ROUNDED}>
              New patient
            </Link>
            <Link href="/patients" className={cn(DS_BTN_SECONDARY, "min-h-11 rounded-2xl px-5 py-2.5")}>
              Open patients
            </Link>
          </div>
        </div>
      ) : showSearchOnly ? (
        <section className={cn(DS_SURFACE_DASHED, "p-8 text-center")} aria-label="Patient search">
          <p className="font-heading text-body-md font-semibold text-hs-ink">Search to start a visit</p>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-hs-text-secondary">
            Your clinic has {totalPatients} patients. Type a name or phone number above — we won&apos;t load the full roster
            until you need it.
          </p>
          <button
            type="button"
            onClick={() => setBrowseAll(true)}
            className="mt-4 text-caption-sm font-semibold text-hs-primary hover:underline"
          >
            Browse recent 50 anyway →
          </button>
        </section>
      ) : searchFlat ? (
        <section aria-label="Search results">
          <h2 className="mb-3 text-caption-sm font-bold uppercase tracking-[0.14em] text-hs-text-tertiary">
            Search results · {searching ? "…" : searchFlat.length}
          </h2>
          {searching ? (
            <PatientListSkeleton count={3} />
          ) : searchFlat.length === 0 ? (
            <p className={cn(DS_SURFACE_DASHED, "p-6 text-body-sm text-hs-text-secondary")}>
              No match — try a shorter name or the phone number.
            </p>
          ) : (
            <ul className="space-y-3" role="list">
              {searchFlat.map((p) => (
                <li key={p.id}>
                  {renderVisitCard(p, { showDateHint: true, highlight: p.id === patientIdFromQuery })}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="mb-8" aria-labelledby="today-heading">
            <h2
              id="today-heading"
              className="mb-3 text-caption-sm font-bold uppercase tracking-[0.14em] text-hs-text-tertiary"
            >
              Added today
            </h2>
            {filteredToday.length === 0 ? (
              <p className={cn(DS_SURFACE_DASHED, "px-4 py-5 text-body-sm text-hs-text-secondary")}>
                No new registrations today — pick from the full roster below.
              </p>
            ) : (
              <ul className="space-y-3" role="list">
                {filteredToday.map((p) => (
                  <li key={p.id}>{renderVisitCard(p, { highlight: true })}</li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="all-heading">
            <h2
              id="all-heading"
              className="mb-3 text-caption-sm font-bold uppercase tracking-[0.14em] text-hs-text-tertiary"
            >
              All patients
            </h2>
            <ul className="space-y-3" role="list">
              {filteredOther.map((p) => (
                <li key={p.id}>{renderVisitCard(p, { showDateHint: true })}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </motion.div>
  );
}
