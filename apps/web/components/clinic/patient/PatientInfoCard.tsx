"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Droplet, HeartPulse, Phone, Tag } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { PatientDetail } from "../../../lib/doctor-api";

const TAGS_KEY = (id: string) => `ha_patient_tags_${id}`;

type TagKey = "chronic" | "acute" | "highPriority";

const TAG_LABEL: Record<TagKey, { label: string; className: string }> = {
  chronic: { label: "Chronic", className: "border-hs-border/80 bg-hs-cream/80 text-hs-text-secondary" },
  acute: { label: "Acute", className: "border-sky-200/70 bg-sky-50/90 text-sky-900/90" },
  highPriority: { label: "High priority", className: "border-amber-200/60 bg-amber-50/80 text-amber-900/90" }
};

type Props = { patient: PatientDetail };

function loadTags(id: string): Set<TagKey> {
  if (typeof window === "undefined") return new Set();
  try {
    const r = localStorage.getItem(TAGS_KEY(id));
    if (!r) return new Set();
    const a = JSON.parse(r) as string[];
    return new Set(
      a.filter((x): x is TagKey => x === "chronic" || x === "acute" || x === "highPriority")
    );
  } catch {
    return new Set();
  }
}

function saveTags(id: string, s: Set<TagKey>): void {
  try {
    localStorage.setItem(TAGS_KEY(id), JSON.stringify([...s]));
  } catch {
    /* */
  }
}

export function PatientInfoCard({ patient }: Props): JSX.Element {
  const [active, setActive] = useState<Set<TagKey>>(() => new Set());
  useEffect(() => {
    setActive(loadTags(patient.id));
  }, [patient.id]);

  const toggle = useCallback(
    (k: TagKey) => {
      setActive((prev) => {
        const n = new Set(prev);
        if (n.has(k)) n.delete(k);
        else n.add(k);
        saveTags(patient.id, n);
        return n;
      });
    },
    [patient.id]
  );

  const hasClinicalSummary = Boolean(
    patient.allergies?.trim() ||
      patient.bloodGroup?.trim() ||
      patient.ongoingConditions?.trim() ||
      patient.emergencyContactName?.trim() ||
      patient.emergencyContactPhone?.trim()
  );

  return (
    <div className="ds-app-card p-4 sm:p-5">
      <h2 className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">Patient info</h2>
      <div className="mt-3 space-y-1.5 text-body-sm text-hs-text-secondary">
        {patient.age != null ? <p>Age: {patient.age}</p> : <p>Age: —</p>}
        {patient.phone ? (
          <p>
            Contact: <span className="text-hs-ink">{patient.phone}</span>
          </p>
        ) : (
          <p>Contact: —</p>
        )}
        <p>Registered: {new Date(patient.createdAt).toLocaleDateString()}</p>
      </div>

      {hasClinicalSummary ? (
        <div className="mt-4 border-t border-hs-border/40 pt-4">
          <p className="flex items-center gap-1.5 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
            <HeartPulse className="h-3.5 w-3.5" aria-hidden />
            Clinical summary
          </p>
          <dl className="mt-2 space-y-2 text-body-sm">
            {patient.allergies?.trim() ? (
              <div
                className={cn(
                  "rounded-lg border px-2.5 py-1.5",
                  "border-rose-200/70 bg-rose-50/70 text-rose-900"
                )}
              >
                <dt className="flex items-center gap-1 text-caption-sm font-semibold uppercase tracking-wide">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Allergies
                </dt>
                <dd className="mt-0.5 leading-snug">{patient.allergies}</dd>
              </div>
            ) : null}
            {patient.bloodGroup?.trim() ? (
              <div className="flex items-center gap-2 text-hs-ink">
                <Droplet className="h-3.5 w-3.5 text-rose-500/80" aria-hidden />
                <span className="text-caption-sm uppercase tracking-wide text-hs-text-tertiary">Blood:</span>
                <span className="font-semibold">{patient.bloodGroup}</span>
              </div>
            ) : null}
            {patient.ongoingConditions?.trim() ? (
              <div>
                <dt className="text-caption-sm uppercase tracking-wide text-hs-text-tertiary">Ongoing</dt>
                <dd className="mt-0.5 whitespace-pre-wrap leading-snug text-hs-ink">{patient.ongoingConditions}</dd>
              </div>
            ) : null}
            {patient.emergencyContactName?.trim() || patient.emergencyContactPhone?.trim() ? (
              <div className="flex items-start gap-2 text-hs-ink">
                <Phone className="mt-0.5 h-3.5 w-3.5 text-hs-text-tertiary" aria-hidden />
                <div>
                  <p className="text-caption-sm uppercase tracking-wide text-hs-text-tertiary">Emergency</p>
                  <p className="mt-0.5">
                    {patient.emergencyContactName?.trim() ? (
                      <span className="font-medium">{patient.emergencyContactName}</span>
                    ) : null}
                    {patient.emergencyContactName?.trim() && patient.emergencyContactPhone?.trim() ? " · " : null}
                    {patient.emergencyContactPhone?.trim() ? (
                      <a
                        href={`tel:${patient.emergencyContactPhone.replace(/\s/g, "")}`}
                        className="font-semibold text-hs-primary hover:underline"
                      >
                        {patient.emergencyContactPhone}
                      </a>
                    ) : null}
                  </p>
                </div>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <div className="mt-4 border-t border-hs-border/40 pt-4">
        <p className="flex items-center gap-1.5 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
          <Tag className="h-3.5 w-3.5" aria-hidden />
          Medical tags
        </p>
        <p className="mb-2 mt-1.5 text-caption-sm text-hs-text-tertiary">On this device. Tap to set.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TAG_LABEL) as TagKey[]).map((k) => {
            const on = active.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-caption-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-hs-primary/25",
                  on
                    ? `${TAG_LABEL[k].className} ring-1 ring-hs-primary/20`
                    : "border-dashed border-hs-border/70 bg-hs-cream/40 text-hs-text-tertiary hover:border-hs-border-dark/60"
                )}
                aria-pressed={on}
              >
                {TAG_LABEL[k].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-hs-border/40 pt-4">
        <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
          Initial case history
        </p>
        {patient.initialChiefComplaint ? (
          <p className="mt-2 text-body-sm leading-relaxed text-hs-ink">{patient.initialChiefComplaint}</p>
        ) : (
          <p className="mt-2 text-body-sm text-hs-text-tertiary">Not recorded yet. Capture at intake or first visit.</p>
        )}
      </div>
    </div>
  );
}
