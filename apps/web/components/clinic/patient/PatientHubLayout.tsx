"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pill, Stethoscope } from "lucide-react";
import {
  fetchPatient,
  fetchPatientTimeline,
  getToken,
  startConsultation,
  type PatientDetail
} from "../../../lib/doctor-api";
import { PatientSubNav } from "../PatientSubNav";
import { ConsultationPatientBar } from "../workflow/ConsultationPatientBar";
import { DS_BTN_PRIMARY_ROUNDED, DS_BTN_SECONDARY } from "../../../lib/ds-classes";
import { cn } from "../../../lib/cn";

export function PatientHubLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setErr(null);
      try {
        const [p, tl] = await Promise.all([fetchPatient(id), fetchPatientTimeline(id)]);
        setPatient(p);
        setHasHistory(
          tl.events.some((e) => e.kind === "consultation" || e.kind === "prescription")
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load");
        setPatient(null);
      }
    })();
  }, [id, router]);

  const onNewConsultation = useCallback(async () => {
    if (!id) return;
    setStarting(true);
    setErr(null);
    try {
      const { id: cid } = await startConsultation(id, {
        type: hasHistory ? "FOLLOW_UP" : "INITIAL"
      });
      router.push(`/consultation/${cid}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start");
    } finally {
      setStarting(false);
    }
  }, [id, hasHistory, router]);

  if (!id) {
    return <p className="text-body-sm text-hs-text-secondary">Invalid link.</p>;
  }

  if (err && !patient) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 p-6 text-body-sm text-rose-900">
        {err}
        <p className="mt-3">
          <Link href="/patients" className="font-medium text-hs-primary hover:underline">
            Back to patients
          </Link>
        </p>
      </div>
    );
  }

  if (!patient) {
    return (
      <p className="text-body-sm text-hs-text-secondary" role="status">
        Loading…
      </p>
    );
  }

  const visitType = hasHistory ? "FOLLOW_UP" : "INITIAL";

  return (
    <div className="min-w-0">
      <div
        className="sticky top-0 z-30 -mx-4 border-b border-hs-border/60 bg-hs-surface/95 backdrop-blur sm:-mx-6"
        role="region"
        aria-label="Patient chart"
      >
        <div className="border-b border-hs-border/30 px-4 py-3 sm:px-6">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-hs-text-secondary transition hover:text-hs-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Patients
          </Link>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-hs-ink">{patient.name}</h1>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onNewConsultation()}
                disabled={starting}
                className={cn(DS_BTN_PRIMARY_ROUNDED, "gap-1.5 disabled:cursor-not-allowed disabled:opacity-50")}
              >
                <Stethoscope className="h-4 w-4" aria-hidden />
                {starting ? "Starting…" : "New consultation"}
              </button>
              <Link href={`/patients/${id}/prescriptions`} className={cn(DS_BTN_SECONDARY, "gap-1.5")}>
                <Pill className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Prescriptions
              </Link>
            </div>
          </div>
          {err ? <p className="mt-2 text-body-sm text-rose-700">{err}</p> : null}
        </div>

        <ConsultationPatientBar
          patientId={id}
          patientName={patient.name}
          age={patient.age ?? null}
          gender={patient.gender ?? null}
          phone={patient.phone ?? null}
          allergies={patient.allergies ?? null}
          visitType={visitType}
          lastVisitAt={patient.lastVisitAt}
          lastCaseOutcome={patient.lastCaseOutcome ?? null}
          className="border-b-0 bg-hs-cream/30"
        />

        <div className="px-4 sm:px-6">
          <PatientSubNav patientId={id} />
        </div>
      </div>
      <div className="min-w-0 py-6">{children}</div>
    </div>
  );
}
