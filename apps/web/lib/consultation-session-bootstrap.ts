import {
  fetchCarePlans,
  fetchConsultation,
  fetchMyDay,
  fetchPatientTimeline,
  fetchRecentCarePlans,
  fetchWorkspaceContext,
  type CarePlanTemplateSummary,
  type ConsultationDetail,
  type MyDayResponse,
  type WorkspaceContext
} from "./doctor-api";
import { loadLocalNoteDraft } from "./note-draft-local";
import { loadLocalRxDraft } from "./consultation-rx-draft-local";

export type SessionNoteDraft = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
};

export type SessionAdviceCard = {
  id: string;
  category: "diet" | "lifestyle" | "restriction";
  title: string;
  detail: string;
};

export type SessionClinicalRecord = {
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
  adviceCards: SessionAdviceCard[];
  rubrics?: Array<{
    id: string;
    chapter: string;
    rubric: string;
    intensity: number;
  }>;
};

export type SessionPrescriptionEntry = {
  id: string;
  kind: "remedy" | "medicine";
  name: string;
  potency: string;
  doseCount: string;
  frequency: string;
  customFrequency: string;
  timingSlots: Array<"morning" | "afternoon" | "evening" | "night">;
  duration: string;
  instructions: string;
};

export type SessionPatientContext = {
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
};

export type ConsultationSessionPayload = {
  consultationId: string;
  patientId: string;
  patientCode: string | null;
  visitCode: string | null;
  patientName: string;
  sessionEnded: boolean;
  editingLocked: boolean;
  lifecycleStatus: ConsultationDetail["lifecycleStatus"];
  consultationMode: "IN_CLINIC" | "ONLINE";
  consultationRunning: boolean;
  patientAllergies: string | null;
  ctx: SessionPatientContext;
  patientForm: {
    name: string;
    age: string;
    gender: string;
    phone: string;
    address: string;
    initialChiefComplaint: string;
    patientNotes: string;
  };
  sendPrescriptionWhatsApp: boolean;
  workspace: WorkspaceContext | null;
  draft: SessionNoteDraft;
  clinicalRecord: SessionClinicalRecord;
  advice: { diet: string; lifestyle: string };
  followUpEnabled: boolean;
  followUpRecommendedAt: string;
  followUpNote: string;
  symptomsToMonitor: string[];
  prescriptionId: string | null;
  rxEntries: SessionPrescriptionEntry[];
  prevRx: SessionPrescriptionEntry[] | null;
  pendingPriorOutcome: ConsultationDetail["pendingPriorOutcome"];
  lastCaseOutcome: ConsultationDetail["lastCaseOutcome"];
  carePlans: CarePlanTemplateSummary[];
  recentCarePlanIds: string[];
  myDay: MyDayResponse | null;
};

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyDraft(): SessionNoteDraft {
  return { chiefComplaints: "", emotionalState: "", physicalSymptoms: "", modalities: "", timeline: "" };
}

function mergeDraft(raw: unknown): SessionNoteDraft {
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

function emptyClinical(): SessionClinicalRecord {
  return {
    labs: [],
    clinicalNotes: { observations: "", diagnosisThinking: "" },
    history: { pastDiseases: "", medications: "", familyHistory: "", drugAllergies: "" },
    vitals: { bp: "", pulse: "", temperature: "", spO2: "" },
    adviceCards: []
  };
}

function mergeClinical(raw: unknown): SessionClinicalRecord {
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
  const vit = d.vitals && typeof d.vitals === "object" ? (d.vitals as Record<string, unknown>) : {};
  const adviceRaw = Array.isArray(d.advice) ? (d.advice as Array<Record<string, unknown>>) : [];
  const adviceCards: SessionAdviceCard[] = adviceRaw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: typeof x.id === "string" ? x.id : randomId(),
      category:
        x.category === "lifestyle" || x.category === "restriction"
          ? (x.category as SessionAdviceCard["category"])
          : "diet",
      title: typeof x.title === "string" ? x.title : "",
      detail: typeof x.detail === "string" ? x.detail : ""
    }));
  return {
    labs,
    clinicalNotes: { observations: String(cn.observations ?? ""), diagnosisThinking: String(cn.diagnosisThinking ?? "") },
    history: {
      pastDiseases: String(hist.pastDiseases ?? ""),
      medications: String(hist.medications ?? ""),
      familyHistory: String(hist.familyHistory ?? ""),
      drugAllergies: String(hist.drugAllergies ?? "")
    },
    vitals: {
      bp: String(vit.bp ?? ""),
      pulse: String(vit.pulse ?? ""),
      temperature: String(vit.temperature ?? ""),
      spO2: String(vit.spO2 ?? "")
    },
    adviceCards
  };
}

function emptyEntry(): SessionPrescriptionEntry {
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

function normalizeEntries(raw: unknown): SessionPrescriptionEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyEntry()];
  const out: SessionPrescriptionEntry[] = [];
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
        timingSlots: Array.isArray(o.timingSlots)
          ? (o.timingSlots as SessionPrescriptionEntry["timingSlots"])
          : [],
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

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mergeLocalRx(
  consultationId: string,
  serverEntries: SessionPrescriptionEntry[],
  prescriptionId: string | null
): { entries: SessionPrescriptionEntry[]; prescriptionId: string | null } {
  const local = loadLocalRxDraft(consultationId);
  if (!local) return { entries: serverEntries, prescriptionId };
  const serverHasContent = serverEntries.some((e) => e.name.trim().length > 0);
  const localHasContent = local.entries.some((e) => e.name.trim().length > 0);
  if (!serverHasContent && localHasContent) {
    return {
      entries: normalizeEntries(local.entries),
      prescriptionId: local.prescriptionId ?? prescriptionId
    };
  }
  return { entries: serverEntries, prescriptionId };
}

