const KEY = "glowhomeo_last_case";

export type LastCase = {
  patientId: string;
  consultationId: string;
  patientName?: string;
  updatedAt: string;
  /** open visit vs ended session (from last load) */
  visitStatus?: "in_progress" | "closed";
};

export function getLastCase(): LastCase | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LastCase>;
    if (typeof p.patientId === "string" && typeof p.consultationId === "string") {
      return {
        patientId: p.patientId,
        consultationId: p.consultationId,
        patientName: typeof p.patientName === "string" ? p.patientName : undefined,
        updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
        visitStatus: p.visitStatus === "closed" || p.visitStatus === "in_progress" ? p.visitStatus : undefined
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setLastCase(entry: {
  patientId: string;
  consultationId: string;
  patientName?: string;
  visitStatus?: "in_progress" | "closed";
}): void {
  if (typeof window === "undefined") return;
  const v: LastCase = {
    ...entry,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function clearLastCase(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
