"use client";

import Link from "next/link";
import { ConsultationLink } from "../../../components/clinic/ConsultationLink";
import { consultationStartHref } from "../../../lib/consultation-navigation";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Search, Stethoscope } from "lucide-react";
import { PatientListSkeleton } from "../../../components/clinic/SkeletonCard";
import { PatientTagBadges } from "../../../components/clinic/PatientTagBadges";
import { PageHeader } from "../../../components/platform/PageHeader";
import { ErrorState } from "../../../components/ui/LoadState";
import { cn } from "../../../lib/cn";
import { DS_LINK_ACTION } from "../../../lib/desktop-ui";
import { DS_BTN_PRIMARY_ROUNDED, DS_FIELD_SEARCH, DS_SURFACE_DASHED, DS_SURFACE_PANEL } from "../../../lib/ds-classes";
import { VirtualizedList } from "../../../components/platform/VirtualizedList";
import { fetchPatientsPage, getToken, type PatientListItem } from "../../../lib/doctor-api";

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
  const [total, setTotal] = useState(0);

  const load = useCallback(async (q: string) => {
    setErr(null);
    setLoading(true);
    try {
      const page = await fetchPatientsPage({
        limit: 100,
        offset: 0,
        search: q.trim() || undefined
      });
      setList(page.items);
      setTotal(page.total);
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
    const t = setTimeout(() => void load(search), search.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, load, router]);

  const filtered = list;

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
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-hs-text-tertiary" aria-hidden>
            <Search className="h-4 w-4" strokeWidth={2} />
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
          <ErrorState err={err} title="Couldn’t load patients" onRetry={() => void load(search)} />
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
                <tr className="border-b border-hs-border/50 bg-hs-cream/40 text-caption-sm font-semibold text-hs-text-tertiary">
                  <th className="px-4 py-2.5 sm:px-5" scope="col">
                    Name
                  </th>
                  <th className="px-4 py-2.5 sm:px-5" scope="col">
                    Last visit
                  </th>
                  <th className="px-4 py-2.5 sm:px-5" scope="col">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right sm:px-5" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hs-border/50">
                {filtered.map((p) => {
                  const status = p.status ?? "stable";
                  const isCritical = status === "critical";
                  return (
                    <tr key={p.id} className="hover:bg-hs-cream/30">
                      <td className="px-4 py-2.5 font-medium sm:px-5">
                        <div className="font-medium">{p.name}</div>
                        <PatientTagBadges tags={p.tags} className="mt-0.5" />
                        {p.phone ? (
                          <div className="mt-0.5 text-xs text-hs-text-tertiary sm:hidden">{p.phone}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-hs-text-secondary sm:px-5">
                        {formatLast(p.lastVisitAt)}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
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
                      <td className="px-4 py-2.5 text-right sm:px-5">
                        <div className="inline-flex flex-wrap items-center justify-end gap-3">
                          <Link
                            href={`/patients/${p.id}/timeline`}
                            className={cn(DS_LINK_ACTION, "inline-flex items-center gap-1")}
                            title="Chart"
                          >
                            <Eye className="h-3.5 w-3.5 sm:hidden" aria-hidden />
                            <span>Chart</span>
                          </Link>
                          <Link
                            href={`/patients/${p.id}/profile`}
                            className="text-caption-sm font-medium text-hs-text-secondary hover:text-hs-primary"
                            title="Edit profile"
                          >
                            <span className="inline-flex items-center gap-1">
                              <Pencil className="h-3.5 w-3.5 sm:hidden" aria-hidden />
                              Edit
                            </span>
                          </Link>
                          <ConsultationLink
                            href={consultationStartHref({ patientId: p.id })}
                            className={cn(DS_LINK_ACTION, "inline-flex items-center gap-1 font-semibold")}
                            title="Start visit"
                          >
                            <Stethoscope className="h-3.5 w-3.5 sm:hidden" aria-hidden />
                            Visit →
                          </ConsultationLink>
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
