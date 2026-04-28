/** Local auto-save of consultation note drafts (offline resilience). */
const PREFIX = "glowhomeo_note_draft_";

export type StoredNoteDraft = {
  updatedAt: string;
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
};

function key(consultationId: string): string {
  return `${PREFIX}${consultationId}`;
}

export function loadLocalNoteDraft(consultationId: string): StoredNoteDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(consultationId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredNoteDraft>;
    if (typeof p.updatedAt !== "string") return null;
    return {
      updatedAt: p.updatedAt,
      chiefComplaints: typeof p.chiefComplaints === "string" ? p.chiefComplaints : "",
      emotionalState: typeof p.emotionalState === "string" ? p.emotionalState : "",
      physicalSymptoms: typeof p.physicalSymptoms === "string" ? p.physicalSymptoms : "",
      modalities: typeof p.modalities === "string" ? p.modalities : "",
      timeline: typeof p.timeline === "string" ? p.timeline : ""
    };
  } catch {
    return null;
  }
}

export function saveLocalNoteDraft(consultationId: string, draft: Omit<StoredNoteDraft, "updatedAt">): void {
  if (typeof window === "undefined") return;
  const v: StoredNoteDraft = { ...draft, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(key(consultationId), JSON.stringify(v));
  } catch {
    /* quota */
  }
}

export function clearLocalNoteDraft(consultationId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(consultationId));
  } catch {
    /* ignore */
  }
}
