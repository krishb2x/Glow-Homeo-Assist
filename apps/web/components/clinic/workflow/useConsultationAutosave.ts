"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPrescription,
  getToken,
  patchConsultation,
  patchPrescription
} from "../../../lib/doctor-api";
import { saveLocalRxDraft } from "../../../lib/consultation-rx-draft-local";
import { saveLocalNoteDraft } from "../../../lib/note-draft-local";
import {
  prescriptionEntriesToApiItems,
  type PrescriptionEntryForApi
} from "../../../lib/prescription-api-items";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

type AdviceCardLite = {
  id: string;
  category: "diet" | "lifestyle" | "restriction";
  title: string;
  detail: string;
};

type NoteDraftLite = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
};

type ClinicalRecordLite = {
  labs: Array<{ id: string; testName: string; result: string; notes: string }>;
  clinicalNotes: { observations: string; diagnosisThinking: string };
  history: {
    pastDiseases: string;
    medications: string;
    familyHistory: string;
    drugAllergies: string;
  };
  vitals: { bp: string; pulse: string; temperature: string; spO2: string };
  adviceCards: AdviceCardLite[];
};

export type ConsultationAutosaveInput = {
  consultationId: string;
  patientId: string;
  loading: boolean;
  draft: NoteDraftLite;
  clinicalRecord: ClinicalRecordLite;
  advice: { diet: string; lifestyle: string };
  followUpEnabled: boolean;
  followUpRecommendedAt: string;
  followUpNote: string;
  symptomsToMonitor?: string[];
  rxEntries: PrescriptionEntryForApi[];
  prescriptionId: string | null;
  onPrescriptionCreated?: (id: string) => void;
  paused: boolean;
  suppressNext?: React.MutableRefObject<boolean>;
};

export type ConsultationAutosaveResult = {
  localSave: AutosaveState;
  serverSave: AutosaveState;
  saveError: string | null;
};

const MAX_RETRIES = 4;
const RETRY_BASE_MS = 2000;

function cloneDeep<T>(obj: T): T {
  if (obj === undefined) return undefined as any;
  return JSON.parse(JSON.stringify(obj));
}

function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!isDeepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!isDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Encapsulates local draft persistence and remote PATCH autosave for notes,
 * clinical record, and prescription lines.
 */
