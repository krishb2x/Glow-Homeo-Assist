"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Droplet, Phone, Pill, Stethoscope } from "lucide-react";
import {
  fetchPatient,
  fetchPatientTimeline,
  getToken,
  startConsultation,
  type PatientDetail
} from "../../../lib/doctor-api";
import { PatientSubNav } from "../PatientSubNav";
import { DS_BTN_PRIMARY_ROUNDED, DS_BTN_SECONDARY } from "../../../lib/ds-classes";
import { cn } from "../../../lib/cn";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function PatientHubLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setErr(null);
      try {
        setPatient(await fetchPatient(id));
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
      const hasHistory = (await fetchPatientTimeline(id)).events.some(
        (e) => e.kind === "consultation" || e.kind === "prescription"
      );
      const { id: cid } = await startConsultation(id, { type: hasHistory ? "FOLLOW_UP" : "INITIAL" });
      router.push(`/consultation/${cid}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start");
    } finally {
      setStarting(false);
    }
  }, [id, router]);

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

  const allergyText = patient.allergies?.trim();
  const bloodText = patient.bloodGroup?.trim();
  const emergency = [patient.emergencyContactName?.trim(), patient.emergencyContactPhone?.trim()]
    .filter(Boolean)
    .join(" · ");
  const hasClinicalChips = Boolean(allergyText || bloodText || emergency);

  return (
    <div className="min-w-0">
      <div
        className="sticky top-0 z-30 -mx-4 border-b border-hs-border/60 bg-hs-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
        role="region"
        aria-label="Patient header"
      >
        <div className="mb-1">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-hs-text-secondary transition hover:text-hs-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Patients
          </Link>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-hs-ink">{patient.name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-body-sm text-hs-text-secondary">
              {patient.age != null ? <span>{patient.age} years</span> : <span>Age not recorded</span>}
              {patient.phone ? <span>Contact: {patient.phone}</span> : <span>Contact: —</span>}
              <span>Last visit: {formatDate(patient.lastVisitAt)}</span>
            </p>
            {err ? <p className="mt-1 text-body-sm text-rose-700">{err}</p> : null}
          </div>
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
            <Link
              href={`/patients/${id}/prescriptions`}
              className={cn(DS_BTN_SECONDARY, "gap-1.5")}
            >
              <Pill className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Prescriptions
            </Link>
          </div>
        </div>

        {hasClinicalChips ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {allergyText ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50/90 px-2.5 py-0.5 text-caption-sm font-medium text-rose-900">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Allergies: {allergyText.length > 48 ? `${allergyText.slice(0, 48)}…` : allergyText}
              </span>
            ) : null}
            {bloodText ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-hs-border/60 bg-hs-paper px-2.5 py-0.5 text-caption-sm font-medium text-hs-ink">
                <Droplet className="h-3 w-3 text-rose-500/80" aria-hidden />
                {bloodText}
              </span>
            ) : null}
            {emergency ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-hs-border/60 bg-hs-paper px-2.5 py-0.5 text-caption-sm font-medium text-hs-ink">
                <Phone className="h-3 w-3 text-hs-text-tertiary" aria-hidden />
                Emergency: {emergency}
              </span>
            ) : null}
          </div>
        ) : null}

        <PatientSubNav patientId={id} />
      </div>
      <div className="min-w-0 py-6">{children}</div>
    </div>
  );
}
