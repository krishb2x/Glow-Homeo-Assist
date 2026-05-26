"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConsultationLink } from "../../../../../components/clinic/ConsultationLink";
import { consultationStartHref } from "../../../../../lib/consultation-navigation";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Timeline } from "../../../../../components/clinic/Timeline";
import { DoctorMemoPanel } from "../../../../../components/clinic/memos/DoctorMemoPanel";
import { PatientInfoCard } from "../../../../../components/clinic/patient/PatientInfoCard";
import { PageHeader } from "../../../../../components/platform/PageHeader";
import { DS_LINK_ACTION } from "../../../../../lib/desktop-ui";
import {
  fetchPatient,
  fetchPatientTimeline,
  getToken,
  type PatientDetail,
  type TimelineEvent
} from "../../../../../lib/doctor-api";

export default function PatientTimelinePage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (append = false, offset = 0) => {
    if (!id || !getToken()) return;
    setErr(null);
    if (append) setLoadingMore(true);
    try {
      const tl = await fetchPatientTimeline(id, { limit: 40, offset, includeNotes: false });
      if (!append) {
        const p = await fetchPatient(id);
        setPatient(p);
      }
      const parsed = (tl.events as unknown[]).filter(
        (e): e is TimelineEvent => Boolean(e) && typeof e === "object" && "kind" in (e as object)
      ) as TimelineEvent[];
      setEvents((prev) => (append ? [...prev, ...parsed] : parsed));
      setHasMore(Boolean(tl.hasMore));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) {
    return (
      <div
        className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-body-sm text-rose-900"
        role="alert"
      >
        {err}
      </div>
    );
  }
  if (!patient) {
    return (
      <p className="flex items-center gap-2 text-body-sm text-hs-text-secondary" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading record…
      </p>
    );
  }

  return (
    <div className="ds-page min-h-0 min-w-0">
      <PageHeader
        title={patient.name}
        description="Clinical timeline and visit history"
        action={
          <ConsultationLink
            href={consultationStartHref({ patientId: id })}
            className={DS_LINK_ACTION}
          >
            Start visit →
          </ConsultationLink>
        }
      />

      <div className="flex w-full min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
        <aside
          className="order-2 w-full min-w-0 shrink-0 space-y-4 lg:order-1 lg:w-72 lg:sticky lg:top-24 lg:self-start"
          aria-label="Patient context"
        >
          <PatientInfoCard patient={patient} />
          <DoctorMemoPanel
            patientId={id}
            title="Your notes"
            description="Private reminders. Not part of the clinical record."
            maxItems={10}
          />
        </aside>

        <div className="order-1 min-h-0 min-w-0 flex-1 lg:order-2">
          <h2 className="mb-4 font-heading text-body-md font-semibold text-hs-ink">Timeline</h2>
          <div className="w-full min-w-0">
            <Timeline patientId={id} events={events} onFollowupToggled={() => void load()} />
            {hasMore ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void load(true, events.length)}
                className="mt-5 rounded-lg border border-hs-border/40 bg-hs-paper px-4 py-2 text-caption-sm font-semibold text-hs-primary transition hover:bg-hs-cream/60 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load older events"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
