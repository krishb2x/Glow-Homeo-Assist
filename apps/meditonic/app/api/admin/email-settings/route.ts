import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";

const CLINIC_ID = "595cd444-e89c-4d1f-b31f-27f76f59e0d7";

async function verifyAdmin(req: Request) {
  const supabase = createAdminClient();
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  // Check role in profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role;
  if (role !== "super_admin") {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  return { ok: true, user, supabase };
}

export async function GET(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data, error } = await supabase
      .from("mt_email_settings")
      .select("*")
      .eq("clinic_id", CLINIC_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      // Return defaults if somehow not seeded yet
      const defaults = {
        clinic_id: CLINIC_ID,
        provider: "ses",
        resend_api_key: "",
        default_cc: "",
        default_bcc: "",
        enable_consultation_confirmed: true,
        enable_store_product_delivery: true,
        enable_partner_application_received: true,
        enable_partner_approved: true,
        enable_partner_payout_processed: true,
        enable_partner_rejected: true,
      };
      return NextResponse.json({ settings: defaults });
    }

    return NextResponse.json({ settings: data });
  } catch (error: any) {
    console.error("GET email settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

    const {
      provider,
      resend_api_key,
      default_cc,
      default_bcc,
      enable_consultation_confirmed,
      enable_store_product_delivery,
      enable_partner_application_received,
      enable_partner_approved,
      enable_partner_payout_processed,
      enable_partner_rejected,
    } = body;

    // Validate provider
    if (provider && !["ses", "resend", "smtp"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider selection" }, { status: 400 });
    }

    const upsertData = {
      clinic_id: CLINIC_ID,
      provider: provider || "ses",
      resend_api_key: resend_api_key !== undefined ? (resend_api_key?.trim() || null) : undefined,
      default_cc: default_cc !== undefined ? (default_cc?.trim() || null) : undefined,
      default_bcc: default_bcc !== undefined ? (default_bcc?.trim() || null) : undefined,
      enable_consultation_confirmed: enable_consultation_confirmed !== undefined ? Boolean(enable_consultation_confirmed) : undefined,
      enable_store_product_delivery: enable_store_product_delivery !== undefined ? Boolean(enable_store_product_delivery) : undefined,
      enable_partner_application_received: enable_partner_application_received !== undefined ? Boolean(enable_partner_application_received) : undefined,
      enable_partner_approved: enable_partner_approved !== undefined ? Boolean(enable_partner_approved) : undefined,
      enable_partner_payout_processed: enable_partner_payout_processed !== undefined ? Boolean(enable_partner_payout_processed) : undefined,
      enable_partner_rejected: enable_partner_rejected !== undefined ? Boolean(enable_partner_rejected) : undefined,
      updated_at: new Date().toISOString(),
    };

    // Clean up undefined keys so they don't overwrite with null or default
    Object.keys(upsertData).forEach((key) => {
      if ((upsertData as any)[key] === undefined) {
        delete (upsertData as any)[key];
      }
    });

    const { data, error } = await supabase
      .from("mt_email_settings")
      .upsert(upsertData, { onConflict: "clinic_id" })
      .select()
      .single();

    if (error) {
      console.error("UPSERT email settings error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error: any) {
    console.error("POST email settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
