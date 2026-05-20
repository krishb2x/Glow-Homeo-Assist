"use client";

// ──────────────────────────────────────────────────────────────────────────
// Imports
// ──────────────────────────────────────────────────────────────────────────
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  Pause,
  Play,
  Square
} from "lucide-react";
import {
  apiFetchJson,
  completeConsultation,
  fetchConsultation,
  fetchWorkspaceContext,
  getToken,
  haProxyPath,
  patchConsultation,
  patchPrescription,
  recordCaseOutcome,
  updatePatient,
  type CaseOutcomeValue,
  type ConsultationDetail,
  type ConsultationLifecycle,
  type PendingPriorOutcome,
  type PrescriptionDocumentPrefs,
  type WorkspaceContext
} from "../../lib/doctor-api";
import { friendlyLoadError } from "../../lib/friendly-error";
import { clearLocalNoteDraft, loadLocalNoteDraft, saveLocalNoteDraft } from "../../lib/note-draft-local";
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
  createAdviceTemplate,
  fetchAdviceTemplates,
  fetchPatientTimeline,
  fetchTreatmentPlans,
  type AdviceTemplate,
  type TreatmentPlan
} from "../../lib/doctor-api";
import { PrescriptionPreviewModal } from "../consultation/PrescriptionPreviewModal";
import { ErrorState } from "../ui/LoadState";
import { SkeletonCard } from "./SkeletonCard";
import { formatRecordingTime, useConsultationLiveAudio, type NoteShape } from "./useConsultationLiveAudio";
import {
  nextStep,
  prevStep,
  type ConsultationStep
} from "../../lib/clinical-workflow-config";
import { ConsultationPatientBar } from "./workflow/ConsultationPatientBar";
import { ConsultationWorkflowFooter } from "./workflow/ConsultationWorkflowFooter";
import { useConsultationKeyboardNav } from "./workflow/useConsultationKeyboardNav";
import {
  ConsultationContinuousFeed,
  scrollFeedToWorkflowStep
} from "./workflow/ConsultationContinuousFeed";
import { buildConsultationStepExtras } from "./workflow/LiveConsultationStepExtras";
import {
  ConsultationWorkspaceShell,
  type WorkspaceDrawer
} from "./workflow/ConsultationWorkspaceShell";
import { useConsultationWorkspaceShortcuts } from "./workflow/useConsultationWorkspaceShortcuts";
import { AICopilotDrawer } from "./scribe/AICopilotDrawer";
import { ScheduleFollowUpDrawer } from "./schedule/ScheduleFollowUpDrawer";
import type { AdviceCard, AIStepStatus } from "./workflow/steps";
import { cn } from "../../lib/cn";

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
  aiNotetakerEnabled: boolean;
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

function parseDifferentialHints(text: string): string[] {
  if (!text.trim()) return [];
  const parts = text
    .split(/[,;\n]|(?:\s+vs\.?\s+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  return [...new Set(parts)].slice(0, 8);
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

function normalizeEntries(raw: unknown): PrescriptionEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyEntry()];
  const out: PrescriptionEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (o.kind === "remedy" || o.kind === "medicine") {
      out.push({
        id: String(o.id ?? randomId()),
        kind: o.kind,
        name: String(o.name ?? ""),
        potency: String(o.potency ?? ""),
        doseCount: String(o.doseCount ?? ""),
        frequency: String(o.frequency ?? "twice"),
        customFrequency: String(o.customFrequency ?? ""),
        timingSlots: Array.isArray(o.timingSlots) ? (o.timingSlots as TimingSlot[]) : [],
        duration: String(o.duration ?? ""),
        instructions: String(o.instructions ?? "")
      });
    } else if (typeof o.remedyName === "string") {
      out.push({
        id: randomId(),
        kind: "remedy",
        name: o.remedyName,
        potency: String(o.potency ?? ""),
        doseCount: String(o.dosage ?? "").split(/\s+[—–-]\s+/u)[0] ?? "",
        frequency: String(o.frequency ?? "twice"),
        customFrequency: "",
        timingSlots: [],
        duration: String(o.duration ?? ""),
        instructions: String(o.instructions ?? "")
      });
    }
  }
  return out.length > 0 ? out : [emptyEntry()];
}

function emptyDraft(): NoteDraft {
  return { chiefComplaints: "", emotionalState: "", physicalSymptoms: "", modalities: "", timeline: "" };
}

