import { NextRequest, NextResponse } from "next/server";
import {
  buildMarketingLeadPayload,
  forwardToMarketingLead,
  parseIntakeBody
} from "../../../lib/intake-request-server";
import {
  insertMarketingLeadViaSupabase,
  shouldPersistMarketingLeadViaSupabase
} from "../../../lib/marketing-lead-supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/request — public intake (walkthrough or guided trial).
 *
 * Persistence (first match wins):
 * 1. **Supabase** — if `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) are set
 *    on the Next server, rows are inserted into `public.marketing_lead_requests` directly (no Express).
 * 2. **Express** — otherwise forwards to `{API_URL}/public/marketing-lead` (local dev with API running).
 *
 * Supabase: apply `20260428000000_marketing_lead_requests.sql` and `20260503100000_marketing_leads_workspace.sql`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false as const, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseIntakeBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ success: false as const, error: parsed.error }, { status: parsed.status });
  }

  const payload = buildMarketingLeadPayload(parsed);

  const result = shouldPersistMarketingLeadViaSupabase()
    ? await insertMarketingLeadViaSupabase(payload)
    : await forwardToMarketingLead(payload);

  if (!result.ok) {
    return NextResponse.json({ success: false as const, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true as const });
}
