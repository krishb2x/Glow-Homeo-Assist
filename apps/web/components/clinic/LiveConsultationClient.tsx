"use client";

// ──────────────────────────────────────────────────────────────────────────
// Imports
// ──────────────────────────────────────────────────────────────────────────
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  apiFetchJson,
  completeConsultation,
  fetchMyDay,
  getToken,
  haProxyPath,
  patchPrescription,
  createPrescription,
  recordCaseOutcome,
  updatePatient,
  type CaseOutcomeValue,
  type ConsultationDetail,
  type ConsultationLifecycle,
  type MyDayResponse,
  type PendingPriorOutcome,
  type PrescriptionDocumentPrefs,
  type WorkspaceContext,
  endConsultationVideo
} from "../../lib/doctor-api";
import { friendlyLoadError } from "../../lib/friendly-error";
import { clearLocalNoteDraft } from "../../lib/note-draft-local";
import { clearLocalRxDraft } from "../../lib/consultation-rx-draft-local";
import { prescriptionEntriesToApiItems } from "../../lib/prescription-api-items";
import {
  getSavedConsultationStep,
  saveConsultationStep,
  clearSavedConsultationStep
} from "../../lib/consultation-step-persistence";
import {
  buildPrescriptionDocumentHtml,
  openPrintWindow,
  type ClinicDocumentMeta,
  type DoctorChartExtras,
  type PrescriptionLine
} from "../../lib/prescription-documents";
import {
  getPrescriptionOutputPrefs,
  setPrescriptionOutputPrefs,
  type PrescriptionOutputPrefs
} from "../../lib/prescription-output-settings";
import { setLastCase } from "../../lib/workflow-storage";
import {
  formatDeliveryStatusMessage,
  loadFinalizeDeliveryStatus,
  saveFinalizeDeliveryStatus
} from "../../lib/finalize-delivery-status";
import { useConsultationTabLock } from "../../lib/useConsultationTabLock";
import {
  createAdviceTemplate,
  fetchAdviceTemplates,
  fetchTreatmentPlans,
  type AdviceTemplate,
  type TreatmentPlan
} from "../../lib/doctor-api";
import { PrescriptionPreviewModal } from "../consultation/PrescriptionPreviewModal";
import { ErrorState } from "../ui/LoadState";
import { SkeletonCard } from "./SkeletonCard";
import { dedupeActiveVisits } from "../../lib/operational-queue";
import {
  nextStep,
  prevStep,
  type ConsultationStep
} from "../../lib/clinical-workflow-config";
import { ConsultationVisitSwitcher } from "./workflow/ConsultationVisitSwitcher";
import { ConsultationWorkflowFooter } from "./workflow/ConsultationWorkflowFooter";
import { ConsultationClinicalShell } from "./workflow/ConsultationClinicalShell";
import { ConsultationStepPanel } from "./workflow/ConsultationStepPanel";
import { ConsultationContextPanel } from "./workflow/ConsultationContextPanel";
import { useConsultationKeyboardNav } from "./workflow/useConsultationKeyboardNav";
import { useConsultationAutosave } from "./workflow/useConsultationAutosave";
import { validateAllSteps, buildFinalizeReadiness, type ConsultationSnapshot } from "../../lib/consultation-validation";
import { buildConsultationStepExtras } from "./workflow/LiveConsultationStepExtras";
import { useConsultationWorkspaceShortcuts } from "./workflow/useConsultationWorkspaceShortcuts";
import { ScheduleFollowUpDrawer } from "./schedule/ScheduleFollowUpDrawer";
import { DailyConsultationVideo } from "./video/DailyConsultationVideo";
import type { AdviceCard } from "./workflow/steps";
import { cn } from "../../lib/cn";
import { consultationStepHref, stepFromQuery } from "../../lib/consultation-step-url";
import { bootstrapConsultationSession } from "../../lib/consultation-session-bootstrap";
import { formatSymptomsToMonitor, parseSymptomsToMonitor } from "../../lib/symptoms-monitor";

type SideDrawer = "none" | "context" | "schedule";

type TimingSlot = "morning" | "afternoon" | "evening" | "night";

/** Rich client-side prescription entry (stored as jsonb; converts to PrescriptionLine for PDFs). */
type PrescriptionEntry = {
  id: string;
  kind: "remedy" | "medicine";
  name: string;
  potency: string;
  doseCount: string;
  frequency: string;
  customFrequency: string;
  timingSlots: TimingSlot[];
  duration: string;
  instructions: string;
};

type NoteDraft = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
};

type ClinicalRecordState = {
  labs: Array<{ id: string; testName: string; result: string; notes: string }>;
  clinicalNotes: { observations: string; diagnosisThinking: string };
  history: {
    pastDiseases: string;
    medications: string;
    familyHistory: string;
    drugAllergies: string;
  };
  vitals: {
    bp: string;
    pulse: string;
    temperature: string;
    spO2: string;
  };
  adviceCards: AdviceCard[];
};

type WorkspaceBranding = {
  doctorName: string;
  clinicName: string;
  clinicLocation: string | null;
  clinicPhone: string | null;
  clinicEmail: string | null;
  qualification: string | null;
  registrationNumber: string | null;
  signatureUrl: string | null;
  signatureObjectKey: string | null;
  documentPrefs: PrescriptionDocumentPrefs;
};

// ──────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────

const FREQ_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "once", label: "Once daily" },
  { key: "twice", label: "Twice daily" },
  { key: "thrice", label: "3× daily" },
  { key: "four", label: "4× daily" },
  { key: "sos", label: "SOS" },
  { key: "alt", label: "Alternate days" },
  { key: "weekly", label: "Once weekly" },
  { key: "custom", label: "Custom" }
];

const SLOT_LABELS: Record<TimingSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night"
};

// ──────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyEntry(): PrescriptionEntry {
  return {
    id: randomId(),
    kind: "remedy",
    name: "",
    potency: "",
    doseCount: "",
    frequency: "twice",
    customFrequency: "",
    timingSlots: ["morning", "night"],
    duration: "",
    instructions: ""
  };
}