export function useConsultationAutosave(input: ConsultationAutosaveInput): ConsultationAutosaveResult {
  const {
    consultationId,
    patientId,
    loading,
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote,
    symptomsToMonitor = [],
    rxEntries,
    prescriptionId,
    onPrescriptionCreated,
    paused,
    suppressNext
  } = input;

  const [localSave, setLocalSave] = useState<AutosaveState>("idle");
  const [serverSave, setServerSave] = useState<AutosaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const payloadRef = useRef({
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote,
    symptomsToMonitor,
    rxEntries,
    prescriptionId,
    patientId
  });
  payloadRef.current = {
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote,
    symptomsToMonitor,
    rxEntries,
    prescriptionId,
    patientId
  };

  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consultationIdRef = useRef(consultationId);
  consultationIdRef.current = consultationId;
  const onPrescriptionCreatedRef = useRef(onPrescriptionCreated);
  onPrescriptionCreatedRef.current = onPrescriptionCreated;

  const lastSavedRef = useRef<{
    draft: NoteDraftLite;
    clinicalRecord: ClinicalRecordLite;
    advice: { diet: string; lifestyle: string };
    followUpEnabled: boolean;
    followUpRecommendedAt: string;
    followUpNote: string;
    symptomsToMonitor: string[];
    rxEntries: PrescriptionEntryForApi[];
  } | null>(null);

  // Synchronize/initialize/reset lastSavedRef on loading or consultation switch
  useEffect(() => {
    if (loading) {
      lastSavedRef.current = null;
      return;
    }
    if (consultationId && !lastSavedRef.current) {
      lastSavedRef.current = cloneDeep({
        draft,
        clinicalRecord,
        advice,
        followUpEnabled,
        followUpRecommendedAt,
        followUpNote,
        symptomsToMonitor: symptomsToMonitor || [],
        rxEntries
      });
    }
  }, [loading, consultationId, draft, clinicalRecord, advice, followUpEnabled, followUpRecommendedAt, followUpNote, symptomsToMonitor, rxEntries]);

  const runServerSave = useCallback(async () => {
    const id = consultationIdRef.current;
    if (!id || !getToken() || inFlightRef.current) {
      if (id && getToken()) pendingRef.current = true;
      return;
    }

    const {
      draft: d,
      clinicalRecord: cr,
      advice: adv,
      followUpEnabled: fuOn,
      followUpRecommendedAt: fuAt,
      followUpNote: fuNote,
      symptomsToMonitor: symptoms,
      rxEntries: rx,
      prescriptionId: rxId,
      patientId: pid
    } = payloadRef.current;

    const lastSaved = lastSavedRef.current;

    const draftDirty = !lastSaved || !isDeepEqual(d, lastSaved.draft);
    const clinicalRecordDirty = !lastSaved || !isDeepEqual(cr, lastSaved.clinicalRecord);
    const adviceDirty = !lastSaved || !isDeepEqual(adv, lastSaved.advice);
    const followUpDirty = !lastSaved ||
      fuOn !== lastSaved.followUpEnabled ||
      fuAt !== lastSaved.followUpRecommendedAt ||
      fuNote !== lastSaved.followUpNote;
    const symptomsDirty = !lastSaved || !isDeepEqual(symptoms, lastSaved.symptomsToMonitor);
    const rxDirty = !lastSaved || !isDeepEqual(rx, lastSaved.rxEntries);

    const anythingConsultationDirty = draftDirty || clinicalRecordDirty || adviceDirty || followUpDirty || symptomsDirty;
    const anythingDirty = anythingConsultationDirty || rxDirty;

    if (!anythingDirty) {
      setServerSave("saved");
      return;
    }

    inFlightRef.current = true;
    pendingRef.current = false;
    setServerSave("saving");

    try {
      if (anythingConsultationDirty) {
        const patchBody: any = {};
        if (draftDirty) {
          patchBody.noteDraft = { ...d };
        }
        if (clinicalRecordDirty) {
          patchBody.clinicalRecord = {
            labs: cr.labs,
            clinicalNotes: cr.clinicalNotes,
            history: cr.history,
            vitals: cr.vitals,
            advice: cr.adviceCards
          };
        }
        if (adviceDirty) {
          patchBody.advice = adv;
        }
        if (followUpDirty) {
          patchBody.followUpRecommendedAt = fuOn && fuAt ? new Date(fuAt).toISOString() : null;
          patchBody.followUpNote = fuNote || null;
        }
        if (symptomsDirty) {
          patchBody.symptomsToMonitor = symptoms;
        }
        await patchConsultation(id, patchBody);
      }

      let activeRxId = rxId;
      if (rxDirty && pid) {
        const rxItems = prescriptionEntriesToApiItems(rx);
        if (rxItems.length > 0) {
          if (activeRxId) {
            await patchPrescription(activeRxId, rxItems);
          } else {
            const created = await createPrescription({
              patientId: pid,
              consultationId: id,
              items: rxItems
            });
            activeRxId = created.id;
            payloadRef.current.prescriptionId = activeRxId;
            onPrescriptionCreatedRef.current?.(activeRxId);
          }
          saveLocalRxDraft(id, { entries: rx, prescriptionId: activeRxId });
        }
      }

      // Update last saved state to match successfully persisted values
      lastSavedRef.current = cloneDeep({
        draft: d,
        clinicalRecord: cr,
        advice: adv,
        followUpEnabled: fuOn,
        followUpRecommendedAt: fuAt,
        followUpNote: fuNote,
        symptomsToMonitor: symptoms,
        rxEntries: rx
      });

      retryCountRef.current = 0;
      setServerSave("saved");
      setSaveError(null);
    } catch {
      retryCountRef.current += 1;
      if (retryCountRef.current <= MAX_RETRIES) {
        setServerSave("error");
        setSaveError("Sync delayed — retrying…");
        const delay = RETRY_BASE_MS * 2 ** (retryCountRef.current - 1);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          void runServerSave();
        }, delay);
      } else {
        setServerSave("error");
        setSaveError("Could not sync — draft saved locally");
      }
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) {
        void runServerSave();
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Local autosave — offline-friendly note + Rx draft cache.
  useEffect(() => {
    if (loading || !consultationId) return;
    const t = setTimeout(() => {
      saveLocalNoteDraft(consultationId, {
        chiefComplaints: draft.chiefComplaints,
        emotionalState: draft.emotionalState,
        physicalSymptoms: draft.physicalSymptoms,
        modalities: draft.modalities,
        timeline: draft.timeline
      });
      saveLocalRxDraft(consultationId, {
        entries: rxEntries,
        prescriptionId
      });
      setLocalSave("saved");
    }, 500);
    return () => clearTimeout(t);
  }, [draft, rxEntries, prescriptionId, loading, consultationId]);

  // Flush pending save when tab hides (debounce may not have fired).
  useEffect(() => {
    const onHide = (): void => {
      if (document.visibilityState === "hidden" && !paused && consultationIdRef.current && getToken()) {
        void runServerSave();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [paused, runServerSave]);

  // Remote autosave — debounced; saving state only after debounce window.
  useEffect(() => {
    if (loading || !consultationId || !getToken()) return;
    if (paused) return;
    if (suppressNext?.current) {
      suppressNext.current = false;
      return;
    }

    // Only trigger debounce window if we actually have dirty fields compared to lastSaved
    const lastSaved = lastSavedRef.current;
    if (lastSaved) {
      const isDirty = (
        !isDeepEqual(draft, lastSaved.draft) ||
        !isDeepEqual(clinicalRecord, lastSaved.clinicalRecord) ||
        !isDeepEqual(advice, lastSaved.advice) ||
        followUpEnabled !== lastSaved.followUpEnabled ||
        followUpRecommendedAt !== lastSaved.followUpRecommendedAt ||
        followUpNote !== lastSaved.followUpNote ||
        !isDeepEqual(symptomsToMonitor, lastSaved.symptomsToMonitor) ||
        !isDeepEqual(rxEntries, lastSaved.rxEntries)
      );
      if (!isDirty) {
        return;
      }
    }

    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const t = setTimeout(() => {
      void runServerSave();
    }, 1500);
    return () => clearTimeout(t);
  }, [
    loading,
    consultationId,
    paused,
    suppressNext,
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote,
    symptomsToMonitor,
    rxEntries,
    prescriptionId,
    patientId,
    runServerSave
  ]);

  return { localSave, serverSave, saveError };
}
