"use client";

import { useCallback, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createDoctorMemo, type DoctorMemoKind, type DoctorMemoPriority } from "../../../lib/doctor-api";
import { friendlyLoadError } from "../../../lib/friendly-error";
import { defaultDueForKind } from "./memo-utils";

type Props = {
  patientId?: string;
  consultationId?: string;
  defaultKind?: DoctorMemoKind;
  placeholder?: string;
  onCreated?: () => void;
  className?: string;
};

export function DoctorMemoComposer({
  patientId,
  consultationId,
  defaultKind = "note",
  placeholder = "Quick note or reminder…",
  onCreated,
  className
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DoctorMemoKind>(defaultKind);
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<DoctorMemoPriority>("normal");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onKindChange = useCallback((k: DoctorMemoKind) => {
    setKind(k);
    if (k === "reminder" || k === "follow_up") {
      setDueAt(defaultDueForKind(k));
    } else {
      setDueAt("");
    }
  }, []);

  const submit = useCallback(async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await createDoctorMemo({
        body: text,
        kind,
        patientId,
        consultationId,
        dueAt:
          kind === "reminder" || kind === "follow_up"
            ? dueAt
              ? new Date(dueAt).toISOString()
              : new Date(defaultDueForKind(kind)).toISOString()
            : undefined,
        priority,
        pinned
      });
      setBody("");
      setDueAt("");
      setPriority("normal");
      setPinned(false);
      setOpen(false);
      onCreated?.();
    } catch (e) {
      setErr(friendlyLoadError(e));
    } finally {
      setBusy(false);
    }
  }, [body, busy, kind, patientId, consultationId, dueAt, priority, pinned, onCreated]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-hs-border/50 bg-hs-cream/40 px-3 py-2 text-caption-sm font-semibold text-hs-primary transition hover:border-hs-primary/40 hover:bg-hs-paper " +
          (className ?? "")
        }
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add note
      </button>
    );
  }

  return (
    <div
      className={
        "rounded-xl border border-hs-border/35 bg-hs-paper p-3 shadow-ds-sm " + (className ?? "")
      }
    >
      <div className="mb-2 flex flex-wrap gap-1">
        {(["note", "reminder", "follow_up"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKindChange(k)}
            className={
              "rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition " +
              (kind === k
                ? "bg-hs-primary text-white"
                : "bg-hs-cream/70 text-hs-text-secondary hover:text-hs-ink")
            }
          >
            {k === "follow_up" ? "Follow-up" : k === "reminder" ? "Reminder" : "Note"}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={placeholder}
        autoFocus
        className="w-full resize-none rounded-lg border border-hs-border/40 bg-hs-surface px-2.5 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/12"
      />
      {(kind === "reminder" || kind === "follow_up") && (
        <label className="mt-2 block text-[10px] font-medium text-hs-text-tertiary">
          Due
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="mt-0.5 block w-full rounded-lg border border-hs-border/40 px-2 py-1 text-caption-sm"
          />
        </label>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-caption-sm">
          <label className="flex cursor-pointer items-center gap-1.5 text-hs-text-secondary">
            <input
              type="checkbox"
              checked={priority === "urgent"}
              onChange={(e) => setPriority(e.target.checked ? "urgent" : "normal")}
              className="h-3.5 w-3.5 accent-hs-primary"
            />
            Urgent
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-hs-text-secondary">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-3.5 w-3.5 accent-hs-primary"
            />
            Pin
          </label>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setErr(null);
            }}
            className="rounded-lg px-2 py-1 text-caption-sm font-medium text-hs-text-secondary hover:text-hs-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !body.trim()}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1 rounded-lg bg-hs-primary px-3 py-1 text-caption-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            Save
          </button>
        </div>
      </div>
      {err ? <p className="mt-1.5 text-[10px] text-rose-800">{err}</p> : null}
    </div>
  );
}