function mergeLocalDraft(consultationId: string, serverDraft: SessionNoteDraft): SessionNoteDraft {
  const local = loadLocalNoteDraft(consultationId);
  if (!local) return serverDraft;
  const pick = (server: string, loc: string) => (loc.trim().length > server.trim().length ? loc : server);
  return {
    chiefComplaints: pick(serverDraft.chiefComplaints, local.chiefComplaints),
    emotionalState: pick(serverDraft.emotionalState, local.emotionalState),
    physicalSymptoms: pick(serverDraft.physicalSymptoms, local.physicalSymptoms),
    modalities: pick(serverDraft.modalities, local.modalities),
    timeline: pick(serverDraft.timeline, local.timeline)
  };
}

async function loadPreviousPrescription(patientId: string): Promise<SessionPrescriptionEntry[] | null> {
  try {
    const timeline = await fetchPatientTimeline(patientId);
    const rxEvents = timeline.events
      .filter((e) => e.kind === "prescription")
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const latest = rxEvents[0];
    if (latest && latest.kind === "prescription" && Array.isArray(latest.items) && latest.items.length > 0) {
      return latest.items.map((item) => ({
        ...emptyEntry(),
        id: randomId(),
        kind: "remedy" as const,
        name: item.remedy || item.code || "",
        instructions: item.dosage || ""
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Loads the full consultation session in one coordinated bootstrap —
 * chart data, workspace context, templates, queue, and prior prescription.
 */
export async function bootstrapConsultationSession(consultationId: string): Promise<ConsultationSessionPayload> {
  const [consultation, workspace, carePlans, recentCarePlans, myDay] = await Promise.all([
    fetchConsultation(consultationId),
    fetchWorkspaceContext().catch(() => null),
    fetchCarePlans().catch(() => [] as CarePlanTemplateSummary[]),
    fetchRecentCarePlans().catch(() => [] as CarePlanTemplateSummary[]),
    fetchMyDay(1).catch(() => null)
  ]);

  const cd = consultation as ConsultationDetail & Record<string, unknown>;
  const patientId = cd.patientId;
  const prevRx = patientId ? await loadPreviousPrescription(patientId) : null;

  const serverDraft = mergeDraft(cd.noteDraft);
  const draft = mergeLocalDraft(consultationId, serverDraft);
  const adv = cd.advice as Record<string, unknown> | null | undefined;
  const fuAt = cd.followUpRecommendedAt as string | null | undefined;
  const fuNote = cd.followUpNote as string | null | undefined;
  const symptomsRaw = cd.symptomsToMonitor as string[] | null | undefined;
  const patNotes = cd.patientNotes as string | null | undefined;
  const serverRxId = cd.prescription?.items ? cd.prescription.id : null;
  const serverRxEntries = cd.prescription?.items ? normalizeEntries(cd.prescription.items) : [emptyEntry()];
  const mergedRx = mergeLocalRx(consultationId, serverRxEntries, serverRxId);

  return {
    consultationId,
    patientId,
    patientCode: (cd.patientCode as string | null | undefined) ?? null,
    visitCode: (cd.visitCode as string | null | undefined) ?? null,
    patientName: cd.patientName,
    sessionEnded: Boolean(cd.endedAt),
    editingLocked: Boolean(cd.editingLocked),
    lifecycleStatus: (cd.lifecycleStatus as ConsultationDetail["lifecycleStatus"]) ?? "ACTIVE",
    consultationMode: (cd.consultationMode as "IN_CLINIC" | "ONLINE") ?? "IN_CLINIC",
    consultationRunning: !cd.endedAt,
    patientAllergies: (cd.patientAllergies as string | null | undefined) ?? null,
    ctx: {
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
    },
    patientForm: {
      name: cd.patientName,
      age: cd.patientAge != null ? String(cd.patientAge) : "",
      gender: cd.patientGender ?? "",
      phone: cd.patientPhone ?? "",
      address: cd.patientAddress ?? "",
      initialChiefComplaint: cd.patientInitialComplaint ?? "",
      patientNotes: patNotes ?? ""
    },
    sendPrescriptionWhatsApp: Boolean(cd.patientPhone?.trim()),
    workspace,
    draft,
    clinicalRecord: mergeClinical(cd.clinicalRecord),
    advice: { diet: String(adv?.diet ?? ""), lifestyle: String(adv?.lifestyle ?? "") },
    followUpEnabled: Boolean(fuAt),
    followUpRecommendedAt: toDatetimeLocalValue(fuAt),
    followUpNote: fuNote ?? "",
    symptomsToMonitor: Array.isArray(symptomsRaw) ? symptomsRaw : [],
    prescriptionId: mergedRx.prescriptionId,
    rxEntries: mergedRx.entries,
    prevRx,
    pendingPriorOutcome: cd.pendingPriorOutcome ?? null,
    lastCaseOutcome: cd.lastCaseOutcome ?? null,
    carePlans,
    recentCarePlanIds: recentCarePlans.map((p) => p.id),
    myDay
  };
}
