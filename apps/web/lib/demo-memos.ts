import type { DoctorMemo, DoctorMemoKind, DoctorMemoPriority, DoctorMemoStatus, DoctorMemoSummary } from "./doctor-api";

const STORAGE_KEY = "homeoassist:demo:doctor_memos";

const P1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const P2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2";
const C1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600000).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

const SEED: DoctorMemo[] = [
  {
    id: "demo-memo-1",
    kind: "reminder",
    body: "Call Ananya if headache diary not uploaded by Friday",
    dueAt: hoursFromNow(4),
    priority: "urgent",
    pinned: true,
    status: "open",
    patientId: P1,
    patientName: "Ananya Sharma",
    consultationId: C1,
    doctorId: "demo-doctor",
    overdue: false,
    createdAt: hoursAgo(20),
    updatedAt: hoursAgo(20)
  },
  {
    id: "demo-memo-2",
    kind: "follow_up",
    body: "Review winter aggravation — consider higher potency if stiffness persists",
    dueAt: hoursFromNow(48),
    priority: "normal",
    pinned: false,
    status: "open",
    patientId: P2,
    patientName: "R. Krishnan",
    consultationId: null,
    doctorId: "demo-doctor",
    overdue: false,
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(48)
  },
  {
    id: "demo-memo-3",
    kind: "note",
    body: "Clinic supply: order 6C and 30C tubes before weekend camp",
    dueAt: null,
    priority: "normal",
    pinned: true,
    status: "open",
    patientId: null,
    patientName: null,
    consultationId: null,
    doctorId: "demo-doctor",
    overdue: false,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2)
  }
];

function loadAll(): DoctorMemo[] {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return [...SEED];
    }
    return JSON.parse(raw) as DoctorMemo[];
  } catch {
    return [...SEED];
  }
}

function saveAll(list: DoctorMemo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* */
  }
}

function isOverdue(m: DoctorMemo): boolean {
  if (!m.dueAt || m.status !== "open") return false;
  return new Date(m.dueAt).getTime() < Date.now();
}

function enrich(m: DoctorMemo): DoctorMemo {
  return { ...m, overdue: isOverdue(m) };
}

export function getDemoMemos(params?: {
  patientId?: string;
  consultationId?: string;
  status?: DoctorMemoStatus | "all";
  urgentOnly?: boolean;
  limit?: number;
}): DoctorMemo[] {
  let list = loadAll().map(enrich);
  if (params?.patientId) list = list.filter((m) => m.patientId === params.patientId);
  if (params?.consultationId) list = list.filter((m) => m.consultationId === params.consultationId);
  if (params?.status && params.status !== "all") list = list.filter((m) => m.status === params.status);
  if (params?.urgentOnly) list = list.filter((m) => m.priority === "urgent");
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
    const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
    return ad - bd;
  });
  return list.slice(0, params?.limit ?? 40);
}

export function getDemoMemoSummary(): DoctorMemoSummary {
  const open = getDemoMemos({ status: "open", limit: 50 });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const dueToday = open.filter((m) => {
    if (!m.dueAt) return false;
    const t = new Date(m.dueAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  const topUrgent = [...open]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
      return 0;
    })
    .slice(0, 6);
  return {
    openCount: open.length,
    urgentCount: open.filter((m) => m.priority === "urgent").length,
    overdueCount: open.filter((m) => m.overdue).length,
    pinnedCount: open.filter((m) => m.pinned).length,
    dueTodayCount: dueToday.length,
    topUrgent
  };
}

export function createDemoMemo(body: {
  body: string;
  kind?: DoctorMemoKind;
  patientId?: string;
  consultationId?: string;
  dueAt?: string;
  priority?: DoctorMemoPriority;
  pinned?: boolean;
}): DoctorMemo {
  const list = loadAll();
  const names: Record<string, string> = {
    [P1]: "Ananya Sharma",
    [P2]: "R. Krishnan"
  };
  const memo: DoctorMemo = {
    id: `demo-memo-${Date.now()}`,
    kind: body.kind ?? "note",
    body: body.body,
    dueAt: body.dueAt ?? null,
    priority: body.priority ?? "normal",
    pinned: body.pinned ?? false,
    status: "open",
    patientId: body.patientId ?? null,
    patientName: body.patientId ? names[body.patientId] ?? "Patient" : null,
    consultationId: body.consultationId ?? null,
    doctorId: "demo-doctor",
    overdue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  list.unshift(enrich(memo));
  saveAll(list);
  return enrich(memo);
}

export function patchDemoMemo(
  id: string,
  patch: {
    body?: string;
    kind?: DoctorMemoKind;
    dueAt?: string | null;
    priority?: DoctorMemoPriority;
    pinned?: boolean;
    status?: DoctorMemoStatus;
  }
): DoctorMemo {
  const list = loadAll();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error("Memo not found");
  const cur = list[idx]!;
  const next: DoctorMemo = enrich({
    ...cur,
    ...patch,
    dueAt: patch.dueAt !== undefined ? patch.dueAt : cur.dueAt,
    updatedAt: new Date().toISOString()
  });
  list[idx] = next;
  saveAll(list);
  return next;
}
