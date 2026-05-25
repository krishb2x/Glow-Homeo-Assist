"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchDoctorMemos,
  patchDoctorMemo,
  type DoctorMemo,
  type DoctorMemoStatus
} from "../../../lib/doctor-api";
import { friendlyLoadError } from "../../../lib/friendly-error";
import { DoctorMemoCard } from "./DoctorMemoCard";
import { cn } from "../../../lib/cn";
import { DoctorMemoComposer } from "./DoctorMemoComposer";
import { sortMemos } from "./memo-utils";

type Props = {
  patientId?: string;
  consultationId?: string;
  title?: string;
  description?: string;
  maxItems?: number;
  showComposer?: boolean;
  filter?: "open" | "all";
  className?: string;
};

export function DoctorMemoPanel({
  patientId,
  consultationId,
  title = "Operational notes",
  description = "Quick reminders for this visit. Not part of the clinical record.",
  maxItems = 8,
  showComposer = true,
  filter = "open",
  className
}: Props): JSX.Element {
  const [items, setItems] = useState<DoctorMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await fetchDoctorMemos({
        patientId,
        consultationId,
        status: filter as DoctorMemoStatus | "all",
        limit: maxItems
      });
      setItems(sortMemos(list));
    } catch (e) {
      setErr(friendlyLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [patientId, consultationId, filter, maxItems]);

  useEffect(() => {
    void load();
  }, [load]);

  const onComplete = useCallback(
    async (id: string) => {
      await patchDoctorMemo(id, { status: "done" });
      void load();
    },
    [load]
  );

  const onDismiss = useCallback(
    async (id: string) => {
      await patchDoctorMemo(id, { status: "dismissed" });
      void load();
    },
    [load]
  );

  const onTogglePin = useCallback(
    async (id: string, pinned: boolean) => {
      await patchDoctorMemo(id, { pinned });
      void load();
    },
    [load]
  );

  return (
    <section className={cn("ds-card ds-card-pad", className)} aria-label={title}>
      <div className="mb-3">
        <h3 className="font-heading text-body-md font-semibold text-hs-ink">{title}</h3>
        <p className="mt-0.5 text-caption-sm text-hs-text-tertiary">{description}</p>
      </div>

      {showComposer ? (
        <DoctorMemoComposer
          patientId={patientId}
          consultationId={consultationId}
          onCreated={() => void load()}
          className="mb-2"
        />
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 py-3 text-caption-sm text-hs-text-tertiary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : err ? (
        <p className="rounded-lg border border-rose-200/70 bg-rose-50/80 px-2 py-1.5 text-caption-sm text-rose-900">
          {err}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-3 text-caption-sm text-hs-text-tertiary">
          No open notes. Capture a reminder before it slips.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((m) => (
            <li key={m.id}>
              <DoctorMemoCard
                memo={m}
                compact
                onComplete={onComplete}
                onDismiss={onDismiss}
                onTogglePin={onTogglePin}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
