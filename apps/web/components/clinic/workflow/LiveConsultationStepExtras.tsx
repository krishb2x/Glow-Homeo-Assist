"use client";

/**
 * Supplemental UI rendered below each workflow step.
 * Keeps LiveConsultationClient focused on state + persistence while preserving
 * templates, prior-outcome, prescription tools, and export.
 */
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
import type { CaseOutcomeValue, PendingPriorOutcome } from "../../../lib/doctor-api";
import { CaseOutcomePanel } from "../CaseOutcomePanel";
import { cn } from "../../../lib/cn";
import type { PrescriptionEntry } from "./steps";

export type StepExtrasContext = {
  formDisabled: boolean;
  busy: boolean;
  patientId: string;
  patientName: string;
  patientAllergies: string | null;
  sessionEnded: boolean;
  consultationRunning: boolean;
  workspace: {
    doctorName: string;
    clinicName: string;
    qualification: string | null;
    registrationNumber: string | null;
  } | null;
  ctx: {
    patientInitialComplaint: string | null;
    patientNotes: string | null;
    lastVisitAt: string | null;
    consultationType: string;
  } | null;
  lastCaseOutcome: { outcome: string } | null;
  patientForm: {
    name: string;
    age: string;
    gender: string;
    phone: string;
    address: string;
    initialChiefComplaint: string;
    patientNotes: string;
  };
  patientEditOpen: boolean;
  setPatientEditOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setPatientForm: React.Dispatch<React.SetStateAction<StepExtrasContext["patientForm"]>>;
  savePatient: () => Promise<void>;
  pendingPriorOutcome: PendingPriorOutcome | null;
  priorOutcomeSaved: boolean;
  priorOutcomeValue: CaseOutcomeValue | "";
  priorOutcomeAssessment: string;
  setPriorOutcomeValue: (v: CaseOutcomeValue | "") => void;
  setPriorOutcomeAssessment: (v: string) => void;
  savePriorOutcome: () => Promise<void>;
  prevRx: PrescriptionEntry[] | null;
  showPrevRx: boolean;
  setShowPrevRx: (v: boolean | ((p: boolean) => boolean)) => void;
  setRxEntries: React.Dispatch<React.SetStateAction<PrescriptionEntry[]>>;
  setStatusMsg: (v: string) => void;
  followUpEnabled: boolean;
  createFollowUpTask: boolean;
  setCreateFollowUpTask: (v: boolean) => void;
  lockAfterFinalize: boolean;
  setLockAfterFinalize: (v: boolean) => void;
  sendPrescriptionWhatsApp: boolean;
  setSendPrescriptionWhatsApp: (v: boolean) => void;
  sendPrescriptionEmail: boolean;
  setSendPrescriptionEmail: (v: boolean) => void;
  notifyEmail: string;
  setNotifyEmail: (v: string) => void;
  patientHasPhone: boolean;
  skipPrescription: boolean;
  setSkipPrescription: (v: boolean) => void;
  hasPrescriptionLines: boolean;
  finalizeReadiness: { canFinalize: boolean; blockedReason: string | null; blockers: string[] };
  finalizeConsultation: () => Promise<void>;
  deliveryStatusMessage?: string | null;
  rxOutPrefs: { showSymptoms: boolean; showNotes: boolean; showInstructions: boolean };
  setRxOutPrefs: (prefs: { showSymptoms?: boolean; showNotes?: boolean; showInstructions?: boolean }) => void;
  openPreview: (mode: "doctor" | "patient") => void;
};

function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("ds-app-card p-5", className)}>{children}</div>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="block text-caption-sm font-semibold text-hs-text-secondary">{children}</span>;
}

function TaField({
  value,
  onChange,
  rows,
  placeholder,
  disabled
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows ?? 3}
      placeholder={placeholder}
      disabled={disabled}
      className="mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2.5 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60"
    />
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  disabled
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60"
    />
  );
}

