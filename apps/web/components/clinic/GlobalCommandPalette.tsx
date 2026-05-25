"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Search,
  Settings,
  Stethoscope,
  UserPlus,
  Users
} from "lucide-react";
import { getToken, searchPatientsLight, type PatientListItem } from "../../lib/doctor-api";
import { friendlyLoadError } from "../../lib/friendly-error";

const EVENT_OPEN = "ha:command-palette";

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_OPEN));
}

type NavCmd = { id: string; label: string; href: string; icon: typeof LayoutGrid; group: "Go to" | "Action" };

const NAV: NavCmd[] = [
  { id: "dash", label: "Home", href: "/dashboard", icon: LayoutGrid, group: "Go to" },
  { id: "sch", label: "Schedule", href: "/appointments", icon: Calendar, group: "Go to" },
  { id: "con", label: "Start consultation (pick patient)", href: "/consultation", icon: Stethoscope, group: "Go to" },
  { id: "pat", label: "Patients", href: "/patients", icon: Users, group: "Go to" },
  { id: "fu", label: "Follow-ups", href: "/follow-ups", icon: Inbox, group: "Go to" },
  { id: "msg", label: "Messages", href: "/messages", icon: MessageSquare, group: "Go to" },
  { id: "clin", label: "Clinic", href: "/clinic", icon: Building2, group: "Go to" },
  { id: "set", label: "Settings", href: "/settings", icon: Settings, group: "Go to" },
  { id: "newp", label: "New patient", href: "/patients/new", icon: UserPlus, group: "Action" }
];

function match(q: string, ...parts: (string | undefined)[]): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return parts.some((p) => (p ?? "").toLowerCase().includes(s));
}

export function GlobalCommandPalette(): JSX.Element | null {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState<PatientListItem[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback((search: string) => {
    if (!getToken()) return;
    setLoadErr(null);
    void (async () => {
      try {
        const items = await searchPatientsLight(search, 20);
        setPatients(items);
      } catch (e) {
        setLoadErr(friendlyLoadError(e));
        setPatients([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const t = setTimeout(() => load(q), q.trim() ? 280 : 0);
    setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open, q, load]);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(EVENT_OPEN, h);
    return () => window.removeEventListener(EVENT_OPEN, h);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (t as HTMLElement | null)?.isContentEditable) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredNav = useMemo(
    () => NAV.filter((n) => match(q, n.label, n.href, n.id)),
    [q]
  );
  const filteredPatients = useMemo(() => {
    if (!patients) return [] as PatientListItem[];
    return patients
      .filter(
        (p) =>
          match(q, p.name, p.phone, p.initialChiefComplaint) ||
          p.tags?.some((t) => match(q, t))
      )
      .slice(0, 12);
  }, [patients, q]);

  const rows: Array<{ type: "nav" | "pat"; i: number; key: string }> = useMemo(() => {
    const r: Array<{ type: "nav" | "pat"; i: number; key: string }> = [];
    filteredNav.forEach((n, i) => r.push({ type: "nav", i, key: `n-${n.id}` }));
    filteredPatients.forEach((p, i) => r.push({ type: "pat", i, key: `p-${p.id}` }));
    return r;
  }, [filteredNav, filteredPatients]);

  const go = useCallback(
    (row: (typeof rows)[0]) => {
      if (row.type === "nav") {
        const n = filteredNav[row.i];
        if (n) {
          setOpen(false);
          setQ("");
          router.push(n.href);
        }
        return;
      }
      const p = filteredPatients[row.i];
      if (p) {
        setOpen(false);
        setQ("");
        router.push(`/consultation?patientId=${encodeURIComponent(p.id)}`);
      }
    },
    [filteredNav, filteredPatients, router]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQ("");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(0, rows.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        return;
      }
      if (e.key === "Enter" && rows[active]) {
        e.preventDefault();
        go(rows[active]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, rows, active, go]);

  useEffect(() => {
    setActive((a) => (rows.length ? Math.min(a, rows.length - 1) : 0));
  }, [q, rows.length]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-hs-ink/40 p-4 pt-[12vh] backdrop-blur-[2px] transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false);
          setQ("");
        }
      }}
    >
      <div
        data-no-workspace-shortcuts
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-hs-border/50 bg-hs-paper shadow-2xl transition-transform duration-200"
      >
        <div className="flex items-center gap-2 border-b border-hs-border/35 px-3 py-2.5 sm:px-4">
          <Search className="h-4 w-4 shrink-0 text-hs-text-tertiary" strokeWidth={2.5} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patients, pages, actions…"
            className="min-h-10 w-full border-0 bg-transparent text-sm text-hs-ink placeholder:text-hs-text-tertiary focus:outline-none focus:ring-0"
            autoComplete="off"
            autoCorrect="off"
          />
          <span className="hidden shrink-0 text-[10px] font-medium text-hs-text-tertiary sm:inline">esc</span>
        </div>
        {loadErr ? (
          <p className="border-b border-hs-border/20 px-4 py-2 text-xs text-amber-900/90">{loadErr}</p>
        ) : null}
        <ul className="max-h-[min(60vh,360px)] overflow-y-auto py-2" role="listbox" aria-label="Results">
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-hs-text-secondary">No matches</li>
          ) : null}
          {rows.map((row, idx) => {
            if (row.type === "nav") {
              const n = filteredNav[row.i]!;
              const selected = idx === active;
              const Icon = n.icon;
              return (
                <li key={row.key} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go(row)}
                    className={
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition sm:py-2 " +
                      (selected ? "bg-hs-primary-very-light/90 text-hs-ink" : "text-hs-text-secondary hover:bg-hs-cream/80")
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 text-hs-primary" strokeWidth={2} />
                    <span className="min-w-0 flex-1 font-medium">{n.label}</span>
                    <span className="shrink-0 text-[10px] uppercase text-hs-text-tertiary">{n.group}</span>
                  </button>
                </li>
              );
            }
            const p = filteredPatients[row.i]!;
            const selected = idx === active;
            return (
              <li key={row.key} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(row)}
                  className={
                    "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm transition sm:py-2 " +
                    (selected ? "bg-hs-primary-very-light/90" : "hover:bg-hs-cream/80")
                  }
                >
                  <span className="font-semibold text-hs-ink">{p.name}</span>
                  {p.initialChiefComplaint ? (
                    <span className="line-clamp-1 text-xs text-hs-text-tertiary">{p.initialChiefComplaint}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-hs-border/30 bg-hs-cream/40 px-4 py-2 text-[10px] text-hs-text-tertiary">
          <kbd className="rounded border border-hs-border/50 bg-hs-paper px-1">↑</kbd>{" "}
          <kbd className="rounded border border-hs-border/50 bg-hs-paper px-1">↓</kbd> move ·{" "}
          <kbd className="rounded border border-hs-border/50 bg-hs-paper px-1">enter</kbd> open
        </p>
      </div>
    </div>
  );
}

/**
 * Register global shortcuts: N = new patient, C = consultation hub.
 * Skips when typing in inputs (except where noted).
 */
export function useWorkspaceShortcutNav(): void {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("[data-no-workspace-shortcuts]")) return;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        router.push("/patients/new");
        return;
      }
      if (k === "c") {
        e.preventDefault();
        router.push("/consultation");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [router]);
}
