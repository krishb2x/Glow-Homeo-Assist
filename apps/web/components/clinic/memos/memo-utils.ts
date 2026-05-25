import type { DoctorMemo, DoctorMemoKind } from "../../../lib/doctor-api";

export const KIND_LABEL: Record<DoctorMemoKind, string> = {
  note: "Note",
  reminder: "Reminder",
  follow_up: "Follow-up"
};

export function formatMemoDue(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(d);
    dueDay.setHours(0, 0, 0, 0);
    const diff = (dueDay.getTime() - today.getTime()) / 86400000;
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    if (diff === 0) return `Today · ${time}`;
    if (diff === 1) return `Tomorrow · ${time}`;
    if (diff === -1) return `Yesterday · ${time}`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function defaultDueForKind(kind: DoctorMemoKind): string {
  const d = new Date();
  if (kind === "reminder") {
    d.setHours(d.getHours() + 2, 0, 0, 0);
  } else if (kind === "follow_up") {
    d.setDate(d.getDate() + 14);
    d.setHours(10, 0, 0, 0);
  }
  return d.toISOString().slice(0, 16);
}

export function sortMemos(list: DoctorMemo[]): DoctorMemo[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
    const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
    const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
    return ad - bd;
  });
}