function mergeDraft(raw: unknown): NoteDraft {
  if (!raw || typeof raw !== "object") return emptyDraft();
  const o = raw as Record<string, unknown>;
  return {
    chiefComplaints: typeof o.chiefComplaints === "string" ? o.chiefComplaints : "",
    emotionalState: typeof o.emotionalState === "string" ? o.emotionalState : "",
    physicalSymptoms: typeof o.physicalSymptoms === "string" ? o.physicalSymptoms : "",
    modalities: typeof o.modalities === "string" ? o.modalities : "",
    timeline: typeof o.timeline === "string" ? o.timeline : ""
  };
}

function emptyClinical(): ClinicalRecordState {
  return {
    labs: [],
    clinicalNotes: { observations: "", diagnosisThinking: "" },
    history: { pastDiseases: "", medications: "", familyHistory: "", drugAllergies: "" }
  };
}

function mergeClinical(raw: unknown): ClinicalRecordState {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const labsRaw = d.labs;
  const labs = Array.isArray(labsRaw)
    ? labsRaw.map((x) => {
        if (!x || typeof x !== "object") return { id: randomId(), testName: "", result: "", notes: "" };
        const l = x as Record<string, unknown>;
        return {
          id: typeof l.id === "string" ? l.id : randomId(),
          testName: String(l.testName ?? ""),
          result: String(l.result ?? ""),
          notes: String(l.notes ?? "")
        };
      })
    : [];
  const cn = d.clinicalNotes && typeof d.clinicalNotes === "object" ? (d.clinicalNotes as Record<string, unknown>) : {};
  const hist = d.history && typeof d.history === "object" ? (d.history as Record<string, unknown>) : {};
  return {
    labs,
    clinicalNotes: { observations: String(cn.observations ?? ""), diagnosisThinking: String(cn.diagnosisThinking ?? "") },
    history: {
      pastDiseases: String(hist.pastDiseases ?? ""),
      medications: String(hist.medications ?? ""),
      familyHistory: String(hist.familyHistory ?? ""),
      drugAllergies: String(hist.drugAllergies ?? "")
    }
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
    },
    aiNotetakerEnabled: w.features?.aiNotetaker ?? false
  };
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  // Navigation
  const [activeStep, setActiveStep] = useState<ConsultationStep>("patient");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<WorkspaceDrawer>("none");

  // Patient
  const [patientId, setPatientId] = useState("");
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
  const feedRef = useRef<HTMLDivElement>(null);

  // Patient safety
  const [patientAllergies, setPatientAllergies] = useState<string | null>(null);

  // Clinical data
  const [draft, setDraft] = useState<NoteDraft>(emptyDraft);
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecordState>(emptyClinical);

  // Prescription
  const [rxEntries, setRxEntries] = useState<PrescriptionEntry[]>([emptyEntry()]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prevRx, setPrevRx] = useState<PrescriptionEntry[] | null>(null);
  const [prevRxLoaded, setPrevRxLoaded] = useState(false);
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
  const [createFollowUpTask, setCreateFollowUpTask] = useState(true);

  // Workspace / branding
  const [workspace, setWorkspace] = useState<WorkspaceBranding | null>(null);

  // Autosave
  const [localSave, setLocalSave] = useState<"idle" | "saving" | "saved">("idle");
  const [serverSave, setServerSave] = useState<"idle" | "saving" | "saved">("idle");
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

  // AI Notetaker state — kept separate from doctor's `draft` to prevent auto-overwrite
  const [transcriptInput, setTranscriptInput] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState<NoteDraft & { needsReview: boolean; generatedAt: string | null }>({
    chiefComplaints: "",
    emotionalState: "",
    physicalSymptoms: "",
    modalities: "",
    timeline: "",
    needsReview: false,
    generatedAt: null
  });
  const [aiDraftGenerated, setAiDraftGenerated] = useState(false);

  // ── Audio hook ─────────────────────────────────────────────────────────
  // WebSocket noteDraft events â†’ populate aiDraft (NOT the doctor's draft)
  const onLiveNoteDraft = useCallback((d: NoteShape) => {
    setAiDraft((prev) => ({
      chiefComplaints: d.chiefComplaints || prev.chiefComplaints,
      emotionalState: d.emotionalState || prev.emotionalState,
      physicalSymptoms: d.physicalSymptoms || prev.physicalSymptoms,
      modalities: d.modalities ?? prev.modalities,
      timeline: d.timeline || prev.timeline,
      needsReview: d.needsReview,
      generatedAt: prev.generatedAt
    }));
    // Mark as generated if there's real content
    if (d.chiefComplaints || d.physicalSymptoms || d.emotionalState) {
      setAiDraftGenerated(true);
    }
  }, []);

  const liveAudio = useConsultationLiveAudio(id, {
    sessionOpen: consultationRunning,
    onTranscript: setTranscriptInput,
    onNoteDraft: onLiveNoteDraft
  });

  // ── Load ───────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    void (async () => {
      if (!getToken()) return;
      setLoading(true);
      setLoadError(null);
      try {
        const [c, w] = await Promise.all([
          fetchConsultation(id),
          fetchWorkspaceContext().catch(() => null)
        ]);
        suppressAutosave.current = true;
        const cd = c as ConsultationDetail & Record<string, unknown>;
        setPatientId(cd.patientId);
        setPatientName(cd.patientName);
        setSessionEnded(Boolean(cd.endedAt));
        setEditingLocked(Boolean(cd.editingLocked));
        setLifecycleStatus((cd.lifecycleStatus as ConsultationLifecycle) ?? "ACTIVE");
        setConsultationMode((cd.consultationMode as "IN_CLINIC" | "ONLINE") ?? "IN_CLINIC");
        setConsultationRunning(!cd.endedAt);
        setPatientAllergies((cd.patientAllergies as string | null | undefined) ?? null);
        const patNotes = cd.patientNotes as string | null | undefined;
        setCtx({
          lastVisitAt: cd.lastVisitAt ?? null,
          patientAge: cd.patientAge ?? null,
          patientGender: cd.patientGender ?? null,
          patientPhone: cd.patientPhone ?? null,
          patientAddress: cd.patientAddress ?? null,
          patientNotes: patNotes ?? null,
          patientInitialComplaint: cd.patientInitialComplaint ?? null,
          complexity: cd.complexity ?? "STANDARD",
          consultationType: cd.type ?? "INITIAL",
          startedAt: cd.startedAt
        });
        setPatientForm({
          name: cd.patientName,
          age: cd.patientAge != null ? String(cd.patientAge) : "",
          gender: cd.patientGender ?? "",
          phone: cd.patientPhone ?? "",
          address: cd.patientAddress ?? "",
          initialChiefComplaint: cd.patientInitialComplaint ?? "",
          patientNotes: patNotes ?? ""
        });
        setSendPrescriptionWhatsApp(Boolean(cd.patientPhone?.trim()));
        if (w) setWorkspace(mapWorkspaceBranding(w));
        setLastCase({
          patientId: cd.patientId,
          consultationId: id,
          patientName: cd.patientName,
          visitStatus: cd.endedAt ? "closed" : "in_progress"
        });
        if (cd.transcriptText) setTranscriptInput(String(cd.transcriptText));
        let d = mergeDraft(cd.noteDraft);
        const local = loadLocalNoteDraft(id);
        if (local) {
          const pick = (server: string, loc: string) => (loc.trim().length > server.trim().length ? loc : server);
          d = {
            chiefComplaints: pick(d.chiefComplaints, local.chiefComplaints),
            emotionalState: pick(d.emotionalState, local.emotionalState),
            physicalSymptoms: pick(d.physicalSymptoms, local.physicalSymptoms),
            modalities: pick(d.modalities, local.modalities),
            timeline: pick(d.timeline, local.timeline)
          };
        }
        setDraft(d);
        setClinicalRecord(mergeClinical(cd.clinicalRecord));
        const adv = cd.advice as Record<string, unknown> | null | undefined;
        setAdvice({ diet: String(adv?.diet ?? ""), lifestyle: String(adv?.lifestyle ?? "") });
        const fuAt = cd.followUpRecommendedAt as string | null | undefined;
        const fuNote = cd.followUpNote as string | null | undefined;
        setFollowUpRecommendedAt(toDatetimeLocalValue(fuAt));
        setFollowUpNote(fuNote ?? "");
        setFollowUpEnabled(Boolean(fuAt));
        if (cd.prescription?.items) {
          setPrescriptionId(cd.prescription.id);
          setRxEntries(normalizeEntries(cd.prescription.items));
        }
        setPendingPriorOutcome(cd.pendingPriorOutcome ?? null);
        setLastCaseOutcome(cd.lastCaseOutcome ?? null);
        setPriorOutcomeSaved(!cd.pendingPriorOutcome);
        setPriorOutcomeValue("");
        setPriorOutcomeAssessment("");
      } catch (e) {
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    reload();
    void Promise.all([
      fetchAdviceTemplates().catch(() => [] as AdviceTemplate[]),
      fetchTreatmentPlans().catch(() => [] as TreatmentPlan[])
    ]).then(([templates, plans]) => {
      setAdviceTemplates(templates);
      setTreatmentPlans(plans);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.consultationMode = "on";
    return () => {
      delete document.documentElement.dataset.consultationMode;
    };
  }, []);

  // ── Autosave ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !id) return;
    setLocalSave("saving");
    const t = setTimeout(() => {
      saveLocalNoteDraft(id, {
        chiefComplaints: draft.chiefComplaints,
        emotionalState: draft.emotionalState,
        physicalSymptoms: draft.physicalSymptoms,
        modalities: draft.modalities,
        timeline: draft.timeline
      });
      setLocalSave("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [draft, loading, id]);

  useEffect(() => {
    if (loading || !id || !getToken()) return;
    if (editingLocked && sessionEnded) return;
    if (suppressAutosave.current) {
      suppressAutosave.current = false;
      return;
    }
    setServerSave("saving");
    const t = setTimeout(() => {
      void (async () => {
        try {
          await patchConsultation(id, {
            noteDraft: { ...draft },
            clinicalRecord: {
              labs: clinicalRecord.labs,
              clinicalNotes: clinicalRecord.clinicalNotes,
              history: clinicalRecord.history
            },
            advice,
            followUpRecommendedAt:
              followUpEnabled && followUpRecommendedAt
                ? new Date(followUpRecommendedAt).toISOString()
                : null,
            followUpNote: followUpNote || null
          });
          setServerSave("saved");
        } catch {
          setServerSave("idle");
        }
      })();
    }, 1500);
    return () => clearTimeout(t);
  }, [
    loading,
    id,
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote,
    editingLocked,
    sessionEnded
  ]);

  // ── Status toast auto-clear ────────────────────────────────────────────
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(""), 3500);
    return () => clearTimeout(t);
  }, [statusMsg]);

  // ── Lazy-load previous prescription on first visit to that step ────────
  useEffect(() => {
    if (activeStep === "prescription" && !prevRxLoaded && patientId) {
      void loadPrevRx();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, patientId]);

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

  async function loadPrevRx(): Promise<void> {
    if (prevRxLoaded || !patientId) return;
    setPrevRxLoaded(true);
    try {
      const timeline = await fetchPatientTimeline(patientId);
      const rxEvents = timeline.events
        .filter((e) => e.kind === "prescription")
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      const latest = rxEvents[0];
      if (latest && latest.kind === "prescription" && Array.isArray(latest.items) && latest.items.length > 0) {
        // Map the old simple items format into PrescriptionEntry
        const entries: PrescriptionEntry[] = latest.items.map((item) => ({
          ...emptyEntry(),
          id: randomId(),
          kind: "remedy" as const,
          name: item.remedy || item.code || "",
          instructions: item.dosage || ""
        }));
        setPrevRx(entries);
      } else {
        setPrevRx([]);
      }
    } catch {
      setPrevRx([]);
    }
  }

  async function generateAiNotes(): Promise<void> {
    if (!id) return;
    setIsGeneratingDraft(true);
    try {
      const data = await apiFetchJson<{
        aiReady: boolean;
        transcriptSaved: boolean;
        noteDraft: Record<string, unknown> | null;
        message: string;
      }>(
        haProxyPath(`doctor/consultations/${id}/generate-draft`),
        {
          method: "POST",
          body: JSON.stringify({
            transcriptText: transcriptInput || "",
            transcriptLanguage: "mixed-hi-en",
            transcriptConfidence: 0.85
          })
        }
      );

      if (data?.aiReady && data.noteDraft) {
        const nd = data.noteDraft;
        setAiDraft({
          chiefComplaints: String(nd.chiefComplaints ?? ""),
          emotionalState: String(nd.emotionalState ?? ""),
          physicalSymptoms: String(nd.physicalSymptoms ?? ""),
          modalities: String(nd.modalities ?? ""),
          timeline: String(nd.timeline ?? ""),
          needsReview: Boolean(nd.needsReview ?? true),
          generatedAt: new Date().toISOString()
        });
        setAiDraftGenerated(true);
        setStatusMsg("AI notes generated — review before inserting into case notes.");
      } else {
        setStatusMsg(data?.message ?? "Transcript saved. AI not yet available.");
      }
    } catch (e) {
      setStatusMsg(friendlyLoadError(e));
    } finally {
      setIsGeneratingDraft(false);
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
    setBusy(true);
    try {
      await apiFetchJson(haProxyPath(`doctor/consultations/${id}/finalize-note`), {
        method: "POST",
        body: JSON.stringify({ ...draft })
      });
      clearLocalNoteDraft(id);
      const completePrescription = rxEntries.filter((e) => e.name.trim().length > 0);
      if (completePrescription.length > 0) {
        if (prescriptionId) {
          await patchPrescription(prescriptionId, completePrescription as unknown[]);
        } else {
          const pr = await apiFetchJson<{ id: string }>(haProxyPath("doctor/prescriptions"), {
            method: "POST",
            body: JSON.stringify({ patientId, consultationId: id, items: completePrescription })
          });
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
        createFollowUp:
          createFollowUpTask && fuIso
            ? { dueAt: fuIso, reason: followUpNote.trim() || "Follow-up visit" }
            : undefined,
        distribute: {
          sendEmail: sendPrescriptionEmail,
          sendWhatsApp: sendPrescriptionWhatsApp,
          notifyEmail: sendPrescriptionEmail ? notifyEmail.trim() || null : null
        }
      });
      if (r?.ok) {
        setSessionEnded(true);
        setConsultationRunning(false);
        setLifecycleStatus("FINALIZED");
        if (lockAfterFinalize) setEditingLocked(true);
        const dist = r.distribution;
        if (dist?.pdfReady) {
          const parts: string[] = ["Prescription saved."];
          if (dist.whatsapp === "sent") parts.push("WhatsApp sent.");
          else if (dist.whatsapp === "failed") parts.push("WhatsApp failed.");
          else if (dist.whatsapp === "skipped" && sendPrescriptionWhatsApp) {
            parts.push(dist.whatsappDetail ?? "WhatsApp skipped.");
          }
          if (dist.email === "sent") parts.push("Email sent.");
          else if (dist.email === "failed") parts.push("Email failed.");
          else if (dist.email === "skipped" && sendPrescriptionEmail) {
            parts.push(dist.emailDetail ?? "Email skipped.");
          }
          setStatusMsg(parts.join(" "));
        } else {
          setStatusMsg("Consultation finalized.");
        }
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

  const stepDone: Record<ConsultationStep, boolean> = useMemo(
    () => ({
      patient: Boolean((patientForm.initialChiefComplaint || ctx?.patientInitialComplaint || "").trim()),
      history: Boolean(clinicalRecord.history.pastDiseases || clinicalRecord.history.medications),
      examination:
        clinicalRecord.labs.length > 0 || Boolean(clinicalRecord.clinicalNotes.observations),
      notes: Boolean(draft.chiefComplaints || draft.physicalSymptoms || draft.emotionalState),
      ai: Boolean(transcriptInput),
      prescription: rxEntries.some((e) => e.name.trim().length > 0),
      advice: Boolean(advice.diet || advice.lifestyle),
      followup: followUpEnabled && Boolean(followUpRecommendedAt),
      finalize: sessionEnded && lifecycleStatus === "FINALIZED"
    }),
    [patientForm.initialChiefComplaint, ctx, clinicalRecord, draft, transcriptInput, rxEntries, advice, followUpEnabled, followUpRecommendedAt, sessionEnded, lifecycleStatus]
  );

  const autosaveLabel =
    serverSave === "saving"
      ? "Syncing…"
      : serverSave === "saved"
        ? "Synced"
        : localSave === "saved"
          ? "Draft saved"
          : "";

  const selectStep = useCallback((step: ConsultationStep) => {
    setActiveStep(step);
    scrollFeedToWorkflowStep(feedRef.current, step);
  }, []);

  const goNextStep = useCallback(() => {
    const n = nextStep(activeStep);
    if (n) selectStep(n);
  }, [activeStep, selectStep]);

  const goPrevStep = useCallback(() => {
    const p = prevStep(activeStep);
    if (p) selectStep(p);
  }, [activeStep, selectStep]);

  useConsultationKeyboardNav(goPrevStep, goNextStep, !loading && !loadError && !sessionEnded);

  const toggleRecording = useCallback(() => {
    if (!workspace?.aiNotetakerEnabled || !consultationRunning || sessionEnded || formDisabled) return;
    if (liveAudio.phase === "recording") liveAudio.pauseRecording();
    else if (liveAudio.phase === "paused") liveAudio.resumeRecording();
    else void liveAudio.startRecording();
  }, [workspace?.aiNotetakerEnabled, consultationRunning, sessionEnded, formDisabled, liveAudio]);

  useConsultationWorkspaceShortcuts({
    enabled: !loading && !loadError,
    onToggleAiDrawer: () => setActiveDrawer((d) => (d === "ai" ? "none" : "ai")),
    onToggleRecording: toggleRecording,
    onFinalize: () => {
      if (!sessionEnded && activeStep === "finalize") void finalizeConsultation();
    },
    recordingEnabled: Boolean(workspace?.aiNotetakerEnabled && consultationRunning && !sessionEnded)
  });

  const differentialHints = useMemo(
    () => parseDifferentialHints(clinicalRecord.clinicalNotes.diagnosisThinking),
    [clinicalRecord.clinicalNotes.diagnosisThinking]
  );

  useEffect(() => {
    if (loading || loadError) return;
    scrollFeedToWorkflowStep(feedRef.current, activeStep);
  }, [activeStep, loading, loadError]);

  const insertAiIntoNotes = useCallback(() => {
    setDraft((prev) => ({
      chiefComplaints: aiDraft.chiefComplaints
        ? prev.chiefComplaints
          ? `${prev.chiefComplaints}\n\n${aiDraft.chiefComplaints}`
          : aiDraft.chiefComplaints
        : prev.chiefComplaints,
      emotionalState: aiDraft.emotionalState
        ? prev.emotionalState
          ? `${prev.emotionalState}\n\n${aiDraft.emotionalState}`
          : aiDraft.emotionalState
        : prev.emotionalState,
      physicalSymptoms: aiDraft.physicalSymptoms
        ? prev.physicalSymptoms
          ? `${prev.physicalSymptoms}\n\n${aiDraft.physicalSymptoms}`
          : aiDraft.physicalSymptoms
        : prev.physicalSymptoms,
      modalities: aiDraft.modalities
        ? prev.modalities
          ? `${prev.modalities}\n\n${aiDraft.modalities}`
          : aiDraft.modalities
        : prev.modalities,
      timeline: aiDraft.timeline
        ? prev.timeline
          ? `${prev.timeline}\n\n${aiDraft.timeline}`
          : aiDraft.timeline
        : prev.timeline
    }));
    setStatusMsg("AI notes merged into Case Notes — review and edit them there.");
    selectStep("notes");
  }, [aiDraft, selectStep]);

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

  const aiStepStatus: AIStepStatus = useMemo(() => {
    if (isGeneratingDraft) return "processing";
    if (liveAudio.phase === "recording") return "recording";
    if (liveAudio.phase === "paused") return "paused";
    if (aiDraftGenerated) return "ready";
    return "idle";
  }, [isGeneratingDraft, liveAudio.phase, aiDraftGenerated]);

  const adviceCards = useMemo((): AdviceCard[] => {
    const cards: AdviceCard[] = [];
    if (advice.diet.trim()) {
      cards.push({ id: "diet-main", category: "diet", title: "Diet & restrictions", detail: advice.diet });
    }
    if (advice.lifestyle.trim()) {
      cards.push({ id: "lifestyle-main", category: "lifestyle", title: "Lifestyle", detail: advice.lifestyle });
    }
    return cards;
  }, [advice]);

  const onAdviceCardsChange = useCallback((cards: AdviceCard[]) => {
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
      age: ctx?.patientAge ?? null,
      gender: ctx?.patientGender ?? null,
      phone: ctx?.patientPhone ?? null,
      allergies: patientAllergies,
      visitType: (ctx?.consultationType === "INITIAL" ? "INITIAL" : "FOLLOW_UP") as "INITIAL" | "FOLLOW_UP",
      lastVisitAt: ctx?.lastVisitAt ?? null,
      chiefComplaint: ctx?.patientInitialComplaint ?? null
    }),
    [patientName, ctx, patientAllergies]
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
      bp: "",
      pulse: "",
      temperature: "",
      spO2: "",
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
      symptomsToMonitor: ""
    }),
    [followUpEnabled, followUpRecommendedAt, followUpNote]
  );

  const finalizeItems = useMemo(
    () =>
      (
        [
          { id: "patient", label: "Chief complaint", step: "patient" as ConsultationStep },
          { id: "history", label: "History captured", step: "history" as ConsultationStep },
          { id: "examination", label: "Examination notes", step: "examination" as ConsultationStep },
          { id: "notes", label: "Case notes", step: "notes" as ConsultationStep },
          { id: "prescription", label: "Prescription", step: "prescription" as ConsultationStep },
          { id: "advice", label: "Advice for patient", step: "advice" as ConsultationStep }
        ] as const
      ).map(({ id, label, step }) => ({
        id,
        label,
        status: stepDone[step] ? ("done" as const) : ("missing" as const),
        hint: stepDone[step] ? undefined : "Complete this section before finalizing"
      })),
    [stepDone]
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
        aiDraftGenerated,
        aiDraft,
        setActiveStep: selectStep,
        transcriptInput,
        setTranscriptInput,
        isGeneratingDraft,
        generateAiNotes,
        setAiDraft,
        setAiDraftGenerated,
        insertAiIntoNotes,
        liveAudio,
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
        finalizeConsultation,
        rxOutPrefs,
        setRxOutPrefs: (prefs) => setRxOutPrefs(setPrescriptionOutputPrefs(prefs)),
        openPreview
      }),
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
      savePatient,
      pendingPriorOutcome,
      priorOutcomeSaved,
      priorOutcomeValue,
      priorOutcomeAssessment,
      savePriorOutcome,
      aiDraftGenerated,
      aiDraft,
      selectStep,
      transcriptInput,
      isGeneratingDraft,
      generateAiNotes,
      insertAiIntoNotes,
      liveAudio,
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
      ctx,
      finalizeConsultation,
      rxOutPrefs,
      openPreview
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
      patientCode: patientId || null,
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

  const LIFECYCLE_COLORS: Record<string, string> = {
    FINALIZED: "border-emerald-300/70 bg-emerald-50 text-emerald-900",
    REVIEWING: "border-amber-300/70 bg-amber-50 text-amber-900",
    ACTIVE: "border-hs-primary/30 bg-hs-primary-very-light text-hs-primary",
    DRAFT: "border-hs-border/50 bg-hs-cream text-hs-text-secondary"
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-h,3.5rem))] flex-col overflow-hidden bg-hs-surface">
      <header className="flex shrink-0 items-center gap-2 border-b border-hs-border/50 bg-hs-paper px-3 py-2 sm:gap-3 sm:px-4">
        <Link
          href="/consultation"
          className="inline-flex items-center gap-1.5 rounded-lg border border-hs-border/50 bg-hs-cream/60 px-2.5 py-1.5 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30"
          aria-label="Back to consultation hub"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Hub</span>
        </Link>

        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-caption-sm font-medium",
            LIFECYCLE_COLORS[lifecycleStatus] ?? "border-hs-border/50 bg-hs-cream text-hs-text-secondary"
          )}
        >
          {lifecycleStatus.charAt(0) + lifecycleStatus.slice(1).toLowerCase()}
        </span>

        <div className="flex-1" />

        {autosaveLabel ? (
          <span className="inline-flex items-center gap-1 text-caption-sm text-hs-text-tertiary">
            {serverSave === "saving" ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
            )}
            <span className="hidden sm:inline">{autosaveLabel}</span>
          </span>
        ) : null}

        {!sessionEnded && workspace?.aiNotetakerEnabled ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {liveAudio.phase === "recording" ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/70 bg-rose-50 px-2.5 py-1 text-caption-sm font-bold text-rose-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
                  {formatRecordingTime(liveAudio.elapsedSeconds)}
                </span>
                <button
                  type="button"
                  onClick={() => liveAudio.pauseRecording()}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1.5 text-caption-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                  aria-label="Pause recording"
                >
                  <Pause className="h-3 w-3" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => liveAudio.stopRecording()}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-300/80 bg-rose-50 px-2.5 py-1.5 text-caption-sm font-bold text-rose-800 transition hover:bg-rose-100"
                  aria-label="Stop recording"
                >
                  <Square className="h-3 w-3" aria-hidden />
                </button>
              </>
            ) : liveAudio.phase === "paused" ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-caption-sm font-bold text-amber-700">
                  <Pause className="h-3 w-3" aria-hidden />
                  {formatRecordingTime(liveAudio.elapsedSeconds)}
                </span>
                <button
                  type="button"
                  onClick={() => liveAudio.resumeRecording()}
                  className="inline-flex items-center gap-1 rounded-full bg-hs-primary px-2.5 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
                >
                  <Play className="h-3 w-3" aria-hidden />
                  <span className="hidden sm:inline">Resume</span>
                </button>
              </>
            ) : consultationRunning ? (
              <button
                type="button"
                onClick={() => void liveAudio.startRecording()}
                disabled={liveAudio.busy || formDisabled}
                className="inline-flex items-center gap-1.5 rounded-full border border-hs-primary/35 bg-hs-primary-very-light px-3 py-1.5 text-caption-sm font-semibold text-hs-primary shadow-sm transition hover:bg-hs-primary/15 disabled:opacity-60"
              >
                <Mic className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{liveAudio.busy ? "Starting…" : "Record"}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {patientId && ctx ? (
        <ConsultationPatientBar
          patientId={patientId}
          patientName={patientName}
          age={ctx.patientAge}
          gender={ctx.patientGender}
          phone={ctx.patientPhone}
          allergies={patientAllergies}
          visitType={ctx.consultationType}
          lastVisitAt={ctx.lastVisitAt}
          lastCaseOutcome={lastCaseOutcome}
          consultationMode={consultationMode}
        />
      ) : null}

      <ConsultationWorkspaceShell
        mode={consultationMode}
        patientId={patientId}
        consultationId={id}
        activeStep={activeStep}
        stepDone={stepDone}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onSelectStep={selectStep}
        activeDrawer={activeDrawer}
        onActiveDrawerChange={setActiveDrawer}
        aiEnabled={Boolean(workspace?.aiNotetakerEnabled)}
        center={
          <ConsultationContinuousFeed
            ref={feedRef}
            activeStep={activeStep}
            readOnly={formDisabled}
            stepExtras={stepExtras}
            patient={patientSnapshot}
            patientStep={patientStepValue}
            onPatientStepChange={onPatientStepChange}
            historyStep={historyStepValue}
            onHistoryStepChange={onHistoryStepChange}
            examinationStep={examinationStepValue}
            onExaminationStepChange={onExaminationStepChange}
            notesStep={notesStepValue}
            onNotesStepChange={onNotesStepChange}
            aiEnabled={Boolean(workspace?.aiNotetakerEnabled)}
            aiStatus={aiStepStatus}
            aiTranscript={transcriptInput}
            aiDurationSec={liveAudio.elapsedSeconds}
            aiIsMock={liveAudio.lastMock}
            onAiStart={() => void liveAudio.startRecording()}
            onAiPause={() => liveAudio.pauseRecording()}
            onAiStop={() => liveAudio.stopRecording()}
            onAiResume={() => liveAudio.resumeRecording()}
            onAiTranscriptChange={setTranscriptInput}
            prescriptionEntries={rxEntries}
            onPrescriptionChange={setRxEntries}
            adviceCards={adviceCards}
            onAdviceChange={onAdviceCardsChange}
            followUpStep={followUpStepValue}
            onFollowUpChange={onFollowUpStepChange}
            finalizeItems={finalizeItems}
            alreadyFinalized={sessionEnded && lifecycleStatus === "FINALIZED"}
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
            nextLabel={activeStep === "followup" ? "Review & finalize" : undefined}
          />
        }
        aiDrawer={
          <AICopilotDrawer
            open={activeDrawer === "ai"}
            onClose={() => setActiveDrawer("none")}
            isRecording={liveAudio.phase === "recording"}
            isMock={liveAudio.lastMock}
            transcript={transcriptInput}
            onTranscriptChange={setTranscriptInput}
            aiDraft={aiDraft}
            aiDraftReady={aiDraftGenerated}
            isGenerating={isGeneratingDraft}
            onGenerate={() => void generateAiNotes()}
            onInsertIntoNotes={insertAiIntoNotes}
            differentialHints={differentialHints}
            readOnly={formDisabled}
          />
        }
        scheduleDrawer={
          <ScheduleFollowUpDrawer
            open={activeDrawer === "schedule"}
            onClose={() => setActiveDrawer("none")}
            value={followUpStepValue}
            onChange={onFollowUpStepChange}
            createTaskOnFinalize={createFollowUpTask}
            onCreateTaskChange={setCreateFollowUpTask}
            readOnly={formDisabled}
          />
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
