"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

/**
 * When Supabase refreshes the access token, mirror it to `ha_token` so the Express API keeps working.
 * Does not clear `ha_token` when there is no Supabase session (legacy API-only session).
 */
export function SupabaseSessionSync(): null {
  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseBrowser> | null = null;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      return;
    }
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        localStorage.setItem("ha_token", session.access_token);
      }
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem("ha_token", session.access_token);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
