"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fetchDoctorMemos, patchDoctorMemo, type DoctorMemo } from "../../../lib/doctor-api";
import { DoctorMemoCard } from "./DoctorMemoCard";
import { DoctorMemoComposer } from "./DoctorMemoComposer";
import { sortMemos } from "./memo-utils";

type Props = {
  patientId: string;
  consultationId: string;
};

/**
 * Compact operational-memory strip for the consultation left column.
 * Shows pinned / urgent items first; expandable for full list + quick capture.
 */
export function ConsultationMemoStrip({ patientId, consultationId }: Props): JSX.Element {
  const [items, setItems] = useState<DoctorMemo[]>([]);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const list = await fetchDoctorMemos({
      patientId,
      consultationId,
      status: "open",
      limit: expanded ? 12 : 4
    });
    setItems(sortMemos(list));
  }, [patientId, consultationId, expanded]);

  useEffect(() => {
    void load();
  }, [load]);

  const urgentCount = items.filter((m) => m.priority === "urgent" || m.overdue || m.pinned).length;

  return (
    <div className="shrink-0 border-b border-hs-border/30 bg-hs-cream/30 px-3 py-2.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-hs-text-tertiary">
          Visit notes
          {urgentCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
              {urgentCount}
            </span>
          ) : null}
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-hs-text-tertiary" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-hs-text-tertiary" aria-hidden />
        )}
      </button>

      {!expanded && items.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {items.slice(0, 2).map((m) => (
            <li key={m.id}>
              <DoctorMemoCard
                memo={m}
                compact
                onComplete={async (id) => {
                  await patchDoctorMemo(id, { status: "done" });
                  void load();
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {expanded ? (
        <div className="mt-2 space-y-2">
          <DoctorMemoComposer
            patientId={patientId}
            consultationId={consultationId}
            placeholder="Reminder for this visit…"
            onCreated={() => void load()}
          />
          {items.length === 0 ? (
            <p className="text-[10px] text-hs-text-tertiary">Nothing flagged for this patient yet.</p>
          ) : (
            <ul className="max-h-[220px] space-y-1 overflow-y-auto pr-0.5">
              {items.map((m) => (
                <li key={m.id}>
                  <DoctorMemoCard
                    memo={m}
                    compact
                    onComplete={async (id) => {
                      await patchDoctorMemo(id, { status: "done" });
                      void load();
                    }}
                    onDismiss={async (id) => {
                      await patchDoctorMemo(id, { status: "dismissed" });
                      void load();
                    }}
                    onTogglePin={async (id, pinned) => {
                      await patchDoctorMemo(id, { pinned });
                      void load();
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1.5 text-[10px] font-semibold text-hs-primary hover:underline"
        >
          {items.length > 0 ? `View all (${items.length})` : "Add visit note"}
        </button>
      )}
    </div>
  );
}
