import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthClaims } from "./auth";
import { supabaseAdmin, createSupabaseUserClient } from "./supabase";

/** RLS user client, or service role when `claims.bypass` (local dev only). */
export function getDb(claims: AuthClaims): SupabaseClient {
  if (claims.bypass) {
    return supabaseAdmin;
  }
  return createSupabaseUserClient(claims.accessToken);
}
