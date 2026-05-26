import type { PrescriptionEntryForApi } from "./prescription-api-items";

const PREFIX = "glowhomeo_rx_draft_";

export type StoredRxDraft = {
  updatedAt: string;
  entries: PrescriptionEntryForApi[];
  prescriptionId: string | null;
};

function key(consultationId: string): string {
  return `${PREFIX}${consultationId}`;
}

export function loadLocalRxDraft(consultationId: string): StoredRxDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(consultationId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredRxDraft>;
    if (typeof p.updatedAt !== "string" || !Array.isArray(p.entries)) return null;
    return {
      updatedAt: p.updatedAt,
      entries: p.entries,
      prescriptionId: typeof p.prescriptionId === "string" ? p.prescriptionId : null
    };
  } catch {
    return null;
  }
}

export function saveLocalRxDraft(
  consultationId: string,
  draft: Omit<StoredRxDraft, "updatedAt">
): void {
  if (typeof window === "undefined") return;
  const v: StoredRxDraft = { ...draft, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(key(consultationId), JSON.stringify(v));
  } catch {
    /* quota */
  }
}

export function clearLocalRxDraft(consultationId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(consultationId));
  } catch {
    /* ignore */
  }
}
