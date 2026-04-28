"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSignature,
  FileText,
  FlaskConical,
  Heart,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Pill,
  Plus,
  RefreshCw,
  Settings,
  Square,
  Stethoscope,
  Trash2,
  User,
  Zap
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
  presignStorageUpload,
  updatePatient,
  type ConsultationDetail,
  type ConsultationLifecycle,
  type PrescriptionDocumentPrefs,
  type WorkspaceContext
} from "../../lib/doctor-api";
import { isDemoMode } from "../../lib/demo-mode";
import { friendlyLoadError } from "../../lib/friendly-error";
import { clearLocalNoteDraft, loadLocalNoteDraft, saveLocalNoteDraft } from "../../lib/note-draft-local";
import {
  buildPrescriptionDocumentHtml,
  buildPrescriptionText,
  downloadTextFile,
  openPrintWindow,
  type ClinicDocumentMeta,
  type DoctorChartExtras,
  type PrescriptionLine
} from "../../lib/prescription-documents";
import { downloadHtmlAsPdf } from "../../lib/prescription-pdf";
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
import { cn } from "../../lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ConsultationStep =
  | "patient"
  | "history"
  | "examination"
  | "notes"
  | "ai"
  | "prescription"
  | "advice"
  | "followup"
  | "finalize";

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
  history: { pastDiseases: string; medications: string };
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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type StepDef = {
  id: ConsultationStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEP_LIST: StepDef[] = [
  { id: "patient", label: "Patient overview", icon: User },
  { id: "history", label: "Clinical history", icon: ClipboardList },
  { id: "examination", label: "Examination", icon: FlaskConical },
  { id: "notes", label: "Case notes", icon: FileText },
  { id: "ai", label: "AI notetaker", icon: Zap },
  { id: "prescription", label: "Prescription", icon: Pill },
  { id: "advice", label: "Advice", icon: Heart },
  { id: "followup", label: "Follow-up", icon: Calendar },
  { id: "finalize", label: "Finalize", icon: FileSignature }
];

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

const SLOT_SHORT: Record<TimingSlot, string> = {
  morning: "Mor",
  afternoon: "Aft",
  evening: "Eve",
  night: "Ngt"
};

const POTENCY_OPTS = ["6C", "12C", "30C", "200C", "1M", "10M", "CM", "6X", "12X", "30X", "LM1", "LM2", "Q"];
const DOSE_OPTS = ["1 pill", "2 pills", "3 pills", "4 pills", "5 pills", "10 drops", "15 drops", "20 drops", "1 tablet", "2 tablets"];
const DURATION_OPTS = ["3 days", "5 days", "7 days", "10 days", "2 weeks", "1 month", "Until review"];

const CATEGORY_COLORS: Record<string, string> = {
  diet: "border-emerald-200/80 bg-emerald-50/80 text-emerald-900",
  lifestyle: "border-sky-200/80 bg-sky-50/80 text-sky-900",
  restriction: "border-amber-200/80 bg-amber-50/80 text-amber-900"
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

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
  const dosage = [e.doseCount, slots].filter(Boolean).join(" — ");
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
        doseCount: String(o.dosage ?? "").split(" — ")[0] ?? "",
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
    history: { pastDiseases: "", medications: "" }
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
    history: { pastDiseases: String(hist.pastDiseases ?? ""), medications: String(hist.medications ?? "") }
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

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable UI helpers (module-level, no state)
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("ds-app-card p-5", className)}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-caption-sm font-semibold text-hs-text-secondary">{children}</span>
  );
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
  disabled,
  type,
  className
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type ?? "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60",
        className
      )}
    />
  );
}

function DatalistSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  listId
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  listId: string;
}) {
  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

function StepWrapper({
  title,
  description,
  children,
  onNext,
  nextLabel
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="pb-8">
      <div className="mb-5">
        <h2 className="font-heading text-heading-sm font-bold text-hs-ink">{title}</h2>
        {description ? <p className="mt-1 text-body-sm leading-relaxed text-hs-text-secondary">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
      {onNext ? (
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-hs-primary px-5 text-body-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/35"
          >
            {nextLabel ?? "Save & continue"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveConsultationClient
// ─────────────────────────────────────────────────────────────────────────────

export function LiveConsultationClient({ id }: { id: string }): JSX.Element {
  const router = useRouter();

  // Loading
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Navigation
  const [activeStep, setActiveStep] = useState<ConsultationStep>("notes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const [rxOutPrefs, setRxOutPrefs] = useState<PrescriptionOutputPrefs>(getPrescriptionOutputPrefs);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("Preview");

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

  // ── Audio hook ─────────────────────────────────────────────────────────────
  // WebSocket noteDraft events → populate aiDraft (NOT the doctor's draft)
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

  // ── Load ───────────────────────────────────────────────────────────────────
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

  // ── Autosave ───────────────────────────────────────────────────────────────
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

  // ── Status toast auto-clear ────────────────────────────────────────────────
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(""), 3500);
    return () => clearTimeout(t);
  }, [statusMsg]);

  // ── Lazy-load previous prescription on first visit to that step ────────────
  useEffect(() => {
    if (activeStep === "prescription" && !prevRxLoaded && patientId) {
      void loadPrevRx();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, patientId]);

  const formDisabled = editingLocked && sessionEnded;

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  async function savePrescription(): Promise<void> {
    if (!id || !patientId) return;
    const items = rxEntries.filter((e) => e.name.trim().length > 0);
    if (items.length === 0) {
      setStatusMsg("Add at least one remedy or medicine name.");
      return;
    }
    setBusy(true);
    try {
      if (prescriptionId) {
        await patchPrescription(prescriptionId, items as unknown[]);
      } else {
        const r = await apiFetchJson<{ id: string }>(haProxyPath("doctor/prescriptions"), {
          method: "POST",
          body: JSON.stringify({ patientId, consultationId: id, items })
        });
        if (r?.id) setPrescriptionId(r.id);
      }
      setStatusMsg("Prescription saved.");
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
            : undefined
      });
      if (r?.ok) {
        setSessionEnded(true);
        setConsultationRunning(false);
        setLifecycleStatus("FINALIZED");
        if (lockAfterFinalize) setEditingLocked(true);
        setStatusMsg("Consultation finalized.");
        reload();
      }
    } catch (e) {
      setStatusMsg(friendlyLoadError(e));
    } finally {
      setBusy(false);
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const completePrescriptionLines = useMemo(
    () => rxEntries.filter((e) => e.name.trim().length > 0).map(entryToLine),
    [rxEntries]
  );

  const stepDone: Record<ConsultationStep, boolean> = useMemo(
    () => ({
      patient: Boolean(ctx),
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
    [ctx, clinicalRecord, draft, transcriptInput, rxEntries, advice, followUpEnabled, followUpRecommendedAt, sessionEnded, lifecycleStatus]
  );

  const autosaveLabel =
    serverSave === "saving"
      ? "Syncing…"
      : serverSave === "saved"
        ? "Synced"
        : localSave === "saved"
          ? "Draft saved"
          : "";

  // ── Document helpers ───────────────────────────────────────────────────────
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
    setPreviewTitle(mode === "doctor" ? "Doctor copy" : "Patient copy");
    setPreviewHtml(buildPrescriptionDocumentHtml(buildDocOptions(mode)));
    setPreviewOpen(true);
  }

  async function handlePdfDownload(mode: "doctor" | "patient"): Promise<void> {
    try {
      await downloadHtmlAsPdf(
        `prescription-${mode}-${id.slice(0, 8)}.pdf`,
        buildPrescriptionDocumentHtml(buildDocOptions(mode))
      );
    } catch {
      setStatusMsg("PDF download failed. Use Print → Save as PDF.");
    }
  }

  // ── Step renderers (called as regular functions, not JSX components) ────────

  function renderPatientStep() {
    const caseLabel =
      ctx?.consultationType === "INITIAL" ? "Acute / new" : "Chronic / follow-up";
    const lastVisitText = ctx?.lastVisitAt
      ? new Date(ctx.lastVisitAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      : "—";

    return (
      <StepWrapper
        title="Patient overview"
        description="Verify and update patient details for this visit. All fields are optional to change."
        onNext={() => setActiveStep("history")}
      >
        <SectionCard>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading text-body-lg font-bold text-hs-ink">{patientName || "Patient"}</p>
              <p className="mt-0.5 text-caption-sm text-hs-text-tertiary">
                {ctx?.patientAge != null ? `${ctx.patientAge} yrs` : "Age not set"} ·{" "}
                {ctx?.patientGender?.trim() || "Gender not set"} ·{" "}
                {ctx?.patientPhone || "No contact"}
              </p>
              <p className="mt-0.5 text-caption-sm text-hs-text-tertiary">
                Case: <span className="font-medium text-hs-ink">{caseLabel}</span> · Last visit:{" "}
                <span className="font-medium text-hs-ink">{lastVisitText}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPatientEditOpen((v) => !v)}
              disabled={formDisabled}
              className="shrink-0 text-caption-sm font-semibold text-hs-primary hover:underline disabled:opacity-40"
            >
              {patientEditOpen ? "Close" : "Edit details"}
            </button>
          </div>
          {ctx?.patientInitialComplaint ? (
            <div className="mt-3 rounded-xl border border-hs-border/40 bg-hs-cream/60 px-3 py-2.5">
              <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
                Initial complaint
              </p>
              <p className="mt-1 text-body-sm text-hs-ink">{ctx.patientInitialComplaint}</p>
            </div>
          ) : null}
          {ctx?.patientNotes ? (
            <div className="mt-2 rounded-xl border border-hs-border/30 bg-hs-cream/40 px-3 py-2">
              <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">Chart notes</p>
              <p className="mt-0.5 text-body-sm text-hs-ink">{ctx.patientNotes}</p>
            </div>
          ) : null}
          {patientEditOpen ? (
            <div className="mt-4 space-y-3 border-t border-hs-border/40 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>Name</FieldLabel>
                  <InputField value={patientForm.name} onChange={(v) => setPatientForm((p) => ({ ...p, name: v }))} />
                </label>
                <label className="block">
                  <FieldLabel>Age</FieldLabel>
                  <InputField
                    value={patientForm.age}
                    onChange={(v) => setPatientForm((p) => ({ ...p, age: v.replace(/\D/g, "") }))}
                    placeholder="years"
                  />
                </label>
                <label className="block">
                  <FieldLabel>Gender</FieldLabel>
                  <InputField value={patientForm.gender} onChange={(v) => setPatientForm((p) => ({ ...p, gender: v }))} />
                </label>
                <label className="block">
                  <FieldLabel>Phone</FieldLabel>
                  <InputField value={patientForm.phone} onChange={(v) => setPatientForm((p) => ({ ...p, phone: v }))} />
                </label>
              </div>
              <label className="block">
                <FieldLabel>Address</FieldLabel>
                <TaField
                  value={patientForm.address}
                  onChange={(v) => setPatientForm((p) => ({ ...p, address: v }))}
                  rows={2}
                  disabled={formDisabled}
                />
              </label>
              <label className="block">
                <FieldLabel>Initial chief complaint</FieldLabel>
                <TaField
                  value={patientForm.initialChiefComplaint}
                  onChange={(v) => setPatientForm((p) => ({ ...p, initialChiefComplaint: v }))}
                  rows={2}
                  disabled={formDisabled}
                />
              </label>
              <label className="block">
                <FieldLabel>Chart notes</FieldLabel>
                <TaField
                  value={patientForm.patientNotes}
                  onChange={(v) => setPatientForm((p) => ({ ...p, patientNotes: v }))}
                  rows={2}
                  disabled={formDisabled}
                />
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void savePatient()}
                  disabled={busy || formDisabled}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-hs-primary px-4 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setPatientEditOpen(false)}
                  className="text-caption-sm text-hs-text-secondary hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </SectionCard>
        {patientId ? (
          <Link
            href={`/patients/${patientId}/timeline`}
            className="text-caption-sm font-semibold text-hs-primary hover:underline"
          >
            View full chart →
          </Link>
        ) : null}
      </StepWrapper>
    );
  }

  function renderHistoryStep() {
    return (
      <StepWrapper
        title="Clinical history"
        description="Past diseases, surgeries, and ongoing medications outside this clinic. All fields are optional."
        onNext={() => setActiveStep("examination")}
      >
        <SectionCard>
          <label className="block">
            <FieldLabel>Past diseases &amp; surgeries</FieldLabel>
            <TaField
              value={clinicalRecord.history.pastDiseases}
              onChange={(v) => setClinicalRecord((p) => ({ ...p, history: { ...p.history, pastDiseases: v } }))}
              rows={4}
              placeholder="e.g. Typhoid 2018, Appendicectomy 2020, recurring sinusitis…"
              disabled={formDisabled}
            />
          </label>
          <label className="mt-4 block">
            <FieldLabel>Ongoing medications (outside this clinic)</FieldLabel>
            <TaField
              value={clinicalRecord.history.medications}
              onChange={(v) => setClinicalRecord((p) => ({ ...p, history: { ...p.history, medications: v } }))}
              rows={3}
              placeholder="e.g. Metformin 500 mg BD for T2DM, Paracetamol PRN…"
              disabled={formDisabled}
            />
          </label>
        </SectionCard>
      </StepWrapper>
    );
  }

  function renderExaminationStep() {
    return (
      <StepWrapper
        title="Examination &amp; findings"
        description="Lab results and clinical observations. Add only what was done today — nothing is mandatory."
        onNext={() => setActiveStep("notes")}
      >
        <SectionCard>
          <div className="flex items-center justify-between">
            <p className="text-body-sm font-semibold text-hs-ink">Lab investigations</p>
          </div>
          {clinicalRecord.labs.length === 0 ? (
            <p className="mt-2 text-body-sm text-hs-text-tertiary">No tests added yet.</p>
          ) : null}
          <div className="mt-3 space-y-2">
            {clinicalRecord.labs.map((lab) => (
              <div
                key={lab.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-hs-border/40 bg-hs-cream/50 p-3 sm:grid-cols-[2fr_2fr_1fr_auto]"
              >
                <input
                  value={lab.testName}
                  onChange={(e) =>
                    setClinicalRecord((p) => ({
                      ...p,
                      labs: p.labs.map((l) => (l.id === lab.id ? { ...l, testName: e.target.value } : l))
                    }))
                  }
                  placeholder="Test name"
                  disabled={formDisabled}
                  className="col-span-2 rounded-lg border border-hs-border/40 px-2.5 py-2 text-caption-md text-hs-ink focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 sm:col-span-1"
                />
                <input
                  value={lab.result}
                  onChange={(e) =>
                    setClinicalRecord((p) => ({
                      ...p,
                      labs: p.labs.map((l) => (l.id === lab.id ? { ...l, result: e.target.value } : l))
                    }))
                  }
                  placeholder="Result"
                  disabled={formDisabled}
                  className="rounded-lg border border-hs-border/40 px-2.5 py-2 text-caption-md text-hs-ink focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
                />
                <input
                  value={lab.notes}
                  onChange={(e) =>
                    setClinicalRecord((p) => ({
                      ...p,
                      labs: p.labs.map((l) => (l.id === lab.id ? { ...l, notes: e.target.value } : l))
                    }))
                  }
                  placeholder="Notes"
                  disabled={formDisabled}
                  className="hidden rounded-lg border border-hs-border/40 px-2.5 py-2 text-caption-md text-hs-ink focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 sm:block"
                />
                <button
                  type="button"
                  onClick={() =>
                    setClinicalRecord((p) => ({ ...p, labs: p.labs.filter((l) => l.id !== lab.id) }))
                  }
                  disabled={formDisabled}
                  className="flex items-center justify-center text-rose-700 hover:text-rose-900 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setClinicalRecord((p) => ({
                ...p,
                labs: [...p.labs, { id: randomId(), testName: "", result: "", notes: "" }]
              }))
            }
            disabled={formDisabled}
            className="mt-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-hs-primary hover:underline disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add test
          </button>
        </SectionCard>
        <SectionCard>
          <label className="block">
            <FieldLabel>Clinical observations / physical examination</FieldLabel>
            <TaField
              value={clinicalRecord.clinicalNotes.observations}
              onChange={(v) => setClinicalRecord((p) => ({ ...p, clinicalNotes: { ...p.clinicalNotes, observations: v } }))}
              rows={4}
              placeholder="Pulse, tongue, skin, reflexes, local examination findings…"
              disabled={formDisabled}
            />
          </label>
          <label className="mt-4 block">
            <FieldLabel>Assessment / case analysis</FieldLabel>
            <TaField
              value={clinicalRecord.clinicalNotes.diagnosisThinking}
              onChange={(v) => setClinicalRecord((p) => ({ ...p, clinicalNotes: { ...p.clinicalNotes, diagnosisThinking: v } }))}
              rows={4}
              placeholder="Miasmatic assessment, totality of symptoms, differential remedies considered…"
              disabled={formDisabled}
            />
          </label>
        </SectionCard>
      </StepWrapper>
    );
  }

  function renderCaseNotesStep() {
    const noteFields: Array<[keyof NoteDraft, string, string, number]> = [
      ["chiefComplaints", "Chief complaints", "Main presenting complaints, onset, duration, character, location…", 3],
      ["emotionalState", "Emotional / mental state", "Mood, anxieties, fears, sleep, grief, dreams, anger patterns…", 2],
      ["physicalSymptoms", "Physical symptoms & generals", "Location, sensation, modalities, concomitants, generals…", 3],
      ["modalities", "Modalities", "Better / worse with: heat, cold, motion, rest, time of day, weather…", 2],
      ["timeline", "History & timeline", "Onset, causation, triggering events, evolution of complaints…", 2]
    ];

    return (
      <StepWrapper
        title="Case notes"
        description="Structured symptom capture for homeopathic case analysis. Skip any field that isn't relevant today."
        onNext={() => setActiveStep("ai")}
      >
        {aiDraftGenerated && (aiDraft.chiefComplaints || aiDraft.physicalSymptoms || aiDraft.emotionalState) ? (
          <SectionCard className="border-hs-primary/25 bg-hs-primary-very-light/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0 text-hs-primary" aria-hidden />
                <div>
                  <p className="text-body-sm font-semibold text-hs-primary">AI draft ready — not yet inserted</p>
                  <p className="text-caption-sm text-hs-text-secondary">Review the draft in the AI Notetaker step before merging here.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep("ai")}
                className="shrink-0 rounded-lg border border-hs-primary/35 bg-hs-primary-very-light px-3 py-1.5 text-caption-sm font-semibold text-hs-primary transition hover:bg-hs-primary/15"
              >
                Review →
              </button>
            </div>
          </SectionCard>
        ) : null}
        <SectionCard>
          <div className="space-y-4">
            {noteFields.map(([key, label, placeholder, rows]) => (
              <label key={key} className="block">
                <FieldLabel>{label}</FieldLabel>
                <TaField
                  value={draft[key]}
                  onChange={(v) => setDraft((p) => ({ ...p, [key]: v }))}
                  rows={rows}
                  placeholder={placeholder}
                  disabled={formDisabled}
                />
              </label>
            ))}
          </div>
        </SectionCard>
      </StepWrapper>
    );
  }

  function renderAiStep() {
    // ── Feature gate: show lock screen when AI Notetaker is disabled for this clinic ──
    if (!workspace?.aiNotetakerEnabled) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-hs-border/60 bg-hs-cream/30 px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <Zap className="h-8 w-8" />
          </div>
          <div className="max-w-sm">
            <p className="text-base font-semibold text-hs-ink">AI Notetaker — Pro Feature</p>
            <p className="mt-2 text-sm leading-relaxed text-hs-text-secondary">
              Real-time transcription and AI-assisted clinical notes are available on the{" "}
              <span className="font-semibold text-hs-primary">Pro plan</span>. Contact your clinic admin to enable
              this feature.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              <Zap className="h-3 w-3" />
              Upgrade to Pro
            </span>
            <p className="text-xs text-hs-text-tertiary">You can still add case notes manually in the Case Notes step.</p>
          </div>
        </div>
      );
    }

    const isRecording = liveAudio.phase === "recording";
    const isPaused = liveAudio.phase === "paused";
    const isReviewing = liveAudio.phase === "reviewing";
    const isIdle = liveAudio.phase === "idle";
    const canRecord = (isIdle || isPaused) && consultationRunning && !formDisabled;
    const hasAiContent =
      aiDraftGenerated &&
      (aiDraft.chiefComplaints || aiDraft.emotionalState || aiDraft.physicalSymptoms ||
        aiDraft.modalities || aiDraft.timeline);

    // Helper: merge aiDraft into case notes (doctor's draft)
    function insertIntoNotes() {
      setDraft((prev) => ({
        chiefComplaints: aiDraft.chiefComplaints
          ? (prev.chiefComplaints ? `${prev.chiefComplaints}\n\n${aiDraft.chiefComplaints}` : aiDraft.chiefComplaints)
          : prev.chiefComplaints,
        emotionalState: aiDraft.emotionalState
          ? (prev.emotionalState ? `${prev.emotionalState}\n\n${aiDraft.emotionalState}` : aiDraft.emotionalState)
          : prev.emotionalState,
        physicalSymptoms: aiDraft.physicalSymptoms
          ? (prev.physicalSymptoms ? `${prev.physicalSymptoms}\n\n${aiDraft.physicalSymptoms}` : aiDraft.physicalSymptoms)
          : prev.physicalSymptoms,
        modalities: aiDraft.modalities
          ? (prev.modalities ? `${prev.modalities}\n\n${aiDraft.modalities}` : aiDraft.modalities)
          : prev.modalities,
        timeline: aiDraft.timeline
          ? (prev.timeline ? `${prev.timeline}\n\n${aiDraft.timeline}` : aiDraft.timeline)
          : prev.timeline
      }));
      setStatusMsg("AI notes merged into Case Notes — review and edit them there.");
      setActiveStep("notes");
    }

    return (
      <StepWrapper title="AI notetaker" description="Record the consultation, then generate structured notes with one click. You always review — AI never overwrites your work.">

        {/* ── Recording controls ─────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  isRecording
                    ? "animate-pulse bg-rose-100 text-rose-600 ring-2 ring-rose-300/60"
                    : isPaused
                      ? "bg-amber-100 text-amber-600 ring-2 ring-amber-300/60"
                      : isReviewing
                        ? "bg-hs-cream text-hs-text-secondary"
                        : "bg-hs-primary-very-light text-hs-primary"
                )}
                aria-hidden
              >
                <Mic className="h-5 w-5" />
              </span>
              <div>
                <p className="text-body-sm font-semibold text-hs-ink">
                  {isRecording
                    ? `Recording  ${formatRecordingTime(liveAudio.elapsedSeconds)}`
                    : isPaused
                      ? `Paused  ${formatRecordingTime(liveAudio.elapsedSeconds)}`
                      : isReviewing
                        ? "Stopped — audio saved"
                        : consultationRunning
                          ? "Ready to record"
                          : "Session not active"}
                </p>
                <p className="text-caption-sm text-hs-text-secondary">
                  {isRecording
                    ? "Transcribing live…"
                    : isPaused
                      ? "Recording paused"
                      : isReviewing
                        ? "Review audio below before deciding to keep or discard"
                        : "Tap Start to begin live transcription"}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex shrink-0 items-center gap-2">
              {isRecording ? (
                <>
                  <button
                    type="button"
                    onClick={() => liveAudio.pauseRecording()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-caption-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    <Pause className="h-3.5 w-3.5" aria-hidden />
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={() => liveAudio.stopRecording()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-caption-sm font-semibold text-rose-800 transition hover:bg-rose-100"
                  >
                    <Square className="h-3.5 w-3.5" aria-hidden />
                    Stop
                  </button>
                </>
              ) : isPaused ? (
                <>
                  <button
                    type="button"
                    onClick={() => liveAudio.resumeRecording()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-hs-primary px-3 py-2 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden />
                    Resume
                  </button>
                  <button
                    type="button"
                    onClick={() => liveAudio.stopRecording()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-caption-sm font-semibold text-rose-800 transition hover:bg-rose-100"
                  >
                    <Square className="h-3.5 w-3.5" aria-hidden />
                    Stop
                  </button>
                </>
              ) : canRecord ? (
                <button
                  type="button"
                  onClick={() => void liveAudio.startRecording()}
                  disabled={liveAudio.busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-hs-primary px-4 py-2 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light disabled:opacity-50"
                >
                  {liveAudio.busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Mic className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {liveAudio.busy ? "Starting…" : "Start recording"}
                </button>
              ) : null}
            </div>
          </div>

          {liveAudio.err ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-caption-sm text-rose-900" role="alert">
              {liveAudio.err}
            </p>
          ) : null}

          {/* Audio staging */}
          {isReviewing && liveAudio.hasStagingAudio ? (
            <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
              <p className="text-body-sm font-semibold text-amber-900">Audio staged for review</p>
              <p className="text-caption-sm text-amber-800">Save recording to the consultation record or discard it permanently.</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void liveAudio.keepStagingAudio()}
                  disabled={liveAudio.busy}
                  className="rounded-lg bg-hs-primary px-3 py-1.5 text-caption-sm font-semibold text-white disabled:opacity-50"
                >
                  Save recording
                </button>
                <button
                  type="button"
                  onClick={() => void liveAudio.discardStagingAudio()}
                  disabled={liveAudio.busy}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-caption-sm font-semibold text-rose-800 disabled:opacity-50"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : null}
        </SectionCard>

        {/* ── Live transcript ────────────────────────────────────────────── */}
        <SectionCard>
          <p className="text-body-sm font-semibold text-hs-ink">Live transcript</p>
          <p className="text-caption-sm text-hs-text-secondary">
            Speech is transcribed here as you record. You can also paste notes manually.
          </p>

          {/* Live stream preview */}
          {liveAudio.liveTranscript ? (
            <div
              className="mt-3 max-h-32 overflow-y-auto rounded-xl border border-hs-primary/20 bg-hs-primary-very-light/30 p-3 text-body-sm text-hs-ink"
              aria-live="polite"
              aria-label="Live transcription"
            >
              <p className="whitespace-pre-wrap">{liveAudio.liveTranscript}</p>
            </div>
          ) : isRecording ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-hs-border/40 bg-hs-cream/40 p-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
              <p className="text-caption-sm text-hs-text-tertiary">Listening…</p>
            </div>
          ) : null}

          <label className="mt-3 block">
            <FieldLabel>Full transcript (editable)</FieldLabel>
            <TaField
              value={transcriptInput}
              onChange={(v) => {
                setTranscriptInput(v);
              }}
              rows={6}
              placeholder="Transcript appears here as recording progresses. You can paste, edit, or add notes manually before generating AI notes…"
              disabled={formDisabled}
            />
          </label>
          <p className="mt-1.5 text-caption-sm text-hs-text-tertiary">
            {transcriptInput.length > 0 ? `${transcriptInput.length} characters` : "Empty — record or type manually"}
          </p>
        </SectionCard>

        {/* ── Generate AI notes ──────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-body-sm font-semibold text-hs-ink">Generate structured notes</p>
              <p className="text-caption-sm text-hs-text-secondary">
                Sends the transcript to AI and returns structured clinical fields. Review before using — AI is a draft, not final.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void generateAiNotes()}
                disabled={isGeneratingDraft || formDisabled || !transcriptInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-hs-ink/90 px-4 py-2 text-caption-sm font-semibold text-white transition hover:bg-hs-ink disabled:opacity-50"
              >
                {isGeneratingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Zap className="h-3.5 w-3.5" aria-hidden />
                )}
                {isGeneratingDraft ? "Generating…" : "Generate notes"}
              </button>
              {aiDraftGenerated ? (
                <button
                  type="button"
                  onClick={() => void generateAiNotes()}
                  disabled={isGeneratingDraft || formDisabled || !transcriptInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-hs-border/50 bg-hs-paper px-3 py-2 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Regenerate
                </button>
              ) : null}
            </div>
          </div>

          {/* AI Draft panel — shown only after generation */}
          {hasAiContent ? (
            <div className="mt-4 rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/30">
              <div className="flex items-center justify-between gap-2 border-b border-hs-primary/15 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-hs-primary" aria-hidden />
                  <p className="text-body-sm font-bold text-hs-primary">AI Draft — Review Required</p>
                  {aiDraft.needsReview ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-caption-sm font-semibold text-amber-800">
                      Needs review
                    </span>
                  ) : null}
                </div>
                {aiDraft.generatedAt ? (
                  <p className="text-caption-sm text-hs-text-tertiary">
                    {new Date(aiDraft.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 p-4">
                <p className="text-caption-sm text-hs-text-secondary">
                  Edit these fields freely — they are an AI draft and will not be saved until you click "Insert into Case Notes".
                </p>

                {(
                  [
                    ["chiefComplaints", "Chief complaints"] as const,
                    ["emotionalState", "Emotional / mental state"] as const,
                    ["physicalSymptoms", "Physical symptoms & generals"] as const,
                    ["modalities", "Modalities (better / worse)"] as const,
                    ["timeline", "History & timeline"] as const
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block">
                    <FieldLabel>{label}</FieldLabel>
                    <TaField
                      value={aiDraft[field]}
                      onChange={(v) => setAiDraft((prev) => ({ ...prev, [field]: v }))}
                      rows={3}
                      placeholder={`AI-extracted ${label.toLowerCase()}…`}
                      disabled={formDisabled}
                    />
                  </label>
                ))}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={insertIntoNotes}
                    disabled={formDisabled}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-hs-primary px-4 py-2.5 text-body-sm font-semibold text-white shadow-sm transition hover:bg-hs-primary-light disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                    Insert into Case Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiDraft((p) => ({ ...p, chiefComplaints: "", emotionalState: "", physicalSymptoms: "", modalities: "", timeline: "" }));
                      setAiDraftGenerated(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-hs-border/50 bg-hs-paper px-3 py-2.5 text-caption-sm font-semibold text-hs-text-secondary transition hover:border-rose-300/60 hover:text-rose-800"
                  >
                    Clear draft
                  </button>
                </div>
              </div>
            </div>
          ) : isGeneratingDraft ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-hs-border/40 bg-hs-cream/50 px-4 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-hs-primary" aria-hidden />
              <p className="text-body-sm text-hs-text-secondary">AI is reading the transcript and extracting clinical notes…</p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-hs-border/60 bg-hs-cream/30 px-4 py-4 text-center">
              <p className="text-body-sm text-hs-text-secondary">
                AI notes will appear here after generation.
                {!transcriptInput.trim() ? " Start recording or type a transcript above first." : ""}
              </p>
            </div>
          )}
        </SectionCard>

        {/* ── Continue to case notes ─────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setActiveStep("notes")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-hs-border/50 bg-hs-paper px-4 py-2 text-body-sm font-semibold text-hs-ink transition hover:border-hs-primary/30 hover:text-hs-primary"
          >
            Skip to Case Notes
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </StepWrapper>
    );
  }

  function renderPrescriptionStep() {
    function addEntry(kind: "remedy" | "medicine") {
      setRxEntries((prev) => [...prev, { ...emptyEntry(), id: randomId(), kind }]);
    }
    function update(entryId: string, patch: Partial<PrescriptionEntry>) {
      setRxEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...patch } : e)));
    }
    function remove(entryId: string) {
      setRxEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== entryId) : prev));
    }
    function toggleSlot(entryId: string, slot: TimingSlot) {
      setRxEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          const slots = e.timingSlots.includes(slot)
            ? e.timingSlots.filter((s) => s !== slot)
            : [...e.timingSlots, slot];
          return { ...e, timingSlots: slots };
        })
      );
    }

    return (
      <StepWrapper title="Prescription">
        {patientAllergies ? (
          <div className="mb-2 flex items-start gap-3 rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
            <div>
              <p className="text-body-sm font-semibold text-rose-900">Recorded allergies / sensitivities</p>
              <p className="mt-0.5 text-caption-sm text-rose-800">{patientAllergies}</p>
              <p className="mt-1 text-caption-sm text-rose-700/80">
                Verify no prescribed remedy or supplement conflicts with the above before saving the prescription.
              </p>
            </div>
          </div>
        ) : null}
        {prevRx && prevRx.length > 0 ? (
          <SectionCard className="border-hs-border/50 bg-hs-cream/40">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-body-sm font-semibold text-hs-ink">Previous prescription</p>
                <p className="text-caption-sm text-hs-text-secondary">{prevRx.length} item{prevRx.length !== 1 ? "s" : ""} from last visit</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrevRx((x) => !x)}
                  className="text-caption-sm font-semibold text-hs-primary underline-offset-2 hover:underline"
                >
                  {showPrevRx ? "Hide" : "View"}
                </button>
                {!formDisabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRxEntries(prevRx.map((e) => ({ ...e, id: randomId() })));
                      setStatusMsg("Previous prescription loaded — review and adjust before saving.");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-hs-primary/10 px-3 py-1.5 text-caption-sm font-semibold text-hs-primary transition hover:bg-hs-primary/20"
                  >
                    Repeat all
                  </button>
                ) : null}
              </div>
            </div>
            {showPrevRx ? (
              <div className="mt-3 space-y-1">
                {prevRx.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 rounded-lg bg-hs-paper px-3 py-2 text-body-sm">
                    <span className="rounded-full bg-hs-primary-very-light px-2 py-0.5 text-caption-sm font-bold uppercase text-hs-primary">
                      {e.kind === "remedy" ? "Rx" : "Med"}
                    </span>
                    <span className="font-medium text-hs-ink">{e.name}</span>
                    {e.potency ? <span className="text-hs-text-secondary">{e.potency}</span> : null}
                    {e.instructions ? <span className="text-hs-text-tertiary">· {e.instructions}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        <div className="space-y-4">
          {rxEntries.map((entry, idx) => (
            <SectionCard
              key={entry.id}
              className={entry.kind === "remedy" ? "border-hs-primary/20" : "border-hs-border/60"}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-caption-sm font-bold uppercase tracking-wide",
                      entry.kind === "remedy"
                        ? "bg-hs-primary-very-light text-hs-primary"
                        : "bg-hs-cream text-hs-text-secondary"
                    )}
                  >
                    {entry.kind === "remedy" ? "Remedy" : "Medicine"}
                  </span>
                  <span className="text-caption-sm text-hs-text-tertiary">#{idx + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      update(entry.id, { kind: entry.kind === "remedy" ? "medicine" : "remedy" })
                    }
                    disabled={formDisabled}
                    className="text-caption-sm font-medium text-hs-text-tertiary hover:text-hs-ink disabled:opacity-40"
                  >
                    Switch type
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    disabled={formDisabled}
                    className="text-rose-700 hover:text-rose-900 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel>{entry.kind === "remedy" ? "Remedy name" : "Medicine / supplement name"}</FieldLabel>
                    <InputField
                      value={entry.name}
                      onChange={(v) => update(entry.id, { name: v })}
                      placeholder={entry.kind === "remedy" ? "e.g. Nux Vomica, Pulsatilla…" : "e.g. Vitamin D3, Zinc…"}
                      disabled={formDisabled}
                    />
                  </label>
                  {entry.kind === "remedy" ? (
                    <label className="block">
                      <FieldLabel>Potency</FieldLabel>
                      <DatalistSelect
                        value={entry.potency}
                        onChange={(v) => update(entry.id, { potency: v })}
                        options={POTENCY_OPTS}
                        placeholder="e.g. 30C, 200C, 1M"
                        disabled={formDisabled}
                        listId={`potency-${entry.id}`}
                      />
                    </label>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel>Dose</FieldLabel>
                    <DatalistSelect
                      value={entry.doseCount}
                      onChange={(v) => update(entry.id, { doseCount: v })}
                      options={DOSE_OPTS}
                      placeholder="e.g. 4 pills, 10 drops"
                      disabled={formDisabled}
                      listId={`dose-${entry.id}`}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Duration</FieldLabel>
                    <DatalistSelect
                      value={entry.duration}
                      onChange={(v) => update(entry.id, { duration: v })}
                      options={DURATION_OPTS}
                      placeholder="e.g. 7 days, 2 weeks"
                      disabled={formDisabled}
                      listId={`duration-${entry.id}`}
                    />
                  </label>
                </div>

                {/* Frequency chips */}
                <div>
                  <FieldLabel>Frequency</FieldLabel>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {FREQ_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => update(entry.id, { frequency: key })}
                        disabled={formDisabled}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-caption-sm font-medium transition",
                          entry.frequency === key
                            ? "border-hs-primary/50 bg-hs-primary-very-light text-hs-primary"
                            : "border-hs-border/50 bg-hs-paper text-hs-text-secondary hover:border-hs-primary/30"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {entry.frequency === "custom" ? (
                    <InputField
                      value={entry.customFrequency}
                      onChange={(v) => update(entry.id, { customFrequency: v })}
                      placeholder="e.g. Every 4 hours, twice weekly"
                      disabled={formDisabled}
                      className="mt-2"
                    />
                  ) : null}
                </div>

                {/* Timing slots */}
                <div>
                  <FieldLabel>Timing (when to take)</FieldLabel>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {(["morning", "afternoon", "evening", "night"] as TimingSlot[]).map((slot) => {
                      const on = entry.timingSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(entry.id, slot)}
                          disabled={formDisabled}
                          className={cn(
                            "rounded-lg border py-2 text-caption-sm font-semibold transition",
                            on
                              ? "border-hs-primary/50 bg-hs-primary text-white shadow-ds-sm"
                              : "border-hs-border/50 bg-hs-paper text-hs-text-secondary hover:border-hs-primary/30"
                          )}
                        >
                          {SLOT_SHORT[slot]}
                        </button>
                      );
                    })}
                  </div>
                  {entry.timingSlots.length > 0 ? (
                    <p className="mt-1 text-caption-sm text-hs-text-tertiary">
                      {entry.timingSlots.map((s) => SLOT_LABELS[s]).join(" + ")}
                    </p>
                  ) : null}
                </div>

                {/* Instructions */}
                <label className="block">
                  <FieldLabel>Patient instructions</FieldLabel>
                  <TaField
                    value={entry.instructions}
                    onChange={(v) => update(entry.id, { instructions: v })}
                    rows={2}
                    placeholder="e.g. Take with milk. Avoid 30 min before/after food. Keep in mouth until dissolved."
                    disabled={formDisabled}
                  />
                </label>
              </div>
            </SectionCard>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addEntry("remedy")}
            disabled={formDisabled}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-hs-primary/30 bg-hs-primary-very-light/50 px-4 py-2 text-body-sm font-semibold text-hs-primary transition hover:border-hs-primary/60 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add remedy
          </button>
          <button
            type="button"
            onClick={() => addEntry("medicine")}
            disabled={formDisabled}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-hs-border/50 px-4 py-2 text-body-sm font-semibold text-hs-text-secondary transition hover:border-hs-border-dark/60 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add medicine / supplement
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void savePrescription()}
            disabled={busy || formDisabled}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-hs-primary/35 bg-hs-primary-very-light px-4 text-body-sm font-semibold text-hs-primary transition hover:bg-hs-primary/15 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save prescription
          </button>
          <button
            type="button"
            onClick={() => setActiveStep("advice")}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-hs-primary px-5 text-body-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </StepWrapper>
    );
  }

  function renderAdviceStep() {
    const filtered = adviceTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.content.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(templateSearch.toLowerCase())
    );

    function applyTemplate(t: AdviceTemplate) {
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
    }

    function applyPlan(plan: TreatmentPlan) {
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
    }

    return (
      <StepWrapper
        title="Advice"
        description="Diet, lifestyle, and restrictions. Select from saved templates or type freely. Both are printed on the prescription."
        onNext={() => setActiveStep("followup")}
      >
        {treatmentPlans.length > 0 ? (
          <SectionCard>
            <p className="text-body-sm font-semibold text-hs-ink">Treatment plans</p>
            <p className="text-caption-sm text-hs-text-secondary">
              Apply an entire plan in one click — diet, lifestyle, and restrictions all populated at once.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {treatmentPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => applyPlan(plan)}
                  disabled={formDisabled}
                  className="inline-flex flex-col rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/60 px-3 py-2 text-left text-caption-sm text-hs-primary transition hover:bg-hs-primary/10 disabled:opacity-40"
                >
                  <span className="font-semibold">{plan.title}</span>
                  {plan.description ? <span className="mt-0.5 text-hs-primary/70">{plan.description}</span> : null}
                </button>
              ))}
            </div>
          </SectionCard>
        ) : null}
        <SectionCard>
          <p className="text-body-sm font-semibold text-hs-ink">Quick templates</p>
          <p className="text-caption-sm text-hs-text-secondary">
            Tap any template to append it. Saves typing the same advice repeatedly.
          </p>
          <input
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            placeholder="Search templates…"
            className="mt-2 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                disabled={formDisabled}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-left text-caption-sm transition hover:opacity-80 disabled:opacity-40",
                  CATEGORY_COLORS[t.category] ?? "border-hs-border/50 bg-hs-cream text-hs-ink"
                )}
                title={t.content}
              >
                <span className="font-semibold">{t.title}</span>
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="text-caption-sm text-hs-text-tertiary">No templates match.</p>
            ) : null}
          </div>

          {/* Create new template */}
          {newTemplate ? (
            <div className="mt-4 space-y-2 rounded-xl border border-hs-border/50 bg-hs-cream/50 p-3">
              <p className="text-caption-sm font-semibold text-hs-ink">Save new template</p>
              <input
                value={newTemplate.title}
                onChange={(e) => setNewTemplate((t) => t ? { ...t, title: e.target.value } : t)}
                placeholder="Template title"
                className="w-full rounded-lg border border-hs-border/40 px-2.5 py-1.5 text-body-sm"
              />
              <select
                value={newTemplate.category}
                onChange={(e) => setNewTemplate((t) => t ? { ...t, category: e.target.value as AdviceTemplate["category"] } : t)}
                className="w-full rounded-lg border border-hs-border/40 px-2.5 py-1.5 text-body-sm"
              >
                <option value="diet">Diet</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="restriction">Restriction</option>
              </select>
              <textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate((t) => t ? { ...t, content: e.target.value } : t)}
                placeholder="Template content…"
                rows={3}
                className="w-full rounded-lg border border-hs-border/40 px-2.5 py-1.5 text-body-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newTemplate.title.trim() || !newTemplate.content.trim()) return;
                    void createAdviceTemplate({
                      title: newTemplate.title.trim(),
                      category: newTemplate.category,
                      content: newTemplate.content.trim()
                    }).then(() =>
                      fetchAdviceTemplates().then((t) => setAdviceTemplates(t)).catch(() => {})
                    ).catch(() => {});
                    setNewTemplate(null);
                  }}
                  className="rounded-lg bg-hs-primary px-3 py-1.5 text-caption-sm font-semibold text-white"
                >
                  Save template
                </button>
                <button type="button" onClick={() => setNewTemplate(null)} className="text-caption-sm text-hs-text-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewTemplate({ title: "", category: "lifestyle", content: "" })}
              className="mt-2 inline-flex items-center gap-1 text-caption-sm font-semibold text-hs-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Create template
            </button>
          )}
        </SectionCard>

        <SectionCard>
          <label className="block">
            <p className="text-body-sm font-semibold text-hs-ink">Diet &amp; restrictions</p>
            <TaField
              value={advice.diet}
              onChange={(v) => setAdvice((p) => ({ ...p, diet: v }))}
              rows={4}
              placeholder="Diet recommendations and food restrictions for this case…"
              disabled={formDisabled}
            />
          </label>
          <label className="mt-4 block">
            <p className="text-body-sm font-semibold text-hs-ink">Lifestyle &amp; routines</p>
            <TaField
              value={advice.lifestyle}
              onChange={(v) => setAdvice((p) => ({ ...p, lifestyle: v }))}
              rows={4}
              placeholder="Daily routines, exercise, sleep, emotional wellness…"
              disabled={formDisabled}
            />
          </label>
        </SectionCard>
      </StepWrapper>
    );
  }

  function renderFollowUpStep() {
    return (
      <StepWrapper
        title="Follow-up plan"
        description="Completely optional. Set a follow-up only if you want to schedule one now."
        onNext={() => setActiveStep("finalize")}
      >
        <SectionCard>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={followUpEnabled}
              onChange={(e) => setFollowUpEnabled(e.target.checked)}
              disabled={formDisabled}
              className="h-4 w-4 rounded border-hs-border/60 text-hs-primary focus:ring-hs-primary/30"
            />
            <span className="text-body-sm font-semibold text-hs-ink">
              Schedule a follow-up for this patient
            </span>
          </label>
          {followUpEnabled ? (
            <div className="mt-4 space-y-3">
              <label className="block">
                <FieldLabel>Follow-up date &amp; time</FieldLabel>
                <input
                  type="datetime-local"
                  value={followUpRecommendedAt}
                  onChange={(e) => setFollowUpRecommendedAt(e.target.value)}
                  disabled={formDisabled}
                  className="mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm text-hs-ink focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60"
                />
              </label>
              <label className="block">
                <FieldLabel>Reminder note (shown on prescription footer)</FieldLabel>
                <TaField
                  value={followUpNote}
                  onChange={setFollowUpNote}
                  rows={2}
                  placeholder="e.g. Come back if symptoms worsen. Review in 3 weeks."
                  disabled={formDisabled}
                />
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={createFollowUpTask}
                  onChange={(e) => setCreateFollowUpTask(e.target.checked)}
                  disabled={formDisabled}
                  className="h-4 w-4 rounded border-hs-border/60 text-hs-primary focus:ring-hs-primary/30"
                />
                <span className="text-body-sm text-hs-ink">
                  Create a follow-up task in the queue when consultation is finalized
                </span>
              </label>
            </div>
          ) : null}
        </SectionCard>
      </StepWrapper>
    );
  }

  function renderFinalizeStep() {
    return (
      <StepWrapper title="Finalize consultation">
        {/* Letterhead — read-only from profile */}
        <SectionCard className="border-hs-border/40">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hs-cream text-hs-text-tertiary" aria-hidden>
              <Settings className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold text-hs-ink">Prescription letterhead</p>
              <p className="text-caption-sm text-hs-text-secondary">
                Your name, clinic, registration number, and signature come from your profile automatically — no re-entry needed here.
              </p>
              <div className="mt-2 space-y-0.5 text-caption-sm text-hs-text-secondary">
                <p>
                  <span className="font-medium text-hs-ink">{workspace?.doctorName ?? "—"}</span>
                  {workspace?.qualification ? ` · ${workspace.qualification}` : ""}
                </p>
                <p>{workspace?.clinicName ?? "No clinic"}</p>
                {!workspace?.qualification || !workspace.registrationNumber ? (
                  <Link href="/settings" className="inline-block font-semibold text-hs-primary hover:underline">
                    Complete letterhead in Settings →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Patient copy visibility */}
        <SectionCard>
          <p className="text-body-sm font-semibold text-hs-ink">Patient copy — visible sections</p>
          <div className="mt-3 space-y-2">
            {(
              [
                ["showSymptoms", "Include complaints"] as const,
                ["showNotes", "Include clinical notes"] as const,
                ["showInstructions", "Include instructions list"] as const
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-body-sm text-hs-ink">
                <input
                  type="checkbox"
                  checked={rxOutPrefs[key]}
                  onChange={() =>
                    setRxOutPrefs(setPrescriptionOutputPrefs({ [key]: !rxOutPrefs[key] }))
                  }
                  className="h-4 w-4 rounded border-hs-border/60 text-hs-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </SectionCard>

        {/* Preview & export */}
        <SectionCard>
          <p className="text-body-sm font-semibold text-hs-ink">Preview &amp; export</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openPreview("doctor")}
              disabled={formDisabled}
              className="rounded-xl border border-hs-border/60 bg-hs-paper py-2.5 text-body-sm font-semibold text-hs-ink transition hover:border-hs-primary/35 disabled:opacity-50"
            >
              Preview — doctor
            </button>
            <button
              type="button"
              onClick={() => openPreview("patient")}
              disabled={formDisabled}
              className="rounded-xl border border-hs-border/60 bg-hs-paper py-2.5 text-body-sm font-semibold text-hs-ink transition hover:border-hs-primary/35 disabled:opacity-50"
            >
              Preview — patient
            </button>
            <button
              type="button"
              onClick={() =>
                openPrintWindow(buildPrescriptionDocumentHtml(buildDocOptions("doctor")), "Prescription")
              }
              disabled={formDisabled}
              className="rounded-xl border border-hs-border/60 bg-hs-cream/60 py-2.5 text-body-sm font-semibold text-hs-ink transition hover:border-hs-primary/35 disabled:opacity-50"
            >
              Print — doctor
            </button>
            <button
              type="button"
              onClick={() =>
                openPrintWindow(buildPrescriptionDocumentHtml(buildDocOptions("patient")), "Prescription")
              }
              disabled={formDisabled}
              className="rounded-xl border border-hs-border/60 bg-hs-cream/60 py-2.5 text-body-sm font-semibold text-hs-ink transition hover:border-hs-primary/35 disabled:opacity-50"
            >
              Print — patient
            </button>
            <button
              type="button"
              onClick={() => void handlePdfDownload("doctor")}
              disabled={formDisabled}
              className="rounded-xl border border-hs-primary/30 bg-hs-primary-very-light py-2.5 text-body-sm font-semibold text-hs-primary transition hover:bg-hs-primary/15 disabled:opacity-50"
            >
              PDF — doctor
            </button>
            <button
              type="button"
              onClick={() => void handlePdfDownload("patient")}
              disabled={formDisabled}
              className="rounded-xl border border-hs-primary/30 bg-hs-primary-very-light py-2.5 text-body-sm font-semibold text-hs-primary transition hover:bg-hs-primary/15 disabled:opacity-50"
            >
              PDF — patient
            </button>
          </div>
        </SectionCard>

        {/* Finalize CTA or completion */}
        {!sessionEnded ? (
          <SectionCard className="border-hs-primary/20 bg-hs-primary-very-light/30">
            <p className="text-body-md font-bold text-hs-ink">Ready to finalize?</p>
            <p className="mt-1 text-body-sm text-hs-text-secondary">
              This saves notes, prescription, and follow-up to the chart. You can still print and download after.
            </p>
            <label className="mt-3 flex items-center gap-2 text-body-sm text-hs-ink">
              <input
                type="checkbox"
                checked={lockAfterFinalize}
                onChange={(e) => setLockAfterFinalize(e.target.checked)}
                className="h-4 w-4 rounded border-hs-border/60 text-hs-primary"
              />
              Lock editing after finalization
            </label>
            <button
              type="button"
              onClick={() => void finalizeConsultation()}
              disabled={busy || sessionEnded}
              className="mt-4 flex w-full min-h-12 items-center justify-center rounded-xl bg-hs-primary px-4 text-body-sm font-bold text-white shadow-ds-md transition hover:bg-hs-primary-light disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/40"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Finalizing…
                </>
              ) : (
                "✓ Finalize consultation"
              )}
            </button>
          </SectionCard>
        ) : (
          <SectionCard className="border-emerald-200/70 bg-emerald-50/60">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="text-body-sm font-bold text-emerald-900">Consultation finalized</p>
                <p className="text-caption-sm text-emerald-800">
                  Chart updated. Use the buttons above to print or download documents.
                </p>
              </div>
            </div>
            {patientId ? (
              <Link
                href={`/patients/${patientId}/timeline`}
                className="mt-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-hs-primary hover:underline"
              >
                View patient chart →
              </Link>
            ) : null}
          </SectionCard>
        )}
      </StepWrapper>
    );
  }

  // ── Loading / error states ─────────────────────────────────────────────────

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

  // ── Main render ────────────────────────────────────────────────────────────

  function renderStep() {
    switch (activeStep) {
      case "patient":
        return renderPatientStep();
      case "history":
        return renderHistoryStep();
      case "examination":
        return renderExaminationStep();
      case "notes":
        return renderCaseNotesStep();
      case "ai":
        return renderAiStep();
      case "prescription":
        return renderPrescriptionStep();
      case "advice":
        return renderAdviceStep();
      case "followup":
        return renderFollowUpStep();
      case "finalize":
        return renderFinalizeStep();
      default:
        return null;
    }
  }

  const LIFECYCLE_COLORS: Record<string, string> = {
    FINALIZED: "border-emerald-300/70 bg-emerald-50 text-emerald-900",
    REVIEWING: "border-amber-300/70 bg-amber-50 text-amber-900",
    ACTIVE: "border-hs-primary/30 bg-hs-primary-very-light text-hs-primary",
    DRAFT: "border-hs-border/50 bg-hs-cream text-hs-text-secondary"
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-h,3.5rem))] flex-col overflow-hidden bg-hs-surface">
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-hs-border/50 bg-hs-paper px-3 py-2 sm:gap-3 sm:px-4">
        <Link
          href="/consultation"
          className="inline-flex items-center gap-1.5 rounded-lg border border-hs-border/50 bg-hs-cream/60 px-2.5 py-1.5 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Hub</span>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="font-heading truncate text-body-md font-bold text-hs-ink">
              {patientName || "Consultation"}
            </h1>
            <span
              className="rounded-full border border-hs-primary/25 bg-hs-primary-very-light px-2 py-0.5 text-caption-sm font-semibold text-hs-primary"
              title={consultationMode === "ONLINE" ? "Online mode — video link coming soon" : undefined}
            >
              {consultationMode === "ONLINE" ? "Online (coming soon)" : "In-clinic"}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-caption-sm font-medium",
                LIFECYCLE_COLORS[lifecycleStatus] ?? "border-hs-border/50 bg-hs-cream text-hs-text-secondary"
              )}
            >
              {lifecycleStatus.charAt(0) + lifecycleStatus.slice(1).toLowerCase()}
            </span>
          </div>
        </div>

        {/* Autosave */}
        {autosaveLabel ? (
          <span className="hidden items-center gap-1 text-caption-sm text-hs-text-tertiary sm:flex">
            {serverSave === "saving" ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
            )}
            {autosaveLabel}
          </span>
        ) : null}

        {/* AI Recording — PERSISTENT controls in top bar (hidden when feature is disabled) */}
        {!sessionEnded && workspace?.aiNotetakerEnabled ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {liveAudio.phase === "recording" ? (
              <>
                {/* Timer + recording indicator */}
                <span className="hidden items-center gap-1.5 rounded-full border border-rose-300/70 bg-rose-50 px-2.5 py-1 text-caption-sm font-bold text-rose-700 sm:flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
                  {formatRecordingTime(liveAudio.elapsedSeconds)}
                </span>
                <button
                  type="button"
                  onClick={() => liveAudio.pauseRecording()}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1.5 text-caption-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                  <Pause className="h-3 w-3" aria-hidden />
                  <span className="hidden sm:inline">Pause</span>
                </button>
                <button
                  type="button"
                  onClick={() => liveAudio.stopRecording()}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-300/80 bg-rose-50 px-2.5 py-1.5 text-caption-sm font-bold text-rose-800 transition hover:bg-rose-100"
                >
                  <Square className="h-3 w-3" aria-hidden />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              </>
            ) : liveAudio.phase === "paused" ? (
              <>
                <span className="hidden items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-caption-sm font-bold text-amber-700 sm:flex">
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

        {patientId ? (
          <Link
            href={`/patients/${encodeURIComponent(patientId)}/timeline`}
            className="hidden rounded-lg border border-hs-border/50 px-2.5 py-1.5 text-caption-sm font-medium text-hs-primary transition hover:border-hs-primary/40 sm:inline-flex"
          >
            Chart
          </Link>
        ) : null}
      </header>

      {/* ── SIDEBAR + MAIN ──────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-hs-border/40 bg-hs-cream/50 transition-[width] duration-200",
            sidebarCollapsed ? "w-12" : "w-48"
          )}
        >
          <nav className="flex-1 overflow-y-auto py-2" aria-label="Consultation steps">
            {STEP_LIST.map((step, idx) => {
              const Icon = step.icon;
              const done = stepDone[step.id];
              const active = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  title={sidebarCollapsed ? step.label : undefined}
                  className={cn(
                    "group flex w-full items-center gap-2.5 px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hs-primary/30",
                    active
                      ? "bg-hs-primary-very-light/90 text-hs-primary"
                      : "text-hs-text-secondary hover:bg-hs-cream hover:text-hs-ink"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                      active
                        ? "bg-hs-primary text-white shadow-ds-sm"
                        : "bg-hs-paper/80 text-hs-text-secondary group-hover:text-hs-ink"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {done && !active ? (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-hs-cream"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  {!sidebarCollapsed ? (
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-left leading-tight",
                        active ? "font-semibold" : "font-medium"
                      )}
                    >
                      <span className="block text-[10px] font-medium text-hs-text-tertiary">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="block text-caption-sm">{step.label}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="flex items-center justify-center border-t border-hs-border/30 py-2.5 text-hs-text-tertiary transition hover:text-hs-ink"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform duration-200", !sidebarCollapsed && "rotate-180")}
            />
          </button>
        </aside>

        {/* Main content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">{renderStep()}</div>
        </main>
      </div>

      <PrescriptionPreviewModal
        open={previewOpen}
        title={previewTitle}
        html={previewHtml}
        onClose={() => setPreviewOpen(false)}
      />

      {/* Toast */}
      {statusMsg ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-4">
          <p className="rounded-xl border border-hs-border/60 bg-hs-paper px-4 py-2.5 text-caption-sm font-medium text-hs-ink shadow-ds-md">
            {statusMsg}
          </p>
        </div>
      ) : null}
    </div>
  );
}
