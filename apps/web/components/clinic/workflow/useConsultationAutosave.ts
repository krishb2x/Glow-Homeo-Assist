"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPrescription,
  getToken,
  patchConsultation,
  patchPrescription,
  type ConsultationClinicalRecord
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
  /** When true, do not fire the server autosave (e.g. finalised + locked). */
  paused: boolean;
  /** One-shot guard caller can set to skip the next autosave (used after explicit save). */
  suppressNext?: React.MutableRefObject<boolean>;
};

export type ConsultationAutosaveResult = {
  localSave: AutosaveState;
  serverSave: AutosaveState;
  saveError: string | null;
};

const MAX_RETRIES = 4;
const RETRY_BASE_MS = 2000;

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

  const runServerSave = useCallback(async () => {
    const id = consultationIdRef.current;
    if (!id || !getToken() || inFlightRef.current) {
      if (id && getToken()) pendingRef.current = true;
      return;
    }

    inFlightRef.current = true;
    pendingRef.current = false;
    setServerSave("saving");

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

    try {
      const recordPatch: ConsultationClinicalRecord = {
        labs: cr.labs,
        clinicalNotes: cr.clinicalNotes,
        history: cr.history,
        vitals: cr.vitals,
        advice: cr.adviceCards
      };
      await patchConsultation(id, {
        noteDraft: { ...d },
        clinicalRecord: recordPatch,
        advice: adv,
        followUpRecommendedAt: fuOn && fuAt ? new Date(fuAt).toISOString() : null,
        followUpNote: fuNote || null,
        symptomsToMonitor: symptoms
      });

      const rxItems = prescriptionEntriesToApiItems(rx);
      if (rxItems.length > 0 && pid) {
        let activeRxId = rxId;
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
