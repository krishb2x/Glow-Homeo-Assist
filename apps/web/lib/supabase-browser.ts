import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client (anon key). Used for email/password, invite recovery, and password reset.
 * Session is persisted so PKCE / magic-link flows survive redirects to `/auth/callback` → `/update-password`.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowser is client-only");
  }
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  client = createClient(url, anon, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: "homeosync-supabase-auth"
    }
  });
  return client;
}

/**
 * Resolves the public site URL for redirects (must be listed in Supabase Auth URL configuration).
 * Prefer NEXT_PUBLIC_SITE_URL in production; in the browser, fall back to the current origin.
 */
export function getPublicSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/** End Supabase browser session; safe if client cannot be created. */
export function signOutSupabaseClient(): void {
  if (typeof window === "undefined") return;
  try {
    void getSupabaseBrowser().auth.signOut();
  } catch {
    // Missing env in misconfigured dev — ha_token cleanup still happens in clearClientSession
  }
}
