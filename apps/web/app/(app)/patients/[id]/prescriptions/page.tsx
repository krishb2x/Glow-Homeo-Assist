"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileSignature, Loader2, Pill } from "lucide-react";
import {
  fetchPatientTimeline,
  getToken,
  type PrescriptionEvent,
  type TimelineEvent
} from "../../../../../lib/doctor-api";
import { friendlyLoadError } from "../../../../../lib/friendly-error";
import { ErrorState } from "../../../../../components/ui/LoadState";
import { DS_BTN_PRIMARY, DS_SURFACE_DASHED } from "../../../../../lib/ds-classes";
import { cn } from "../../../../../lib/cn";

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function PatientPrescriptionsPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(() => {
    if (!id || !getToken()) return;
    setLoadError(null);
    void (async () => {
      setLoading(true);
      try {
        const tl = await fetchPatientTimeline(id);
        setEvents(tl.events);
      } catch (e) {
        setLoadError(friendlyLoadError(e));
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const prescriptions = useMemo<PrescriptionEvent[]>(
    () => events.filter((e): e is PrescriptionEvent => e.kind === "prescription").sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    ),
    [events]
  );
  const latest = prescriptions[0] ?? null;
  const earlier = prescriptions.slice(1);

  if (loadError && !loading) {
    return <ErrorState err={loadError} title="Couldn’t load prescriptions" onRetry={load} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-heading-sm text-hs-ink">Prescriptions</h2>
          <p className="mt-1 text-body-sm text-hs-text-secondary">
            All prescriptions issued from finalised consultations. Open one to print or share with the patient.
          </p>
        </div>
        <Link href={`/consultation?patientId=${encodeURIComponent(id)}`} className={cn(DS_BTN_PRIMARY, "gap-2")}>
          <FileSignature className="h-4 w-4" aria-hidden />
          New prescription
        </Link>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-body-sm text-hs-text-secondary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : prescriptions.length === 0 ? (
          <div className={cn(DS_SURFACE_DASHED, "flex min-h-[240px] flex-col items-center justify-center p-8 text-center")} role="status">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-hs-cream/90 text-hs-primary" aria-hidden>
              <Pill className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h3 className="font-heading text-body-md font-semibold text-hs-ink">No prescriptions yet</h3>
            <p className="mt-1 max-w-md text-body-sm text-hs-text-secondary">
              Prescriptions appear here once you finalise them inside a consultation.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {latest ? (
              <RxCard rx={latest} highlight />
            ) : null}
            {earlier.length > 0 ? (
              <div>
                <h3 className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
                  Earlier
                </h3>
                <ul className="mt-2 space-y-3">
                  {earlier.map((rx) => (
                    <li key={rx.id}>
                      <RxCard rx={rx} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function RxCard({ rx, highlight = false }: { rx: PrescriptionEvent; highlight?: boolean }): JSX.Element {
  return (
    <article
      className={cn(
        "ds-app-card p-4 sm:p-5",
        highlight && "ring-1 ring-hs-primary/15"
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-hs-primary" aria-hidden />
          <h3 className="font-heading text-body-md font-semibold text-hs-ink">
            {highlight ? "Current prescription" : "Prescription"}
          </h3>
        </div>
        <p className="text-caption-sm text-hs-text-tertiary">{formatDateTime(rx.at)}</p>
      </header>
      {rx.items.length === 0 ? (
        <p className="mt-3 text-body-sm text-hs-text-secondary">No remedies recorded for this prescription.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-body-sm">
          {rx.items.map((item, idx) => (
            <li
              key={`${rx.id}-${idx}`}
              className="rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2"
            >
              <p className="font-semibold text-hs-ink">{item.remedy || "—"}</p>
              <p className="mt-0.5 text-caption-sm text-hs-text-secondary">
                {[item.code, item.dosage].filter(Boolean).join(" · ") || "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {rx.consultationId ? (
        <p className="mt-3 text-caption-sm">
          <Link
            href={`/consultation/${encodeURIComponent(rx.consultationId)}`}
            className="font-semibold text-hs-primary hover:underline"
          >
            Open consultation →
          </Link>
        </p>
      ) : null}
    </article>
  );
}
