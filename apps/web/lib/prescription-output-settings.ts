const STORAGE_KEY = "glowhomeo_rx_patient_out_v1";

export type PrescriptionOutputPrefs = {
  showSymptoms: boolean;
  showNotes: boolean;
  showInstructions: boolean;
};

const defaults: PrescriptionOutputPrefs = {
  showSymptoms: true,
  showNotes: false,
  showInstructions: true
};

function read(): PrescriptionOutputPrefs {
  if (typeof window === "undefined") return { ...defaults };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const p = JSON.parse(raw) as Partial<Record<keyof PrescriptionOutputPrefs, unknown>>;
    return {
      showSymptoms: p.showSymptoms === false ? false : true,
      showNotes: p.showNotes === true,
      showInstructions: p.showInstructions === false ? false : true
    };
  } catch {
    return { ...defaults };
  }
}

export function getPrescriptionOutputPrefs(): PrescriptionOutputPrefs {
  return read();
}

export function setPrescriptionOutputPrefs(next: Partial<PrescriptionOutputPrefs>): PrescriptionOutputPrefs {
  const merged = { ...read(), ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  return merged;
}
