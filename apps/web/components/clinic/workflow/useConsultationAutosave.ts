"use client";

import { useEffect, useState } from "react";
import {
  getToken,
  patchConsultation,
  type ConsultationClinicalRecord
} from "../../../lib/doctor-api";
import { saveLocalNoteDraft } from "../../../lib/note-draft-local";

export type AutosaveState = "idle" | "saving" | "saved";

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
  loading: boolean;
  draft: NoteDraftLite;
  clinicalRecord: ClinicalRecordLite;
  advice: { diet: string; lifestyle: string };
  followUpEnabled: boolean;
  followUpRecommendedAt: string;
  followUpNote: string;
  /** When true, do not fire the server autosave (e.g. finalised + locked). */
  paused: boolean;
  /** One-shot guard caller can set to skip the next autosave (used after explicit save). */
  suppressNext?: React.MutableRefObject<boolean>;
};

export type ConsultationAutosaveResult = {
  localSave: AutosaveState;
  serverSave: AutosaveState;
};

/**
 * Encapsulates both local note-draft persistence (immediate, < 1s) and the
 * remote `PATCH /doctor/consultations/:id` autosave (debounced, ~1.5s).
 *
 * Extracted from `LiveConsultationClient` so the orchestrator file is easier
 * to reason about and so the autosave can be tested in isolation.
 */
export function useConsultationAutosave(input: ConsultationAutosaveInput): ConsultationAutosaveResult {
  const {
    consultationId,
    loading,
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote,
    paused,
    suppressNext
  } = input;

  const [localSave, setLocalSave] = useState<AutosaveState>("idle");
  const [serverSave, setServerSave] = useState<AutosaveState>("idle");

  // Local autosave — drives the offline-friendly note draft cache.
  useEffect(() => {
    if (loading || !consultationId) return;
    setLocalSave("saving");
    const t = setTimeout(() => {
      saveLocalNoteDraft(consultationId, {
        chiefComplaints: draft.chiefComplaints,
        emotionalState: draft.emotionalState,
        physicalSymptoms: draft.physicalSymptoms,
        modalities: draft.modalities,
        timeline: draft.timeline
      });
      setLocalSave("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [draft, loading, consultationId]);

  // Remote autosave — debounced, idempotent. The full clinical record patch
  // mirrors what the explicit “Save” button posts.
  useEffect(() => {
    if (loading || !consultationId || !getToken()) return;
    if (paused) return;
    if (suppressNext?.current) {
      suppressNext.current = false;
      return;
    }
    setServerSave("saving");
    const t = setTimeout(() => {
      void (async () => {
        try {
          const recordPatch: ConsultationClinicalRecord = {
            labs: clinicalRecord.labs,
            clinicalNotes: clinicalRecord.clinicalNotes,
            history: clinicalRecord.history,
            vitals: clinicalRecord.vitals,
            advice: clinicalRecord.adviceCards
          };
          await patchConsultation(consultationId, {
            noteDraft: { ...draft },
            clinicalRecord: recordPatch,
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
    consultationId,
    paused,
    suppressNext,
    draft,
    clinicalRecord,
    advice,
    followUpEnabled,
    followUpRecommendedAt,
    followUpNote
  ]);

  return { localSave, serverSave };
}