export function buildConsultationStepExtras(c: StepExtrasContext): Partial<Record<ConsultationStep, ReactNode>> {
  return {
    patient: (
      <>
        {c.lastCaseOutcome ? (
          <p className="text-caption-sm text-hs-text-secondary">
            Last outcome:{" "}
            <span className="font-medium text-hs-ink">
              {c.lastCaseOutcome.outcome.replace(/_/g, " ").toLowerCase()}
            </span>
          </p>
        ) : null}
        {c.pendingPriorOutcome && !c.priorOutcomeSaved ? (
          <CaseOutcomePanel
            endedAt={c.pendingPriorOutcome.endedAt}
            summary={c.pendingPriorOutcome.summary}
            value={c.priorOutcomeValue}
            assessment={c.priorOutcomeAssessment}
            onChange={c.setPriorOutcomeValue}
            onAssessmentChange={c.setPriorOutcomeAssessment}
            onSave={c.savePriorOutcome}
            disabled={c.formDisabled}
            compact
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => c.setPatientEditOpen((v) => !v)}
            disabled={c.formDisabled}
            className="text-caption-sm font-semibold text-hs-primary hover:underline disabled:opacity-40"
          >
            {c.patientEditOpen ? "Close edit" : "Edit patient details"}
          </button>
          {c.patientId ? (
            <Link
              href={`/patients/${c.patientId}/timeline`}
              className="text-caption-sm font-semibold text-hs-primary hover:underline"
            >
              View full chart →
            </Link>
          ) : null}
        </div>
        {c.patientEditOpen ? (
          <SectionCard>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Name</FieldLabel>
                <InputField value={c.patientForm.name} onChange={(v) => c.setPatientForm((p) => ({ ...p, name: v }))} />
              </label>
              <label className="block">
                <FieldLabel>Age</FieldLabel>
                <InputField
                  value={c.patientForm.age}
                  onChange={(v) => c.setPatientForm((p) => ({ ...p, age: v.replace(/\D/g, "") }))}
                  placeholder="years"
                />
              </label>
              <label className="block">
                <FieldLabel>Gender</FieldLabel>
                <InputField value={c.patientForm.gender} onChange={(v) => c.setPatientForm((p) => ({ ...p, gender: v }))} />
              </label>
              <label className="block">
                <FieldLabel>Phone</FieldLabel>
                <InputField value={c.patientForm.phone} onChange={(v) => c.setPatientForm((p) => ({ ...p, phone: v }))} />
              </label>
            </div>
            <label className="mt-3 block">
              <FieldLabel>Address</FieldLabel>
              <TaField value={c.patientForm.address} onChange={(v) => c.setPatientForm((p) => ({ ...p, address: v }))} rows={2} disabled={c.formDisabled} />
            </label>
            <label className="mt-3 block">
              <FieldLabel>Initial chief complaint</FieldLabel>
              <TaField
                value={c.patientForm.initialChiefComplaint}
                onChange={(v) => c.setPatientForm((p) => ({ ...p, initialChiefComplaint: v }))}
                rows={2}
                disabled={c.formDisabled}
              />
            </label>
            <label className="mt-3 block">
              <FieldLabel>Chart notes</FieldLabel>
              <TaField
                value={c.patientForm.patientNotes}
                onChange={(v) => c.setPatientForm((p) => ({ ...p, patientNotes: v }))}
                rows={2}
                disabled={c.formDisabled}
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void c.savePatient()}
                disabled={c.busy || c.formDisabled}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-hs-primary px-4 text-caption-sm font-semibold text-white disabled:opacity-50"
              >
                {c.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Save patient
              </button>
              <button type="button" onClick={() => c.setPatientEditOpen(false)} className="text-caption-sm text-hs-text-secondary hover:underline">
                Cancel
              </button>
            </div>
          </SectionCard>
        ) : null}
      </>
    ),

    prescription: (
      <>
        {c.patientAllergies ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
            <div>
              <p className="text-body-sm font-semibold text-rose-900">Allergies / sensitivities</p>
              <p className="mt-0.5 text-caption-sm text-rose-800">{c.patientAllergies}</p>
            </div>
          </div>
        ) : null}
        {c.prevRx && c.prevRx.length > 0 ? (
          <SectionCard className="border-hs-border/50 bg-hs-cream/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-body-sm font-semibold text-hs-ink">Previous prescription ({c.prevRx.length} items)</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => c.setShowPrevRx((x) => !x)} className="text-caption-sm font-semibold text-hs-primary hover:underline">
                  {c.showPrevRx ? "Hide" : "View"}
                </button>
                {!c.formDisabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      c.setRxEntries(
                        c.prevRx!.map((e) => ({
                          ...e,
                          id: `rx-${Date.now()}-${Math.random().toString(36).slice(2)}`
                        }))
                      );
                      c.setStatusMsg("Previous prescription loaded — review before saving.");
                    }}
                    className="rounded-lg bg-hs-primary/10 px-3 py-1.5 text-caption-sm font-semibold text-hs-primary"
                  >
                    Repeat all
                  </button>
                ) : null}
              </div>
            </div>
            {c.showPrevRx ? (
              <ul className="mt-2 space-y-1">
                {c.prevRx.map((e) => (
                  <li key={e.id} className="rounded-lg bg-hs-paper px-3 py-2 text-body-sm">
                    <span className="font-medium">{e.name}</span>
                    {e.potency ? ` · ${e.potency}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>
        ) : null}
        <p className="text-caption-sm text-hs-text-tertiary">
          Saved automatically when you finalize. Use Preview Rx in Step 9 to inspect the patient copy.
        </p>
      </>
    ),

    followup: c.followUpEnabled ? (
      <label className="flex items-center gap-3 rounded-xl border border-hs-border/30 bg-hs-cream/40 px-3 py-2.5">
        <input
          type="checkbox"
          checked={c.createFollowUpTask}
          onChange={(e) => c.setCreateFollowUpTask(e.target.checked)}
          disabled={c.formDisabled}
          className="h-4 w-4 rounded border-hs-border accent-hs-primary"
        />
        <span className="text-body-sm text-hs-ink">Create follow-up task in queue when finalized</span>
      </label>
    ) : null,

    finalize: (
      <>
        {(!c.workspace?.qualification || !c.workspace.registrationNumber) && !c.sessionEnded ? (
          <SectionCard className="border-amber-200/70 bg-amber-50/40">
            <p className="text-caption-sm text-amber-950">
              <span className="font-semibold">Letterhead incomplete.</span> Add your qualification and
              registration number in{" "}
              <Link href="/settings" className="font-semibold text-hs-primary hover:underline">
                Settings
              </Link>{" "}
              — they appear on every prescription.
            </p>
          </SectionCard>
        ) : null}
        {c.pendingPriorOutcome && !c.priorOutcomeSaved ? (
          <SectionCard className="border-amber-200/60 bg-amber-50/40">
            <CaseOutcomePanel
              endedAt={c.pendingPriorOutcome.endedAt}
              summary={c.pendingPriorOutcome.summary}
              value={c.priorOutcomeValue}
              assessment={c.priorOutcomeAssessment}
              onChange={c.setPriorOutcomeValue}
              onAssessmentChange={c.setPriorOutcomeAssessment}
              onSave={c.savePriorOutcome}
              disabled={c.formDisabled}
            />
          </SectionCard>
        ) : null}
        {!c.sessionEnded ? (
          <SectionCard className="border-hs-primary/20 bg-hs-primary-very-light/30">
            <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
              Finalize & send
            </p>

            <div className="mt-3 space-y-2">
              <label
                className={cn(
                  "flex items-center gap-2 text-body-sm",
                  !c.patientHasPhone && "text-hs-text-tertiary"
                )}
              >
                <input
                  type="checkbox"
                  checked={c.sendPrescriptionWhatsApp}
                  onChange={(e) => c.setSendPrescriptionWhatsApp(e.target.checked)}
                  disabled={!c.patientHasPhone || c.busy}
                  className="h-4 w-4 rounded border-hs-border accent-hs-primary disabled:opacity-50"
                />
                <span>
                  WhatsApp to patient
                  {!c.patientHasPhone ? " (no phone on file)" : ""}
                </span>
              </label>
              <label className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  checked={c.sendPrescriptionEmail}
                  onChange={(e) => c.setSendPrescriptionEmail(e.target.checked)}
                  disabled={c.busy}
                  className="h-4 w-4 rounded border-hs-border accent-hs-primary"
                />
                Email prescription
              </label>
              {c.sendPrescriptionEmail ? (
                <input
                  type="email"
                  value={c.notifyEmail}
                  onChange={(e) => c.setNotifyEmail(e.target.value)}
                  placeholder="patient@example.com"
                  disabled={c.busy}
                  className="w-full rounded-xl border border-hs-border/40 bg-white px-3 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60"
                />
              ) : null}
            </div>

            {!c.hasPrescriptionLines && !c.skipPrescription ? (
              <label className="mt-3 flex items-start gap-2 rounded-lg border border-hs-border/30 bg-white px-3 py-2.5 text-body-sm text-hs-ink">
                <input
                  type="checkbox"
                  checked={c.skipPrescription}
                  onChange={(e) => c.setSkipPrescription(e.target.checked)}
                  disabled={c.busy || c.sessionEnded}
                  className="mt-0.5 h-4 w-4 rounded border-hs-border accent-hs-primary"
                />
                <span>
                  <span className="font-medium">No prescription this visit</span>
                  <span className="mt-0.5 block text-caption-sm text-hs-text-secondary">
                    Check only if no medicines are being prescribed today.
                  </span>
                </span>
              </label>
            ) : null}

            {!c.finalizeReadiness.canFinalize && !c.sessionEnded ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-caption-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{c.finalizeReadiness.blockedReason ?? "Complete required sections above."}</span>
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void c.finalizeConsultation()}
              disabled={
                c.busy ||
                c.sessionEnded ||
                !c.finalizeReadiness.canFinalize
              }
              className="mt-4 flex w-full min-h-12 items-center justify-center rounded-xl bg-hs-primary text-body-sm font-bold text-white disabled:opacity-50"
            >
              {c.busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Finalizing & sending…
                </>
              ) : (
                "Finalize & send"
              )}
            </button>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => c.openPreview("patient")}
                disabled={c.formDisabled}
                className="text-caption-sm font-semibold text-hs-primary hover:underline disabled:opacity-40"
              >
                Preview Rx
              </button>
              <label className="inline-flex items-center gap-2 text-caption-sm text-hs-text-secondary">
                <input
                  type="checkbox"
                  checked={c.lockAfterFinalize}
                  onChange={(e) => c.setLockAfterFinalize(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-hs-border accent-hs-primary"
                />
                Lock editing after send
              </label>
            </div>

            <details className="mt-3 group">
              <summary className="cursor-pointer text-caption-sm font-semibold text-hs-text-secondary hover:text-hs-primary">
                What gets printed on the patient copy
              </summary>
              <div className="mt-2 space-y-1.5">
                {(
                  [
                    ["showSymptoms", "Include complaints"] as const,
                    ["showNotes", "Include clinical notes"] as const,
                    ["showInstructions", "Include instructions"] as const
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-caption-sm">
                    <input
                      type="checkbox"
                      checked={c.rxOutPrefs[key]}
                      onChange={() => c.setRxOutPrefs({ [key]: !c.rxOutPrefs[key] })}
                      className="h-3.5 w-3.5 rounded border-hs-border accent-hs-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </details>
          </SectionCard>
        ) : (
          <SectionCard className="border-emerald-200/70 bg-emerald-50/60">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
              <p className="text-body-sm font-bold text-emerald-900">Consultation finalized</p>
            </div>
            {c.deliveryStatusMessage ? (
              <p className="mt-2 text-caption-sm text-emerald-900/85">{c.deliveryStatusMessage}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-caption-sm">
              <button
                type="button"
                onClick={() => c.openPreview("patient")}
                className="font-semibold text-hs-primary hover:underline"
              >
                Open prescription
              </button>
              {c.patientId ? (
                <Link
                  href={`/patients/${c.patientId}/timeline`}
                  className="font-semibold text-hs-primary hover:underline"
                >
                  Patient chart →
                </Link>
              ) : null}
            </div>
          </SectionCard>
        )}
      </>
    )
  };
}
