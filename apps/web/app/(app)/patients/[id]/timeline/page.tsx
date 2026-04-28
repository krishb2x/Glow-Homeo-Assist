"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Timeline } from "../../../../../components/clinic/Timeline";
import { PatientInfoCard } from "../../../../../components/clinic/patient/PatientInfoCard";
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
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !getToken()) return;
    setErr(null);
    try {
      const [p, tl] = await Promise.all([fetchPatient(id), fetchPatientTimeline(id)]);
      setPatient(p);
      setEvents(
        (tl.events as unknown[]).filter(
          (e): e is TimelineEvent => Boolean(e) && typeof e === "object" && "kind" in (e as object)
        ) as TimelineEvent[]
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-body-sm text-rose-900" role="alert">
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
    <div className="min-h-0 min-w-0 flex-1">
      <div className="flex w-full min-w-0 flex-col gap-8 lg:flex-row lg:gap-10">
        <aside
          className="order-2 w-full min-w-0 shrink-0 lg:order-1 lg:max-w-sm lg:sticky lg:top-[10rem] lg:self-start"
          aria-label="Patient context"
        >
          <PatientInfoCard patient={patient} />
        </aside>
        <div className="order-1 min-w-0 flex-1 lg:order-2">
          <div className="mb-6 max-w-3xl">
            <h2 className="font-heading text-heading-sm text-hs-ink">Clinical timeline</h2>
          </div>
          <div className="w-full min-w-0">
            <Timeline patientId={id} events={events} onFollowupToggled={load} />
          </div>
        </div>
      </div>
    </div>
  );
}
