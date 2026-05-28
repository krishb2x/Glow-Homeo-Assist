"use client";

import Link from "next/link";
import { ConsultationLink } from "../../../components/clinic/ConsultationLink";
import { consultationStartHref } from "../../../lib/consultation-navigation";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Pencil,
  Search,
  Stethoscope,
  Phone,
  User,
  AlertTriangle,
  HeartPulse,
  X,
  Loader2
} from "lucide-react";
import { PatientListSkeleton } from "../../../components/clinic/SkeletonCard";
import { PatientTagBadges } from "../../../components/clinic/PatientTagBadges";
import { PageHeader } from "../../../components/platform/PageHeader";
import { ErrorState } from "../../../components/ui/LoadState";
import { cn } from "../../../lib/cn";
import { DS_BTN_PRIMARY_ROUNDED, DS_FIELD_SEARCH, DS_SURFACE_DASHED, DS_SURFACE_PANEL } from "../../../lib/ds-classes";
import { VirtualizedList } from "../../../components/platform/VirtualizedList";
import {
  fetchPatientsPage,
  getToken,
  fetchPatient,
  fetchPatientTimeline,
  type PatientListItem,
  type PatientDetail,
  type TimelineEvent
} from "../../../lib/doctor-api";

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

  // Filter States
  const [statusFilter, setStatusFilter] = useState<"all" | "critical" | "stable">("all");
  const [tagFilter, setTagFilter] = useState<"all" | "chronic" | "acute" | "first_visit" | "follow_up">("all");

  // Preview States
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [previewTimeline, setPreviewTimeline] = useState<TimelineEvent[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  // Load preview data when a patient is selected
  useEffect(() => {
    if (!selectedId) {
      setPatientDetail(null);
      setPreviewTimeline([]);
      return;
    }
    let active = true;
    setLoadingPreview(true);

    Promise.all([
      fetchPatient(selectedId).catch(() => null),
      fetchPatientTimeline(selectedId, { limit: 3 }).catch(() => null)
    ]).then(([detail, timeline]) => {
      if (!active) return;
      setPatientDetail(detail);
      setPreviewTimeline(timeline?.events ?? []);
      setLoadingPreview(false);
    });

    return () => {
      active = false;
    };
  }, [selectedId]);

  // Client-side filtering on loaded page items
  const filtered = list.filter((p) => {
    if (statusFilter !== "all" && (p.status || "stable") !== statusFilter) return false;
    if (tagFilter !== "all" && !(p.tags ?? []).includes(tagFilter as any)) return false;
    return true;
  });

  const renderPreviewEvent = (e: TimelineEvent, i: number) => {
    const isConsult = e.kind === "consultation";
    const isRx = e.kind === "prescription";
    return (
      <div key={i} className="relative pl-6 pb-4 border-l border-hs-border/60 last:border-l-0 last:pb-1">
        <span className={cn(
          "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-white",
          isConsult && "bg-hs-primary",
          isRx && "bg-hs-text-tertiary",
          e.kind === "followup" && "bg-hs-warning",
          e.kind === "document" && "bg-hs-text-secondary"
        )} />
        <div className="text-[10px] text-hs-text-tertiary font-medium">
          {new Date(e.at).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </div>
        <div className="text-xs font-semibold text-hs-ink capitalize mt-0.5 flex items-center gap-1.5">
          {isConsult ? (
            <>
              <span>{(e as any).visitType === "INITIAL" ? "Initial" : "Follow-up"} Consultation</span>
              <span className="text-[10px] font-normal text-hs-text-tertiary">({(e as any).hasNoteFinal ? "Finalised" : "Draft"})</span>
            </>
          ) : isRx ? (
            <span>Prescription Issued</span>
          ) : (
            <span>{e.kind}</span>
          )}
        </div>
        {isRx && (e as any).items && (
          <ul className="list-disc pl-4 text-[11px] text-hs-text-secondary mt-1 space-y-0.5">
            {(e as any).items.slice(0, 3).map((it: any, j: number) => (
              <li key={j}>
                <span className="font-semibold text-hs-ink">{it.remedy || it.code}</span>
                {it.dosage ? ` · ${it.dosage}` : ""}
              </li>
            ))}
            {(e as any).items.length > 3 && (
              <li className="list-none text-hs-text-tertiary italic">+{ (e as any).items.length - 3 } more items</li>
            )}
          </ul>
        )}
        {isConsult && (e as any).summary && (
          <p className="text-[11px] text-hs-text-secondary leading-relaxed mt-1 line-clamp-2 italic">
            "{(e as any).summary}"
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-w-0 flex flex-col h-full">
      <PageHeader
        title="Patients"
        description={undefined}
        action={
          <Link href="/patients/new" className={DS_BTN_PRIMARY_ROUNDED}>
            New patient
          </Link>
        }
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch md:items-center justify-between pb-4 border-b border-hs-border/50 shrink-0">
        <div className="relative flex-1 max-w-xl">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-hs-text-tertiary" aria-hidden>
            <Search className="h-4 w-4" strokeWidth={2} />
          </span>
          <input
            id="patient-search"
            type="search"
            role="searchbox"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name, phone..."
            className={DS_FIELD_SEARCH}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filters */}
          <div className="flex items-center rounded-lg bg-hs-cream/40 p-0.5 border border-hs-border/60">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition",
                statusFilter === "all" ? "bg-hs-primary text-white shadow-sm" : "text-hs-text-secondary hover:text-hs-ink"
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("stable")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition",
                statusFilter === "stable" ? "bg-hs-primary text-white shadow-sm" : "text-hs-text-secondary hover:text-hs-ink"
              )}
            >
              Stable
            </button>
            <button
              onClick={() => setStatusFilter("critical")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition",
                statusFilter === "critical" ? "bg-hs-primary text-white shadow-sm" : "text-hs-text-secondary hover:text-hs-ink"
              )}
            >
              Critical
            </button>
          </div>

          {/* Tag Filters */}
          <select
            value={tagFilter}
            onChange={(e: any) => setTagFilter(e.target.value)}
            className="text-xs font-semibold bg-hs-paper border border-hs-border/60 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-hs-primary"
          >
            <option value="all">All Tags</option>
            <option value="chronic">Chronic</option>
            <option value="acute">Acute</option>
            <option value="first_visit">First Visit</option>
            <option value="follow_up">Follow Up</option>
          </select>
        </div>
      </div>

      {err ? (
        <div className="mt-4 max-w-2xl shrink-0">
          <ErrorState err={err} title="Couldn’t load patients" onRetry={() => void load(search)} />
        </div>
      ) : null}

      <div className="flex h-[calc(100vh-14rem)] gap-6 mt-4 overflow-hidden min-h-0">
        {/* Left Side: List Panel */}
        <div className="flex-1 min-w-0 flex flex-col bg-hs-paper border border-hs-border/60 rounded-2xl overflow-hidden shadow-ds-sm">
          {loading ? (
            <div className="p-6">
              <PatientListSkeleton count={6} />
            </div>
          ) : filtered.length === 0 && list.length === 0 ? (
            <div className={cn(DS_SURFACE_PANEL, "border-hs-primary/20 p-10 text-center m-6 flex-1 flex flex-col items-center justify-center")}>
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
            <div className={cn(DS_SURFACE_DASHED, "bg-hs-paper/90 p-10 text-center text-body-sm text-hs-text-secondary m-6 flex-1 flex flex-col items-center justify-center")}>
              No matches found.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => { setSearch(""); setStatusFilter("all"); setTagFilter("all"); }}
                  className="text-sm font-semibold text-hs-primary underline-offset-2 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <VirtualizedList
                items={filtered}
                estimateSize={92}
                className="flex-1 overflow-y-auto pr-1"
                renderRow={(p) => {
                  const status = p.status ?? "stable";
                  const isCritical = status === "critical";
                  const isSelected = selectedId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "w-full text-left p-4 border-b border-hs-border/30 hover:bg-hs-cream/20 transition-all flex flex-col gap-1.5 focus:outline-none",
                        isSelected && "bg-hs-cream/35 border-l-4 border-l-hs-primary"
                      )}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="font-semibold text-hs-ink text-sm flex items-center gap-2">
                          {p.name}
                          <span className={cn(
                            "inline-flex h-1.5 w-1.5 rounded-full",
                            isCritical ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                          )} />
                        </div>
                        <div className="text-[10px] text-hs-text-tertiary font-mono">
                          {p.patientCode || `#${p.id.slice(0, 8)}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-hs-text-secondary">
                        {p.age ? <span>{p.age} yrs</span> : null}
                        {p.age && p.gender ? <span className="opacity-50">•</span> : null}
                        {p.gender ? <span className="capitalize">{p.gender.toLowerCase()}</span> : null}
                        {p.phone ? (
                          <>
                            <span className="opacity-50">•</span>
                            <span>{p.phone}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="flex justify-between items-center w-full mt-1">
                        <PatientTagBadges tags={p.tags} />
                        <span className="text-[10px] text-hs-text-tertiary">
                          Last visit: {p.lastVisitAt ? new Date(p.lastVisitAt).toLocaleDateString(undefined, { dateStyle: "short" }) : "Never"}
                        </span>
                      </div>
                    </button>
                  );
                }}
              />
            </div>
          )}
        </div>

        {/* Right Side: Preview Panel */}
        <div className="w-[480px] shrink-0 hidden lg:flex flex-col bg-hs-paper border border-hs-border/60 rounded-2xl overflow-hidden shadow-ds-sm min-h-0">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-hs-text-tertiary bg-hs-cream/10">
              <div className="h-14 w-14 rounded-2xl bg-hs-cream/50 flex items-center justify-center mb-4 ring-1 ring-hs-border/40">
                <User className="h-7 w-7 text-hs-text-secondary" />
              </div>
              <h3 className="font-heading font-semibold text-hs-ink text-sm">No patient selected</h3>
              <p className="text-xs text-hs-text-secondary mt-1.5 max-w-[280px]">
                Click on any patient in the list to instantly preview their clinical files, history, and notes.
              </p>
            </div>
          ) : loadingPreview ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-hs-text-tertiary">
              <Loader2 className="h-8 w-8 animate-spin text-hs-primary mb-2" />
              <p className="text-xs text-hs-text-secondary">Loading patient summary...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Preview Header */}
              <div className="p-5 border-b border-b-hs-border/50 bg-hs-cream/20 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-bold text-hs-ink">{patientDetail?.name}</h2>
                    <p className="text-[10px] font-mono text-hs-text-tertiary mt-0.5">
                      Code: {patientDetail?.patientCode || patientDetail?.id}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-1 rounded-lg hover:bg-hs-cream/60 text-hs-text-secondary transition"
                    title="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-body-sm text-hs-ink">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-hs-text-tertiary block">Age & Gender</span>
                    <span className="font-medium">
                      {[patientDetail?.age ? `${patientDetail.age} years` : "", patientDetail?.gender].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-hs-text-tertiary block">Phone</span>
                    {patientDetail?.phone ? (
                      <a href={`tel:${patientDetail.phone}`} className="font-medium text-hs-primary hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {patientDetail.phone}
                      </a>
                    ) : (
                      <span className="font-medium text-hs-text-tertiary">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-hs-text-tertiary block">Blood Group</span>
                    <span className="font-medium">{patientDetail?.bloodGroup || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-hs-text-tertiary block">Last Visit</span>
                    <span className="font-medium">{formatLast(patientDetail?.lastVisitAt)}</span>
                  </div>
                </div>

                {/* Primary Preview Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-hs-border/40">
                  <ConsultationLink
                    href={consultationStartHref({ patientId: selectedId })}
                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-hs-primary text-white text-xs font-semibold shadow-ds-sm hover:bg-hs-primary-light transition"
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    Start Visit
                  </ConsultationLink>
                  <Link
                    href={`/patients/${selectedId}/timeline`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-hs-border/60 bg-hs-paper px-3 text-xs font-semibold text-hs-ink hover:border-hs-primary/35 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Timeline
                  </Link>
                  <Link
                    href={`/patients/${selectedId}/profile`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-hs-border/60 bg-hs-paper px-3 text-xs font-semibold text-hs-ink hover:border-hs-primary/35 transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </div>
              </div>

              {/* Preview Body */}
              <div className="p-5 space-y-4">
                {/* Allergies - Critical Warning */}
                {patientDetail?.allergies && patientDetail.allergies.trim().length > 0 ? (
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-950 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Critical Allergies</h4>
                      <p className="text-xs leading-relaxed mt-1">{patientDetail.allergies}</p>
                    </div>
                  </div>
                ) : null}

                {/* Ongoing Conditions */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-hs-text-tertiary mb-1.5">Ongoing Conditions</h4>
                  <div className="p-3 rounded-xl border border-hs-border/60 bg-hs-cream/10 text-xs leading-relaxed text-hs-ink">
                    {patientDetail?.ongoingConditions || "No active chronic conditions documented."}
                  </div>
                </div>

                {/* Patient Notes */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-hs-text-tertiary mb-1.5">Administrative Notes</h4>
                  <div className="p-3 rounded-xl border border-hs-border/60 bg-hs-cream/10 text-xs leading-relaxed text-hs-ink">
                    {patientDetail?.patientNotes || "No patient notes."}
                  </div>
                </div>

                {/* Recent Medical Timeline */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-hs-text-tertiary mb-2.5">Recent Encounters</h4>
                  {previewTimeline.length === 0 ? (
                    <p className="text-xs text-hs-text-tertiary">No timeline events found.</p>
                  ) : (
                    <div className="relative pl-1">
                      {previewTimeline.map((e, i) => renderPreviewEvent(e, i))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
