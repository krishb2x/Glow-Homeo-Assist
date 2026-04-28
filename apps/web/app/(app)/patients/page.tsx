"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Search, Stethoscope } from "lucide-react";
import { PatientListSkeleton } from "../../../components/clinic/SkeletonCard";
import { PatientTagBadges } from "../../../components/clinic/PatientTagBadges";
import { PageHeader } from "../../../components/platform/PageHeader";
import { ErrorState } from "../../../components/ui/LoadState";
import { cn } from "../../../lib/cn";
import { DS_BTN_PRIMARY_ROUNDED, DS_FIELD_SEARCH, DS_SURFACE_DASHED, DS_SURFACE_PANEL } from "../../../lib/ds-classes";
import { fetchPatients, getToken, type PatientListItem } from "../../../lib/doctor-api";

function matchesSearch(p: PatientListItem, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  const parts = [
    p.name,
    p.phone,
    p.initialChiefComplaint,
    p.status,
    p.age != null ? String(p.age) : ""
  ]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase());
  return (
    parts.some((t) => t.includes(s)) || (p.tags?.some((tag) => tag.toLowerCase().includes(s)) ?? false)
  );
}

function formatLast(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export default function PatientsPage(): JSX.Element {
  const router = useRouter();
  const [list, setList] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(null);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(
    () => list.filter((p) => matchesSearch(p, search)),
    [list, search]
  );

  return (
    <div className="min-w-0">
      <PageHeader
        title="Patients"
        description={undefined}
        action={
          <Link href="/patients/new" className={DS_BTN_PRIMARY_ROUNDED}>
            New patient
          </Link>
        }
      />

      <div className="mt-2">
        <label htmlFor="patient-search" className="sr-only">
          Search patients
        </label>
        <div className="relative max-w-2xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-hs-text-tertiary" aria-hidden>
            <Search className="h-5 w-5" strokeWidth={2} />
          </span>
          <input
            id="patient-search"
            type="search"
            role="searchbox"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, complaint, or status"
            className={DS_FIELD_SEARCH}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>

      {err ? (
        <div className="mt-6 max-w-2xl">
          <ErrorState err={err} title="Couldn’t load patients" onRetry={load} />
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <PatientListSkeleton count={6} />
        ) : filtered.length === 0 && list.length === 0 ? (
          <div className={cn(DS_SURFACE_PANEL, "border-hs-primary/20 p-10 text-center")}>
            <p className="text-lg font-semibold text-hs-ink">No patients yet</p>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-hs-text-secondary">
              Add your first patient to get started.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/patients/new" className={DS_BTN_PRIMARY_ROUNDED}>
                Add your first patient
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn(DS_SURFACE_DASHED, "bg-hs-paper/90 p-10 text-center text-body-sm text-hs-text-secondary")}>
            No matches. Try a shorter name or the phone number.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-sm font-semibold text-hs-primary underline-offset-2 hover:underline"
              >
                Clear search
              </button>
            </div>
          </div>
        ) : (
          <div className="ds-table-shell">
            <table className="w-full min-w-[640px] text-left text-body-sm text-hs-ink">
              <thead>
                <tr className="border-b border-hs-border/70 bg-hs-cream/50 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
                  <th className="px-4 py-3 sm:px-5" scope="col">
                    Name
                  </th>
                  <th className="px-4 py-3 sm:px-5" scope="col">
                    Last visit
                  </th>
                  <th className="px-4 py-3 sm:px-5" scope="col">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right sm:px-5" scope="col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hs-border/50">
                {filtered.map((p) => {
                  const status = p.status ?? "stable";
                  const isCritical = status === "critical";
                  return (
                    <tr key={p.id} className="hover:bg-hs-cream/40">
                      <td className="px-4 py-3.5 font-medium sm:px-5">
                        <div className="font-medium">{p.name}</div>
                        <PatientTagBadges tags={p.tags} className="mt-0.5" />
                        {p.phone ? (
                          <div className="mt-0.5 text-xs text-hs-text-tertiary sm:hidden">{p.phone}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-hs-text-secondary sm:px-5">
                        {formatLast(p.lastVisitAt)}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <span
                          className={
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                            (isCritical
                              ? "border-rose-200/80 bg-rose-50/90 text-rose-900/95"
                              : "border-stone-200/80 bg-hs-cream/80 text-hs-ink/90")
                          }
                        >
                          {isCritical ? "Critical" : "Stable"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right sm:px-5">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1">
                          <Link
                            href={`/patients/${p.id}/timeline`}
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-hs-border/70 bg-hs-cream/80 text-hs-ink transition hover:border-hs-primary/35 hover:text-hs-primary"
                            title="Timeline"
                          >
                            <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
                            <span className="sr-only">Timeline</span>
                          </Link>
                          <Link
                            href={`/patients/${p.id}/profile`}
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-hs-border/70 text-hs-text-secondary transition hover:border-hs-primary/35 hover:text-hs-primary"
                            title="Edit profile"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                            <span className="sr-only">Edit profile</span>
                          </Link>
                          <Link
                            href={`/consultation?patientId=${encodeURIComponent(p.id)}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-hs-primary px-2.5 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
                            title="Start visit"
                          >
                            <Stethoscope className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            <span>Visit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