function entryToLine(e: PrescriptionEntry): PrescriptionLine {
  const freqLabel =
    e.frequency === "custom"
      ? e.customFrequency
      : (FREQ_OPTIONS.find((f) => f.key === e.frequency)?.label ?? e.frequency);
  const slots = e.timingSlots.length > 0 ? e.timingSlots.map((s) => SLOT_LABELS[s]).join(" / ") : "";
  const dosage = [e.doseCount, slots].filter(Boolean).join(" · ");
  return {
    remedyName: e.kind === "remedy" ? e.name : `${e.name} (supplement)`,
    potency: e.kind === "remedy" ? e.potency : "",
    dosage,
    frequency: freqLabel,
    duration: e.duration,
    instructions: e.instructions
  };
}

function emptyDraft(): NoteDraft {
  return { chiefComplaints: "", emotionalState: "", physicalSymptoms: "", modalities: "", timeline: "" };
}

function emptyClinical(): ClinicalRecordState {
  return {
    labs: [],
    clinicalNotes: { observations: "", diagnosisThinking: "" },
    history: { pastDiseases: "", medications: "", familyHistory: "", drugAllergies: "" },
    vitals: { bp: "", pulse: "", temperature: "", spO2: "" },
    adviceCards: []
  };
}

function mapWorkspaceBranding(w: WorkspaceContext): WorkspaceBranding {
  const prefs = w.prescriptionDocumentPrefs;
  return {
    doctorName: w.fullName,
    clinicName: w.clinicName ?? "Clinic",
    clinicLocation: w.clinicLocation ?? null,
    clinicPhone: w.clinicPhone ?? null,
    clinicEmail: w.clinicEmail ?? null,
    qualification: w.qualification ?? w.credentials ?? null,
    registrationNumber: w.registrationNumber ?? null,
    signatureUrl: w.signatureUrl ?? null,
    signatureObjectKey: w.signatureObjectKey ?? null,
    documentPrefs: {
      showClinicDetails: prefs?.showClinicDetails ?? true,
      showSignature: prefs?.showSignature ?? true,
      showRegistrationNumber: prefs?.showRegistrationNumber ?? true
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// LiveConsultationClient
// ──────────────────────────────────────────────────────────────────────────

export function LiveConsultationClient({ id }: { id: string }): JSX.Element {
  const router = useRouter();

  // Loading
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const searchParams = useSearchParams();
  const urlStepSynced = useRef(false);

  // Navigation — initial step from ?step= query or last viewed step
  const [activeStep, setActiveStep] = useState<ConsultationStep>(() => {
    const fromUrl = searchParams.get("step");
    if (fromUrl) return stepFromQuery(fromUrl);
    const saved = getSavedConsultationStep(id);
    return saved ?? "patient";
  });
  const [activeDrawer, setActiveDrawer] = useState<SideDrawer>("none");

  // Patient
  const [patientId, setPatientId] = useState("");
  const [patientCode, setPatientCode] = useState<string | null>(null);
  const [visitCode, setVisitCode] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [editingLocked, setEditingLocked] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState<ConsultationLifecycle>("ACTIVE");
  const [consultationMode, setConsultationMode] = useState<"IN_CLINIC" | "ONLINE">("IN_CLINIC");
  const [consultationRunning, setConsultationRunning] = useState(false);
  const [ctx, setCtx] = useState<{
    lastVisitAt: string | null;
    patientAge: number | null;
    patientGender: string | null;
    patientPhone: string | null;
    patientAddress: string | null;
    patientNotes: string | null;
    patientInitialComplaint: string | null;
    complexity: string;
    consultationType: string;
    startedAt: string;
  } | null>(null);
  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
    initialChiefComplaint: "",
    patientNotes: ""
  });
  const [patientEditOpen, setPatientEditOpen] = useState(false);

  // Patient safety
  const [patientAllergies, setPatientAllergies] = useState<string | null>(null);

  // Clinical data
  const [draft, setDraft] = useState<NoteDraft>(emptyDraft);
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecordState>(emptyClinical);

  // Prescription
  const [rxEntries, setRxEntries] = useState<PrescriptionEntry[]>([emptyEntry()]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prevRx, setPrevRx] = useState<PrescriptionEntry[] | null>(null);
  const [showPrevRx, setShowPrevRx] = useState(false);

  // Advice
  const [advice, setAdvice] = useState({ diet: "", lifestyle: "" });
  const [adviceTemplates, setAdviceTemplates] = useState<AdviceTemplate[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [newTemplate, setNewTemplate] = useState<{ title: string; category: AdviceTemplate["category"]; content: string } | null>(null);

  // Follow-up
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpRecommendedAt, setFollowUpRecommendedAt] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [symptomsToMonitor, setSymptomsToMonitor] = useState("");
  const [createFollowUpTask, setCreateFollowUpTask] = useState(true);
  const [skipPrescription, setSkipPrescription] = useState(false);

  // Workspace / branding
  const [workspace, setWorkspace] = useState<WorkspaceBranding | null>(null);
  const [myDay, setMyDay] = useState<MyDayResponse | null>(null);

  // Autosave guard — flip this immediately before performing an explicit save
  // so the debounced server autosave doesn't fire a redundant request.
  const suppressAutosave = useRef(false);

  // Finalize
  const [lockAfterFinalize, setLockAfterFinalize] = useState(false);
  const [sendPrescriptionWhatsApp, setSendPrescriptionWhatsApp] = useState(true);
  const [sendPrescriptionEmail, setSendPrescriptionEmail] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [pendingPriorOutcome, setPendingPriorOutcome] = useState<PendingPriorOutcome | null>(null);
  const [lastCaseOutcome, setLastCaseOutcome] = useState<ConsultationDetail["lastCaseOutcome"]>(null);
  const [priorOutcomeValue, setPriorOutcomeValue] = useState<CaseOutcomeValue | "">("");
  const [priorOutcomeAssessment, setPriorOutcomeAssessment] = useState("");
  const [priorOutcomeSaved, setPriorOutcomeSaved] = useState(false);
  const [rxOutPrefs, setRxOutPrefs] = useState<PrescriptionOutputPrefs>(getPrescriptionOutputPrefs);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("Preview");
  const [previewMode, setPreviewMode] = useState<"doctor" | "patient">("patient");
  const [deliveryStatusMessage, setDeliveryStatusMessage] = useState<string | null>(null);

  const { blocked: tabBlocked, takeOver: takeOverTab } = useConsultationTabLock(
    id ?? null,
    !sessionEnded && lifecycleStatus !== "FINALIZED"
  );

  useEffect(() => {
    if (!id) return;
    const saved = loadFinalizeDeliveryStatus(id);
    if (saved) setDeliveryStatusMessage(formatDeliveryStatusMessage(saved));
  }, [id]);

  // ── Load unified consultation session ───────────────────────────────────
  const applySession = useCallback((session: Awaited<ReturnType<typeof bootstrapConsultationSession>>) => {
    suppressAutosave.current = true;
    setPatientId(session.patientId);
    setPatientCode(session.patientCode);
    setVisitCode(session.visitCode);
    setPatientName(session.patientName);
    setSessionEnded(session.sessionEnded);
    setEditingLocked(session.editingLocked);
    setLifecycleStatus(session.lifecycleStatus ?? "ACTIVE");
    setConsultationMode(session.consultationMode);
    setConsultationRunning(session.consultationRunning);
    setPatientAllergies(session.patientAllergies);
    setCtx(session.ctx);
    setPatientForm(session.patientForm);
    setSendPrescriptionWhatsApp(session.sendPrescriptionWhatsApp);
    if (session.workspace) setWorkspace(mapWorkspaceBranding(session.workspace));
    setLastCase({
      patientId: session.patientId,
      consultationId: session.consultationId,
      patientName: session.patientName,
      visitStatus: session.sessionEnded ? "closed" : "in_progress"
    });
    setDraft(session.draft);
    setClinicalRecord(session.clinicalRecord);
    setAdvice(session.advice);
    setFollowUpRecommendedAt(session.followUpRecommendedAt);
    setFollowUpNote(session.followUpNote);
    setSymptomsToMonitor(formatSymptomsToMonitor(session.symptomsToMonitor));
    setFollowUpEnabled(session.followUpEnabled);
    if (session.prescriptionId) {
      setPrescriptionId(session.prescriptionId);
      setRxEntries(session.rxEntries);
    } else {
      setPrescriptionId(null);
      setRxEntries(session.rxEntries);
    }
    setPrevRx(session.prevRx);
    setPendingPriorOutcome(session.pendingPriorOutcome ?? null);
    setLastCaseOutcome(session.lastCaseOutcome);
    setPriorOutcomeSaved(!session.pendingPriorOutcome);
    setPriorOutcomeValue("");
    setPriorOutcomeAssessment("");
    setAdviceTemplates(session.adviceTemplates);
    setTreatmentPlans(session.treatmentPlans);
    if (session.myDay) setMyDay(session.myDay);
    if (session.consultationMode === "ONLINE") {
      setActiveDrawer("context");
    }
  }, []);

  const reload = useCallback(() => {
    void (async () => {
      if (!getToken()) return;
      setLoading(true);
      setLoadError(null);
      try {
        const session = await bootstrapConsultationSession(id);
        applySession(session);
      } catch (e) {
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, applySession]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.consultationMode = "on";
    return () => {
      delete document.documentElement.dataset.consultationMode;
    };
  }, []);

  // Operational queue — lightweight refresh while in consult (session data stays cached).
  useEffect(() => {
    if (!getToken()) return;
    const refresh = (): void => {
      void fetchMyDay(1).then(setMyDay).catch(() => {});
    };
    refresh();
    const onVis = (): void => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(refresh, 60_000);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id]);

  const activeVisits = useMemo(
    () =>
      myDay
        ? dedupeActiveVisits(
            myDay.activeConsultations?.inClinic ?? [],
            myDay.activeConsultations?.online ?? []
          )
        : [],
    [myDay]
  );

  // ── Autosave (extracted to dedicated hook) ─────────────────────────────
  const { localSave, serverSave, saveError } = useConsultationAutosave({
    consultationId: id,
    patientId,
    loading,
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote,
    symptomsToMonitor: parseSymptomsToMonitor(symptomsToMonitor),
    rxEntries,
    prescriptionId,
    onPrescriptionCreated: setPrescriptionId,
    paused: editingLocked && sessionEnded,
    suppressNext: suppressAutosave
  });

  // ── Status toast auto-clear ────────────────────────────────────────────
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(""), 3500);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const formDisabled = editingLocked && sessionEnded;

  // ── Handlers ───────────────────────────────────────────────────────────
  async function savePatient(): Promise<void> {
    if (!patientId || formDisabled) return;
    setBusy(true);
    try {
      const ageNum = patientForm.age === "" ? undefined : parseInt(patientForm.age, 10);
      if (patientForm.age !== "" && Number.isNaN(ageNum)) {
        setStatusMsg("Enter a valid age.");
        setBusy(false);
        return;
      }
      const updated = await updatePatient(patientId, {
        name: patientForm.name.trim(),
        age: ageNum,
        gender: patientForm.gender.trim() || undefined,
        phone: patientForm.phone.trim() || undefined,
        address: patientForm.address.trim() || undefined,
        initialChiefComplaint: patientForm.initialChiefComplaint.trim() || undefined,
        patientNotes: patientForm.patientNotes.trim() || undefined
      });
      setPatientName(updated.name);
      setCtx((prev) =>
        prev
          ? {
              ...prev,
              patientAge: updated.age ?? null,
              patientGender: updated.gender ?? null,
              patientPhone: updated.phone ?? null,
              patientAddress: updated.address ?? null,
              patientNotes: updated.patientNotes ?? null,
              patientInitialComplaint: updated.initialChiefComplaint ?? null
            }
          : prev
      );
      setPatientEditOpen(false);
      setStatusMsg("Patient details updated.");
    } catch (e) {
      setStatusMsg(friendlyLoadError(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePriorOutcome(): Promise<void> {
    if (!pendingPriorOutcome || !patientId || !priorOutcomeValue) return;
    await recordCaseOutcome({
      consultationId: pendingPriorOutcome.consultationId,
      patientId,
      outcome: priorOutcomeValue,
      assessment: priorOutcomeAssessment.trim() || undefined
    });
    setPriorOutcomeSaved(true);
    setPendingPriorOutcome(null);
    setStatusMsg("Outcome from the previous visit saved.");
  }

  async function finalizeConsultation(): Promise<void> {
    if (!id || !patientId) return;
    if (!finalizeReadiness.canFinalize) {
      setStatusMsg(finalizeReadiness.blockedReason ?? "Complete required sections before finalizing.");
      return;
    }
    suppressAutosave.current = true;
    setBusy(true);
    try {
      await apiFetchJson(haProxyPath(`doctor/consultations/${id}/finalize-note`), {
        method: "POST",
        body: JSON.stringify({ ...draft })
      });
      clearLocalNoteDraft(id);
      clearLocalRxDraft(id);
      const rxItems = prescriptionEntriesToApiItems(rxEntries);
      if (!skipPrescription && rxItems.length > 0) {
        if (prescriptionId) {
          await patchPrescription(prescriptionId, rxItems);
        } else {
          const pr = await createPrescription({ patientId, consultationId: id, items: rxItems });
          if (pr?.id) setPrescriptionId(pr.id);
        }
      }
      const fuIso =
        followUpEnabled && followUpRecommendedAt
          ? new Date(followUpRecommendedAt).toISOString()
          : null;
      const r = await completeConsultation(id, {
        finalize: true,
        lockEditing: lockAfterFinalize,
        followUpRecommendedAt: fuIso,
        followUpNote: followUpNote || null,
        symptomsToMonitor: parseSymptomsToMonitor(symptomsToMonitor),
        createFollowUp:
          createFollowUpTask && fuIso
            ? {
                dueAt: fuIso,
                reason: followUpNote.trim() || "Follow-up visit",
                symptomsToMonitor: parseSymptomsToMonitor(symptomsToMonitor)
              }
            : undefined,
        distribute: {
          sendEmail: sendPrescriptionEmail,
          sendWhatsApp: sendPrescriptionWhatsApp,
          notifyEmail: sendPrescriptionEmail ? notifyEmail.trim() || null : null
        }
      });
      if (r?.ok) {
        if (consultationMode === "ONLINE") {
          void endConsultationVideo(id, "consultation_finalized").catch(() => undefined);
        }
        setSessionEnded(true);
        setConsultationRunning(false);
        setLifecycleStatus("FINALIZED");
        if (lockAfterFinalize) setEditingLocked(true);
        const dist = r.distribution;
        if (dist?.pdfReady) {
          const status = {
            consultationId: id,
            finalizedAt: new Date().toISOString(),
            pdfReady: true,
            whatsapp: dist.whatsapp ?? null,
            whatsappDetail: dist.whatsappDetail ?? null,
            email: dist.email ?? null,
            emailDetail: dist.emailDetail ?? null
          };
          saveFinalizeDeliveryStatus(status);
          const msg = formatDeliveryStatusMessage(status);
          setDeliveryStatusMessage(msg);
          setStatusMsg(msg);
        } else {
          setStatusMsg("Consultation finalized.");
        }
        clearSavedConsultationStep(id);
        clearLocalRxDraft(id);
        setActiveDrawer("schedule");
        reload();
      }
    } catch (e) {
      setStatusMsg(friendlyLoadError(e));
    } finally {
      setBusy(false);
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────
  const completePrescriptionLines = useMemo(
    () => rxEntries.filter((e) => e.name.trim().length > 0).map(entryToLine),
    [rxEntries]
  );

  const consultationSnapshot: ConsultationSnapshot = useMemo(
    () => ({
      patient: {
        initialChiefComplaint: patientForm.initialChiefComplaint,
        storedChiefComplaint: ctx?.patientInitialComplaint ?? null
      },
      history: clinicalRecord.history,
      vitals: clinicalRecord.vitals,
      labs: clinicalRecord.labs.map((l) => ({ testName: l.testName, result: l.result })),
      observations: clinicalRecord.clinicalNotes.observations,
      notes: {
        chiefComplaints: draft.chiefComplaints,
        emotionalState: draft.emotionalState,
        physicalSymptoms: draft.physicalSymptoms,
        modalities: draft.modalities,
        timeline: draft.timeline
      },
      prescription: rxEntries.map((e) => ({
        name: e.name,
        potency: e.potency,
        doseCount: e.doseCount,
        duration: e.duration
      })),
      advice: {
        diet: advice.diet,
        lifestyle: advice.lifestyle,
        cards: clinicalRecord.adviceCards
      },
      followUp: {
        enabled: followUpEnabled,
        recommendedAt: followUpRecommendedAt || null
      },
      finalize: { sessionEnded, lifecycleStatus }
    }),
    [
      patientForm.initialChiefComplaint,
      ctx,
      clinicalRecord,
      draft,
      rxEntries,
      advice,
      followUpEnabled,
      followUpRecommendedAt,
      sessionEnded,
      lifecycleStatus
    ]
  );

  const stepValidations = useMemo(() => validateAllSteps(consultationSnapshot), [consultationSnapshot]);

  const finalizeReadiness = useMemo(
    () =>
      buildFinalizeReadiness({
        validations: stepValidations,
        skipPrescription,
        pendingPriorOutcome: Boolean(pendingPriorOutcome),
        priorOutcomeSaved,
        sendPrescriptionEmail,
        notifyEmail
      }),
    [
      stepValidations,
      skipPrescription,
      pendingPriorOutcome,
      priorOutcomeSaved,
      sendPrescriptionEmail,
      notifyEmail
    ]
  );

  const stepDone: Record<ConsultationStep, boolean> = useMemo(
    () => ({
      patient: stepValidations.patient.done,
      history: stepValidations.history.done,
      examination: stepValidations.examination.done,
      notes: stepValidations.notes.done,
      ai: stepValidations.ai.done,
      prescription: stepValidations.prescription.done,
      advice: stepValidations.advice.done,
      followup: stepValidations.followup.done,
      finalize: stepValidations.finalize.done
    }),
    [stepValidations]
  );


  const autosaveLabel =
    serverSave === "error"
      ? saveError ?? "Sync failed"
      : serverSave === "saving"
        ? "Syncing…"
        : serverSave === "saved"
          ? "Synced"
          : localSave === "saved"
            ? "Draft saved locally"
            : "";

  const selectStep = useCallback(
    (step: ConsultationStep) => {
      const normalized = step === "ai" ? "notes" : step;
      setActiveStep(normalized);
      saveConsultationStep(id, normalized);
      const href = consultationStepHref(id, normalized);
      if (typeof window !== "undefined" && window.location.pathname + window.location.search !== href) {
        router.replace(href, { scroll: false });
      }
    },
    [id, router]
  );

  // Sync step when user navigates with browser back/forward
  useEffect(() => {
    const fromUrl = stepFromQuery(searchParams.get("step"));
    setActiveStep((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  // After first load, ensure URL reflects the active step (bookmarkable)
  useEffect(() => {
    if (loading || loadError || urlStepSynced.current) return;
    urlStepSynced.current = true;
    if (!searchParams.get("step")) {
      router.replace(consultationStepHref(id, activeStep), { scroll: false });
    }
  }, [loading, loadError, searchParams, id, activeStep, router]);

  const goNextStep = useCallback(() => {
    const n = nextStep(activeStep);
    if (n) selectStep(n);
  }, [activeStep, selectStep]);

  const goPrevStep = useCallback(() => {
    const p = prevStep(activeStep);
    if (p) selectStep(p);
  }, [activeStep, selectStep]);

  useConsultationKeyboardNav(goPrevStep, goNextStep, !loading && !loadError && !sessionEnded);

  useConsultationWorkspaceShortcuts({
    enabled: !loading && !loadError,
    onFinalize: () => {
      if (!sessionEnded && activeStep === "finalize" && finalizeReadiness.canFinalize) {
        void finalizeConsultation();
      }
    }
  });

  const applyAdviceTemplate = useCallback((t: AdviceTemplate) => {
    if (t.category === "diet" || t.category === "restriction") {
      setAdvice((prev) => ({
        ...prev,
        diet: prev.diet ? `${prev.diet}\n\n${t.content}` : t.content
      }));
    } else {
      setAdvice((prev) => ({
        ...prev,
        lifestyle: prev.lifestyle ? `${prev.lifestyle}\n\n${t.content}` : t.content
      }));
    }
  }, []);

  const applyTreatmentPlan = useCallback((plan: TreatmentPlan) => {
    setAdvice((prev) => {
      const parts: { diet: string; lifestyle: string } = { diet: prev.diet, lifestyle: prev.lifestyle };
      if (plan.dietAdvice || plan.restrictionAdvice) {
        const combined = [plan.dietAdvice, plan.restrictionAdvice].filter(Boolean).join("\n\n");
        parts.diet = prev.diet ? `${prev.diet}\n\n${combined}` : combined;
      }
      if (plan.lifestyleAdvice) {
        parts.lifestyle = prev.lifestyle ? `${prev.lifestyle}\n\n${plan.lifestyleAdvice}` : plan.lifestyleAdvice;
      }
      return parts;
    });
    setStatusMsg(`Treatment plan "${plan.title}" applied.`);
  }, []);

  const saveNewAdviceTemplate = useCallback(() => {
    if (!newTemplate?.title.trim() || !newTemplate.content.trim()) return;
    void createAdviceTemplate({
      title: newTemplate.title.trim(),
      category: newTemplate.category,
      content: newTemplate.content.trim()
    })
      .then(() => fetchAdviceTemplates().then((t) => setAdviceTemplates(t)).catch(() => {}))
      .catch(() => {});
    setNewTemplate(null);
  }, [newTemplate]);

  const adviceCards = useMemo((): AdviceCard[] => {
    if (clinicalRecord.adviceCards.length > 0) return clinicalRecord.adviceCards;
    const cards: AdviceCard[] = [];
    if (advice.diet.trim()) {
      cards.push({ id: "diet-legacy", category: "diet", title: "Diet & restrictions", detail: advice.diet });
    }
    if (advice.lifestyle.trim()) {
      cards.push({ id: "lifestyle-legacy", category: "lifestyle", title: "Lifestyle", detail: advice.lifestyle });
    }
    return cards;
  }, [clinicalRecord.adviceCards, advice]);

  const onAdviceCardsChange = useCallback((cards: AdviceCard[]) => {
    setClinicalRecord((p) => ({ ...p, adviceCards: cards }));
    setAdvice({
      diet: cards
        .filter((x) => x.category === "diet" || x.category === "restriction")
        .map((x) => [x.title, x.detail].filter(Boolean).join(": "))
        .join("\n\n"),
      lifestyle: cards
        .filter((x) => x.category === "lifestyle")
        .map((x) => [x.title, x.detail].filter(Boolean).join(": "))
        .join("\n\n")
    });
  }, []);

  const patientSnapshot = useMemo(
    () => ({
      name: patientName || "Patient",
      patientCode,
      age: ctx?.patientAge ?? null,
      gender: ctx?.patientGender ?? null,
      phone: ctx?.patientPhone ?? null,
      allergies: patientAllergies,
      visitType: (ctx?.consultationType === "INITIAL" ? "INITIAL" : "FOLLOW_UP") as "INITIAL" | "FOLLOW_UP",
      lastVisitAt: ctx?.lastVisitAt ?? null,
      chiefComplaint: ctx?.patientInitialComplaint ?? null
    }),
    [patientName, patientCode, ctx, patientAllergies]
  );

  const patientStepValue = useMemo(
    () => ({
      chiefComplaint: patientForm.initialChiefComplaint || ctx?.patientInitialComplaint || ""
    }),
    [patientForm.initialChiefComplaint, ctx?.patientInitialComplaint]
  );

  const historyStepValue = useMemo(
    () => ({
      pastDiseases: clinicalRecord.history.pastDiseases,
      medications: clinicalRecord.history.medications,
      familyHistory: clinicalRecord.history.familyHistory,
      drugAllergies:
        clinicalRecord.history.drugAllergies.trim().length > 0
          ? clinicalRecord.history.drugAllergies
          : patientAllergies ?? ""
    }),
    [clinicalRecord.history, patientAllergies]
  );

  const examinationStepValue = useMemo(
    () => ({
      labs: clinicalRecord.labs,
      bp: clinicalRecord.vitals.bp,
      pulse: clinicalRecord.vitals.pulse,
      temperature: clinicalRecord.vitals.temperature,
      spO2: clinicalRecord.vitals.spO2,
      general: clinicalRecord.clinicalNotes.observations
    }),
    [clinicalRecord]
  );

  const notesStepValue = useMemo(
    () => ({
      chiefComplaints: draft.chiefComplaints,
      emotionalState: draft.emotionalState,
      physicalSymptoms: draft.physicalSymptoms,
      modalities: draft.modalities,
      timeline: draft.timeline,
      observations: clinicalRecord.clinicalNotes.observations,
      diagnosisThinking: clinicalRecord.clinicalNotes.diagnosisThinking
    }),
    [draft, clinicalRecord.clinicalNotes]
  );

  const followUpStepValue = useMemo(
    () => ({
      enabled: followUpEnabled,
      recommendedAt: followUpRecommendedAt,
      reason: followUpNote,
      symptomsToMonitor
    }),
    [followUpEnabled, followUpRecommendedAt, followUpNote, symptomsToMonitor]
  );

  const finalizeItems = useMemo(
    () =>
      (
        [
          { id: "patient", label: "Chief complaint", step: "patient" as ConsultationStep, required: true },
          { id: "history", label: "History captured", step: "history" as ConsultationStep, required: false },
          { id: "examination", label: "Examination notes", step: "examination" as ConsultationStep, required: false },
          { id: "notes", label: "Clinical assessment", step: "notes" as ConsultationStep, required: true },
          {
            id: "prescription",
            label: skipPrescription ? "Prescription (skipped)" : "Prescription",
            step: "prescription" as ConsultationStep,
            required: !skipPrescription
          },
          { id: "advice", label: "Advice for patient", step: "advice" as ConsultationStep, required: false }
        ] as const
      ).map(({ id, label, step, required }) => {
        const done = stepDone[step];
        const skipped = id === "prescription" && skipPrescription;
        return {
          id,
          label,
          step,
          status: skipped || done ? ("done" as const) : required ? ("missing" as const) : ("warn" as const),
          hint:
            skipped
              ? "No medicines prescribed this visit"
              : done
                ? undefined
                : required
                  ? "Required before finalizing"
                  : "Recommended — optional"
        };
      }),
    [stepDone, skipPrescription]
  );

  const stepExtras = useMemo(
    () =>
      buildConsultationStepExtras({
        formDisabled,
        busy,
        patientId,
        patientName,
        patientAllergies,
        sessionEnded,
        consultationRunning,
        workspace,
        ctx,
        lastCaseOutcome: lastCaseOutcome ?? null,
        patientForm,
        patientEditOpen,
        setPatientEditOpen,
        setPatientForm,
        savePatient,
        pendingPriorOutcome,
        priorOutcomeSaved,
        priorOutcomeValue,
        priorOutcomeAssessment,
        setPriorOutcomeValue,
        setPriorOutcomeAssessment,
        savePriorOutcome,
        prevRx,
        showPrevRx,
        setShowPrevRx,
        setRxEntries,
        setStatusMsg,
        advice,
        setAdvice,
        adviceTemplates,
        treatmentPlans,
        templateSearch,
        setTemplateSearch,
        newTemplate,
        setNewTemplate,
        applyAdviceTemplate,
        applyTreatmentPlan,
        saveNewAdviceTemplate,
        followUpEnabled,
        createFollowUpTask,
        setCreateFollowUpTask,
        lockAfterFinalize,
        setLockAfterFinalize,
        sendPrescriptionWhatsApp,
        setSendPrescriptionWhatsApp,
        sendPrescriptionEmail,
        setSendPrescriptionEmail,
        notifyEmail,
        setNotifyEmail,
        patientHasPhone: Boolean(ctx?.patientPhone?.trim()),
        skipPrescription,
        setSkipPrescription,
        hasPrescriptionLines: completePrescriptionLines.length > 0,
        finalizeReadiness,
        finalizeConsultation,
        deliveryStatusMessage,
        rxOutPrefs,
        setRxOutPrefs: (prefs) => setRxOutPrefs(setPrescriptionOutputPrefs(prefs)),
        openPreview
      }),
    // We deliberately exclude function expressions (`savePatient`, `finalizeConsultation`,
    // `openPreview`, `savePriorOutcome`) because they are re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      formDisabled,
      busy,
      patientId,
      patientName,
      patientAllergies,
      sessionEnded,
      consultationRunning,
      workspace,
      ctx,
      lastCaseOutcome,
      patientForm,
      patientEditOpen,
      pendingPriorOutcome,
      priorOutcomeSaved,
      priorOutcomeValue,
      priorOutcomeAssessment,
      selectStep,
      prevRx,
      showPrevRx,
      advice,
      adviceTemplates,
      treatmentPlans,
      templateSearch,
      newTemplate,
      applyAdviceTemplate,
      applyTreatmentPlan,
      saveNewAdviceTemplate,
      followUpEnabled,
      createFollowUpTask,
      lockAfterFinalize,
      sendPrescriptionWhatsApp,
      sendPrescriptionEmail,
      notifyEmail,
      skipPrescription,
      finalizeReadiness,
      completePrescriptionLines.length,
      rxOutPrefs
    ]
  );

  const onHistoryStepChange = useCallback(
    (v: typeof historyStepValue) => {
      setClinicalRecord((p) => ({
        ...p,
        history: {
          pastDiseases: v.pastDiseases,
          medications: v.medications,
          familyHistory: v.familyHistory,
          drugAllergies: v.drugAllergies
        }
      }));
    },
    []
  );

  const onExaminationStepChange = useCallback(
    (v: typeof examinationStepValue) => {
      setClinicalRecord((p) => ({
        ...p,
        labs: v.labs,
        vitals: { bp: v.bp, pulse: v.pulse, temperature: v.temperature, spO2: v.spO2 },
        clinicalNotes: { ...p.clinicalNotes, observations: v.general }
      }));
    },
    []
  );

  const onNotesStepChange = useCallback(
    (v: typeof notesStepValue) => {
      setDraft({
        chiefComplaints: v.chiefComplaints,
        emotionalState: v.emotionalState,
        physicalSymptoms: v.physicalSymptoms,
        modalities: v.modalities,
        timeline: v.timeline
      });
      setClinicalRecord((p) => ({
        ...p,
        clinicalNotes: { observations: v.observations, diagnosisThinking: v.diagnosisThinking }
      }));
    },
    []
  );

  const onPatientStepChange = useCallback(
    (v: typeof patientStepValue) => {
      setPatientForm((p) => ({ ...p, initialChiefComplaint: v.chiefComplaint }));
    },
    []
  );

  const onFollowUpStepChange = useCallback(
    (v: typeof followUpStepValue) => {
      setFollowUpEnabled(v.enabled);
      setFollowUpRecommendedAt(v.recommendedAt);
      setFollowUpNote(v.reason);
      setSymptomsToMonitor(v.symptomsToMonitor);
    },
    []
  );

  // ── Document helpers ───────────────────────────────────────────────────
  function docMeta(): ClinicDocumentMeta {
    const started = ctx?.startedAt ? new Date(ctx.startedAt) : new Date();
    const dn = workspace?.doctorName?.trim() || "Doctor";
    return {
      clinicName: workspace?.clinicName ?? "Clinic",
      clinicAddressLine: workspace?.clinicLocation ?? null,
      clinicPhone: workspace?.clinicPhone ?? null,
      clinicEmail: workspace?.clinicEmail ?? null,
      doctorName: dn,
      qualification: workspace?.qualification ?? null,
      registrationNumber: workspace?.registrationNumber ?? null,
      consultationId: id,
      visitDateLabel: started.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
      consultationModeLabel: consultationMode === "ONLINE" ? "Online" : "In-Clinic",
      patientName: patientName || "Patient",
      patientAge: ctx?.patientAge ?? null,
      patientGender: ctx?.patientGender ?? null,
      patientCode: patientCode ?? null,
      visitCode: visitCode ?? null,
      followUpNote: followUpEnabled ? followUpNote : null,
      symptomsToMonitor: parseSymptomsToMonitor(symptomsToMonitor),
      doctorSignatureLine: dn.toLowerCase().startsWith("dr.") ? dn : `Dr. ${dn}`,
      followUpDateLabel:
        followUpEnabled && followUpRecommendedAt
          ? new Date(followUpRecommendedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric"
            })
          : null,
      signatureImageUrl: workspace?.signatureUrl ?? null,
      documentPrefs: workspace?.documentPrefs ?? {
        showClinicDetails: true,
        showSignature: true,
        showRegistrationNumber: true
      }
    };
  }

  function buildDocOptions(mode: "doctor" | "patient") {
    const extras: DoctorChartExtras = {
      labs: clinicalRecord.labs.map((l) => ({
        testName: l.testName,
        result: l.result,
        notes: l.notes
      })),
      history: clinicalRecord.history,
      clinicalNotes: clinicalRecord.clinicalNotes
    };
    return {
      meta: docMeta(),
      notes: { ...draft },
      advice,
      lines: completePrescriptionLines,
      mode,
      patientPrefs: mode === "patient" ? rxOutPrefs : { showSymptoms: true, showNotes: true, showInstructions: true },
      doctorExtras: mode === "doctor" ? extras : undefined
    };
  }

  function openPreview(mode: "doctor" | "patient"): void {
    setPreviewMode(mode);
    setPreviewTitle(mode === "doctor" ? "Clinical summary" : "Patient prescription");
    setPreviewHtml(buildPrescriptionDocumentHtml(buildDocOptions(mode)));
    setPreviewOpen(true);
  }

  function handlePrintPrescription(mode: "doctor" | "patient"): void {
    openPrintWindow(
      buildPrescriptionDocumentHtml(buildDocOptions(mode)),
      mode === "doctor" ? "Clinical summary" : "Patient prescription"
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4" aria-busy="true">
        <SkeletonCard className="h-14" />
        <SkeletonCard className="h-[70vh]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <ErrorState err={loadError} title="Could not open this consultation" onRetry={reload} />
        <Link
          href="/consultation"
          className="text-body-sm font-semibold text-hs-primary hover:underline"
        >
          ← Back to start consultation
        </Link>
      </div>
    );
  }

  if (tabBlocked) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
        <h1 className="font-heading text-lg font-semibold text-hs-ink">This visit is open elsewhere</h1>
        <p className="text-body-sm text-hs-text-secondary">
          To protect autosave and avoid conflicting edits, only one browser tab should chart this
          consultation at a time.
        </p>
        <button
          type="button"
          onClick={takeOverTab}
          className="rounded-full bg-hs-primary px-5 py-2.5 text-body-sm font-semibold text-white"
        >
          Continue in this tab
        </button>
      </div>
    );
  }

  const normalizedStep = activeStep === "ai" ? "notes" : activeStep;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ConsultationClinicalShell
        activeStep={activeStep}
        stepDone={stepDone}
        onSelectStep={selectStep}
        patientLine={
          patientId ? (
            <>
              <span className="truncate text-[0.9375rem] font-semibold text-neutral-900">
                {patientName || patientForm.name || "Patient"}
              </span>
              <span className="text-[0.75rem] text-neutral-500">
                {[
                  ctx?.patientAge != null
                    ? `${ctx.patientAge} yrs`
                    : patientForm.age
                      ? `${patientForm.age} yrs`
                      : null,
                  ctx?.patientGender ?? patientForm.gender ?? null,
                  consultationMode === "ONLINE" ? "Online" : "In-clinic",
                  ctx?.consultationType === "FOLLOW_UP" ? "Follow-up" : ctx ? "Initial" : null
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {(patientForm.initialChiefComplaint || ctx?.patientInitialComplaint)?.trim() ? (
                <span className="hidden max-w-[16rem] truncate text-[0.75rem] text-neutral-400 xl:inline">
                  {(patientForm.initialChiefComplaint || ctx?.patientInitialComplaint)?.trim()}
                </span>
              ) : null}
              {(patientCode || visitCode) && (
                <span className="font-mono text-[0.6875rem] font-medium text-hs-primary/90">
                  {[patientCode, visitCode].filter(Boolean).join(" · ")}
                </span>
              )}
              {(ctx?.patientPhone ?? patientForm.phone)?.trim() ? (
                <a
                  href={`tel:${(ctx?.patientPhone ?? patientForm.phone)!.replace(/\s/g, "")}`}
                  className="hidden text-[0.75rem] font-medium text-hs-primary hover:underline lg:inline"
                >
                  {(ctx?.patientPhone ?? patientForm.phone)!.trim()}
                </a>
              ) : null}
              <ConsultationVisitSwitcher visits={activeVisits} currentConsultationId={id} />
            </>
          ) : loading ? (
            <span className="text-[0.8125rem] text-neutral-400">Loading visit…</span>
          ) : (
            <span className="text-[0.8125rem] text-neutral-400">Patient unavailable</span>
          )
        }
        safetyBadge={
          patientAllergies?.trim() ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50/90 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-900 ring-1 ring-amber-200/50">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              {patientAllergies.length > 48 ? `${patientAllergies.slice(0, 48)}…` : patientAllergies}
            </span>
          ) : null
        }
        autosave={serverSave}
        autosaveLabel={autosaveLabel || undefined}
        contextOpen={activeDrawer === "context"}
        scheduleDrawerOpen={activeDrawer === "schedule"}
        onToggleContext={() =>
          setActiveDrawer((d) => (d === "context" ? "none" : "context"))
        }
        onCloseDrawer={() => setActiveDrawer("none")}
        stepPanel={
          <ConsultationStepPanel
            activeStep={activeStep}
            readOnly={formDisabled}
            validation={stepValidations[normalizedStep]}
            extra={stepExtras?.[normalizedStep]}
            patient={patientSnapshot}
            patientStep={patientStepValue}
            onPatientStepChange={onPatientStepChange}
            historyStep={historyStepValue}
            onHistoryStepChange={onHistoryStepChange}
            examinationStep={examinationStepValue}
            onExaminationStepChange={onExaminationStepChange}
            notesStep={notesStepValue}
            onNotesStepChange={onNotesStepChange}
            prescriptionEntries={rxEntries}
            onPrescriptionChange={setRxEntries}
            adviceCards={adviceCards}
            onAdviceChange={onAdviceCardsChange}
            followUpStep={followUpStepValue}
            onFollowUpChange={onFollowUpStepChange}
            finalizeItems={finalizeItems}
            alreadyFinalized={sessionEnded && lifecycleStatus === "FINALIZED"}
            finalizeBlockedReason={finalizeReadiness.blockedReason ?? undefined}
            onFinalizeGoToStep={selectStep}
            chartNotes={ctx?.patientNotes ?? patientForm.patientNotes ?? null}
          />
        }
        footer={
          <ConsultationWorkflowFooter
            activeStep={activeStep}
            onPrev={goPrevStep}
            onNext={goNextStep}
            disableNext={formDisabled}
            disablePrev={formDisabled}
            sessionEnded={sessionEnded}
            nextLabel={activeStep === "followup" ? "Review & complete visit" : undefined}
          />
        }
        contextDrawer={
          patientId ? (
            <ConsultationContextPanel
              mode={consultationMode}
              patientId={patientId}
              consultationId={id}
              videoInRail={consultationMode === "ONLINE"}
            />
          ) : null
        }
        scheduleDrawer={
          <ScheduleFollowUpDrawer
            open
            embedded
            onClose={() => setActiveDrawer("none")}
            value={followUpStepValue}
            onChange={onFollowUpStepChange}
            createTaskOnFinalize={createFollowUpTask}
            onCreateTaskChange={setCreateFollowUpTask}
            readOnly={formDisabled}
          />
        }
        videoRail={
          consultationMode === "ONLINE" && patientId ? (
            <DailyConsultationVideo consultationId={id} compact />
          ) : undefined
        }
      />

      <PrescriptionPreviewModal
        open={previewOpen}
        title={previewTitle}
        html={previewHtml}
        onClose={() => setPreviewOpen(false)}
        onPrint={() => handlePrintPrescription(previewMode)}
      />

      {statusMsg ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4"
          role="status"
          aria-live="polite"
        >
          <p
            className={cn(
              "rounded-xl border px-4 py-2.5 text-caption-sm font-medium shadow-ds-md",
              /failed|error|invalid|could not/i.test(statusMsg)
                ? "border-rose-300/70 bg-rose-50 text-rose-900"
                : /finalized|sent|saved/i.test(statusMsg)
                  ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                  : "border-hs-border/60 bg-hs-paper text-hs-ink"
            )}
          >
            {statusMsg}
          </p>
        </div>
      ) : null}
    </div>
  );
}
