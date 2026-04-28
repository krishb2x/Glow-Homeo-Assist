"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { PatientListSkeleton } from "../../../components/clinic/SkeletonCard";
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
  DS_BTN_PRIMARY,
  DS_BTN_PRIMARY_ROUNDED,
  DS_BTN_SECONDARY,
  DS_FIELD_SEARCH,
  DS_SEGMENT_IDLE,
  DS_SEGMENT_SELECTED,
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
  const [consultationMode, setConsultationMode] = useState<"IN_CLINIC" | "ONLINE">("IN_CLINIC");
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

  useEffect(() => {
    const m = searchParams.get("consultationMode");
    if (m === "ONLINE" || m === "IN_CLINIC") {
      setConsultationMode(m);
      return;
    }
    if (appointmentIdFromQuery) setConsultationMode("ONLINE");
  }, [searchParams, appointmentIdFromQuery]);

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
          consultationMode
        });
        router.push(`/consultation/${id}`);
      } catch (e) {
        setErr(e);
      } finally {
        setStartingId(null);
      }
    },
    [router, appointmentIdFromQuery, consultationMode]
  );

  useEffect(() => {
    if (list.length === 0) return;
    if (!patientIdFromQuery) return;
    const p = list.find((x) => x.id === patientIdFromQuery);
    if (p) setSearch(p.name);
  }, [list, patientIdFromQuery]);

  useEffect(() => {
    if (autoStartedRef.current || !patientIdFromQuery || list.length === 0) return;
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

  function PatientRow({ p, showDateHint }: { p: PatientListItem; showDateHint: boolean }): JSX.Element {
    return (
      <li>
        <article
          className="ds-app-card-interactive flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-labelledby={`cs-p-${p.id}`}
        >
          <div className="min-w-0">
            <h2 id={`cs-p-${p.id}`} className="truncate text-base font-semibold text-hs-ink">
              {p.name}
            </h2>
            <p className="mt-0.5 text-sm text-hs-text-secondary">
              {p.age != null ? <span>{p.age} yrs · </span> : null}
              {p.phone ? (
                <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="text-hs-primary hover:underline">
                  {p.phone}
                </a>
              ) : (
                <span className="text-hs-text-tertiary">No phone</span>
              )}
              {showDateHint && !isLocalCalendarToday(p.createdAt) && (
                <span className="ml-1 text-hs-text-tertiary">· {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              )}
            </p>
            {p.initialChiefComplaint ? (
              <p className="mt-2 line-clamp-2 text-sm text-hs-ink/90">{p.initialChiefComplaint}</p>
            ) : null}
          </div>
          <div className="shrink-0 sm:pl-2">
            <button
              type="button"
              onClick={() => void quickStart(p.id)}
              disabled={startingId !== null}
              className={cn(DS_BTN_PRIMARY, "w-full sm:w-auto disabled:opacity-70")}
            >
              {startingId === p.id
                ? "Starting…"
                : consultationMode === "ONLINE"
                  ? "Join consultation"
                  : "Start consultation"}
            </button>
          </div>
        </article>
      </li>
    );
  }

  return (
    <div>
      <PageHeader
        className="mb-6"
        title="New consultation"
      />
      <div className="mb-8 max-w-2xl space-y-4 border-b border-hs-border/40 pb-8">
        <p className="text-body-sm text-hs-text-tertiary">
          <Link href="/patients" className="font-medium text-hs-primary underline-offset-2 hover:underline">
            Patients
          </Link>
          {list.length > 0 ? <span className="text-hs-text-tertiary"> · {list.length} in roster</span> : null}
        </p>
        <div>
          <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">Visit type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConsultationMode("IN_CLINIC")}
              className={cn(
                "inline-flex min-h-10 items-center rounded-xl border px-4 text-body-sm font-semibold transition",
                consultationMode === "IN_CLINIC" ? DS_SEGMENT_SELECTED : DS_SEGMENT_IDLE
              )}
            >
              In-clinic
            </button>
            <button
              type="button"
              onClick={() => setConsultationMode("ONLINE")}
              className={cn(
                "inline-flex min-h-10 items-center rounded-xl border px-4 text-body-sm font-semibold transition",
                consultationMode === "ONLINE" ? DS_SEGMENT_SELECTED : DS_SEGMENT_IDLE
              )}
            >
              Online
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <label htmlFor="consult-search" className="sr-only">
          Find patient
        </label>
        <div className="relative max-w-2xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-hs-text-tertiary" aria-hidden>
            <Search className="h-5 w-5" strokeWidth={2} />
          </span>
          <input
            id="consult-search"
            type="search"
            role="searchbox"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Quick find — name, phone, or complaint"
            className={DS_FIELD_SEARCH}
            autoComplete="off"
          />
        </div>
      </div>

      {err ? (
        <div className="mt-4 max-w-2xl">
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

      <div className="mt-8">
        {loading ? (
          <PatientListSkeleton count={4} />
        ) : list.length === 0 ? (
          <div className={cn(DS_SURFACE_PANEL, "border-hs-primary/20 p-10 text-center")}>
            <p className="text-lg font-semibold text-hs-ink">No patients yet</p>
            <p className="mt-2 text-body-sm text-hs-text-secondary">Add a patient first to start a consultation.</p>
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
          <>
            <h2 className="mb-3 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
              Search results
            </h2>
            {searchFlat.length === 0 ? (
              <p className={cn(DS_SURFACE_DASHED, "p-6 text-body-sm text-hs-text-secondary")}>
                No match — try a shorter name or the phone number.
              </p>
            ) : (
              <ul className="space-y-3" role="list">
                {searchFlat.map((p) => (
                  <PatientRow key={p.id} p={p} showDateHint />
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <section aria-labelledby="today-heading">
              <h2
                id="today-heading"
                className="mb-3 text-sm font-semibold uppercase tracking-wide text-hs-text-tertiary"
              >
                Today
              </h2>
              {filteredToday.length === 0 ? (
                <p className={cn(DS_SURFACE_DASHED, "mb-6 px-4 py-5 text-body-sm text-hs-text-secondary")}>
                  No new patients added today.
                </p>
              ) : (
                <ul className="mb-8 space-y-3" role="list">
                  {filteredToday.map((p) => (
                    <PatientRow key={p.id} p={p} showDateHint={false} />
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="all-heading">
              <h2
                id="all-heading"
                className="mb-3 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary"
              >
                All patients
              </h2>
              {filteredOther.length === 0 ? (
                <p className="text-body-sm text-hs-text-secondary">All patients are from today — see above.</p>
              ) : (
                <ul className="space-y-3" role="list">
                  {filteredOther.map((p) => (
                    <PatientRow key={p.id} p={p} showDateHint />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
