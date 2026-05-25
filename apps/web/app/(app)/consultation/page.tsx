"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { PatientListSkeleton } from "../../../components/clinic/SkeletonCard";
import { PatientVisitCard } from "../../../components/clinic/workflow/PatientVisitCard";
import { PageHeader } from "../../../components/platform/PageHeader";
import {
  fetchPatients,
  getToken,
  isLocalCalendarToday,
  startConsultation,
  type PatientListItem
} from "../../../lib/doctor-api";
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);
  const autoStartedRef = useRef(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      setList(await fetchPatients());
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

  const consultationModeFromQuery =
    searchParams.get("consultationMode") === "ONLINE" ? ("ONLINE" as const) : ("IN_CLINIC" as const);

  const patientIdFromQuery = searchParams.get("patientId");

  const quickStart = useCallback(
    async (patientId: string): Promise<void> => {
      if (!getToken()) {
        router.replace("/login");
        return;
      }
      setStartingId(patientId);
      setErr(null);
      try {
        const { id } = await startConsultation(patientId, {
          appointmentId: appointmentIdFromQuery ?? undefined,
          consultationMode: consultationModeFromQuery
        });
        router.push(`/consultation/${id}`);
      } catch (e) {
        setErr(e);
      } finally {
        setStartingId(null);
      }
    },
    [router, appointmentIdFromQuery, consultationModeFromQuery]
  );

  useEffect(() => {
    if (list.length === 0) return;
    if (!patientIdFromQuery) return;
    const p = list.find((x) => x.id === patientIdFromQuery);
    if (p) setSearch(p.name);
  }, [list, patientIdFromQuery]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!patientIdFromQuery || list.length === 0) return;
    const p = list.find((x) => x.id === patientIdFromQuery);
    if (!p) return;
    autoStartedRef.current = true;
    void quickStart(p.id);
  }, [list, patientIdFromQuery, quickStart]);

  const { today, other } = useMemo(() => {
    const t: PatientListItem[] = [];
    const o: PatientListItem[] = [];
    for (const p of list) {
      if (isLocalCalendarToday(p.createdAt)) t.push(p);
      else o.push(p);
    }
    return { today: t, other: o };
  }, [list]);

  const filteredToday = useMemo(
    () => (search.trim() ? today.filter((p) => matchesSearch(p, search)) : today),
    [today, search]
  );
  const filteredOther = useMemo(
    () => (search.trim() ? other.filter((p) => matchesSearch(p, search)) : other),
    [other, search]
  );
  const searchFlat = useMemo(
    () => (search.trim() ? list.filter((p) => matchesSearch(p, search)) : null),
    [list, search]
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        className="mb-6 border-b border-hs-border/30 pb-6"
        title="Start consultation"
        description="Select a patient to open the clinical workflow. Every visit follows the same nine-step rhythm — from overview to finalize."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <label htmlFor="consult-search" className="sr-only">
            Find patient
          </label>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-hs-text-tertiary" aria-hidden>
            <Search className="h-5 w-5" strokeWidth={2} />
          </span>
          <input
            id="consult-search"
            type="search"
            role="searchbox"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or complaint…"
            className={DS_FIELD_SEARCH}
            autoComplete="off"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/patients/new" className={cn(DS_BTN_SECONDARY, "gap-2")}>
            <UserPlus className="h-4 w-4" aria-hidden />
            New patient
          </Link>
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
          {list.length > 0 ? `${list.length} patients in roster` : "No patients yet"}
          {consultationModeFromQuery === "ONLINE"
            ? " · Patient receives join link on WhatsApp/email when booked from Schedule"
            : null}
        </p>
      </div>

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
      ) : searchFlat ? (
        <section aria-label="Search results">
          <h2 className="mb-3 text-caption-sm font-bold uppercase tracking-[0.14em] text-hs-text-tertiary">
            Search results · {searchFlat.length}
          </h2>
          {searchFlat.length === 0 ? (
            <p className={cn(DS_SURFACE_DASHED, "p-6 text-body-sm text-hs-text-secondary")}>
              No match — try a shorter name or the phone number.
            </p>
          ) : (
            <ul className="space-y-3" role="list">
              {searchFlat.map((p) => (
                <li key={p.id}>
                  <PatientVisitCard
                    patient={p}
                    onStart={() => void quickStart(p.id)}
                    starting={startingId === p.id}
                    disabled={startingId !== null && startingId !== p.id}
                    showDateHint
                    highlight={p.id === patientIdFromQuery}
                  />
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
                  <li key={p.id}>
                    <PatientVisitCard
                      patient={p}
                      onStart={() => void quickStart(p.id)}
                      starting={startingId === p.id}
                      disabled={startingId !== null && startingId !== p.id}
                      highlight
                    />
                  </li>
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
                <li key={p.id}>
                  <PatientVisitCard
                    patient={p}
                    onStart={() => void quickStart(p.id)}
                    starting={startingId === p.id}
                    disabled={startingId !== null && startingId !== p.id}
                    showDateHint
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
