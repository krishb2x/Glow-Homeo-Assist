import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";
import { sendConfirmationEmail } from "../../../../lib/email";
import { Template_PartnerApplication } from "../../../../lib/email-templates";
import { BRAND } from "../../../../lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();
    const clinicId = BRAND.clinicId;

    const {
      name, email, mobile, profession,
      instagramUrl, youtubeUrl, websiteUrl,
      audienceSize, city, state, whyPartner
    } = body;

    // Insert Application
    const { error } = await supabase
      .from("mt_partner_applications")
      .insert({
        clinic_id: clinicId,
        name,
        email,
        mobile,
        profession,
        instagram_url: instagramUrl || null,
        youtube_url: youtubeUrl || null,
        website_url: websiteUrl || null,
        audience_size: audienceSize || null,
        city,
        state,
        why_partner: whyPartner || null,
        status: "pending"
      });

    if (error) {
      console.error("Failed to submit partner application:", error);
      return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
    }

    // 3. Send Confirmation Email
    await sendConfirmationEmail(
      email,
      "Application Received - MediTonic Partner Program",
      Template_PartnerApplication(name),
      { cc: "care.meditonic@gmail.com", bcc: "aman.aga998@gmail.com" }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Partner application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
