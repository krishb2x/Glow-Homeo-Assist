import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase";
import { sendConfirmationEmail } from "../../../../../lib/email";
import { Template_PartnerRejected } from "../../../../../lib/email-templates";

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    
    // 1. Verify Caller is Admin (simplified check for MVP)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );
    
    const body = await req.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    // 2. Fetch Application
    const { data: app, error: appError } = await supabase
      .from("mt_partner_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // 3. Update application status
    await supabase
      .from("mt_partner_applications")
      .update({ status: "rejected" })
      .eq("id", app.id);

    // 4. Send Email
    await sendConfirmationEmail(
      app.email,
      "Update on your MediTonic Partner Application",
      Template_PartnerRejected(app.name),
      { cc: "care.meditonic@gmail.com", bcc: "aman.aga998@gmail.com" }
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Reject partner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
