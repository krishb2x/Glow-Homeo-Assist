import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ForwardResult, MarketingLeadPayload } from "./intake-request-server";

function supabaseUrl(): string | null {
  const u =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return u && u.length > 0 ? u : null;
}

function serviceRoleKey(): string | null {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

/** When true, POST /api/request persists rows without calling Express. */
export function shouldPersistMarketingLeadViaSupabase(): boolean {
  return Boolean(supabaseUrl() && serviceRoleKey());
}

export function createMarketingLeadSupabaseClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Insert into public.marketing_lead_requests (same shape as Express /public/marketing-lead).
 * Requires `20260428000000_marketing_lead_requests.sql` and `20260503100000_marketing_leads_workspace.sql` on the project.
 */
export async function insertMarketingLeadViaSupabase(payload: MarketingLeadPayload): Promise<ForwardResult> {
  const client = createMarketingLeadSupabaseClient();
  if (!client) {
    return { ok: false, status: 503, error: "Server configuration incomplete." };
  }

  const { error } = await client.from("marketing_lead_requests").insert({
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim().toLowerCase(),
    clinic_name: payload.clinicName.trim(),
    city: payload.city.trim(),
    message: payload.message && payload.message.trim().length > 0 ? payload.message.trim() : null,
    intent: payload.intent
  });

  if (error) {
    const code = (error as { code?: string }).code;
    const missingTable = code === "42P01" || error.message?.includes("marketing_lead_requests");
    return {
      ok: false,
      status: 500,
      error: missingTable
        ? "Database table missing. Apply the marketing_lead_requests migration in Supabase, then retry."
        : "Could not save your request. Please try again or email care@glowhomeo.in."
    };
  }

  return { ok: true };
}
