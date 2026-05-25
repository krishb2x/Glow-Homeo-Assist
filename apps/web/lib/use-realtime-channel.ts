"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "./supabase-browser";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

type Options<TPayload> = {
  /** Set to false to skip subscribing (e.g. while still loading auth). */
  enabled?: boolean;
  /** Postgres table name. */
  table: string;
  /** Postgres `schema.table` filter expression, e.g. `clinic_id=eq.<uuid>`. */
  filter?: string;
  /** Which event to subscribe to. Defaults to `*`. */
  event?: RealtimeEvent;
  /** Channel name suffix (defaults to table; deduplicated by Supabase realtime). */
  channelKey?: string;
  /** Called when a matching change is received. */
  onChange: (payload: { new: TPayload | null; old: TPayload | null; eventType: string }) => void;
};

/**
 * Tiny wrapper around Supabase Realtime postgres_changes. Safe to call from
 * any client component — silently no-ops if Supabase is misconfigured (so it
 * never breaks the page if env vars are missing in a dev box).
 *
 * NOTE: requires the target table to have realtime enabled in Supabase (RLS
 * still applies — patient data is automatically scoped by the same policies
 * that protect the REST endpoints).
 */
export function useRealtimeChannel<TPayload>({
  enabled = true,
  table,
  filter,
  event = "*",
  channelKey,
  onChange
}: Options<TPayload>): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let supabase;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      return; // missing env — silently disable realtime
    }
    const key = `${channelKey ?? table}:${filter ?? "all"}:${event}`;
    // Cast to a permissive shape — supabase-js Realtime types for
    // `postgres_changes` are union-narrowed in a way that the generic
    // `on('postgres_changes', filter, cb)` form doesn't infer cleanly.
    type LooseChannel = {
      on: (...args: unknown[]) => LooseChannel;
      subscribe: () => unknown;
    };
    const channel = (supabase.channel(key) as unknown as LooseChannel)
      .on(
        "postgres_changes",
        { event, schema: "public", table, ...(filter ? { filter } : {}) },
        (payload: { new: TPayload | null; old: TPayload | null; eventType: string }) => {
          onChange(payload);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0]);
    };
  }, [enabled, table, filter, event, channelKey, onChange]);
}
