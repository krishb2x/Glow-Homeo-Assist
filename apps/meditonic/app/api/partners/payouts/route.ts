import { NextResponse } from "next/server";
import { createAdminClient, createPublicClient } from "../../../../lib/supabase";

export async function GET(req: Request) {
  try {
    const authClient = createPublicClient();
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized - Session missing" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    // Fetch partner details for this user
    const { data: partner, error: partnerError } = await supabase
      .from("mt_partners")
      .select("id")
      .eq("user_id", user.id)
      .single();
      
    if (partnerError || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    
    // Fetch payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from("mt_partner_payouts")
      .select("*")
      .eq("partner_id", partner.id)
      .order("paid_at", { ascending: false });
      
    if (payoutsError) {
      console.error("Fetch payouts error:", payoutsError);
      return NextResponse.json({ error: "Failed to fetch payouts: " + payoutsError.message }, { status: 550 });
    }
    
    return NextResponse.json({ payouts: payouts || [] });
  } catch (err: any) {
    console.error("Payout get endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
export async function POST(req: Request) {
  return NextResponse.json({ error: "Method not allowed. Payouts are monthly and initiated by the Admin." }, { status: 405 });
}
