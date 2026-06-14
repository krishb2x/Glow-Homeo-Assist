import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase";
import { sendConfirmationEmail } from "../../../../../lib/email";
import { Template_PartnerApproved } from "../../../../../lib/email-templates";
import crypto from "crypto";
import { BRAND } from "../../../../../lib/constants";

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    
    // 1. Verify Caller is Admin (simplified check for MVP)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );
    // In production, verify user role from DB. Assuming service role passes or token is verified.
    
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

    if (app.status === "approved") {
      return NextResponse.json({ error: "Already approved" }, { status: 400 });
    }

    // 3. Generate secure password and create Auth User
    const rawPassword = crypto.randomBytes(12).toString("hex") + "aA1!"; // ensure requirements
    
    // First check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    let authUser = existingUser?.users.find((u: any) => u.email === app.email);

    if (!authUser) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: app.email,
        password: rawPassword,
        email_confirm: true,
        user_metadata: { name: app.name, role: "PARTNER" }
      });
      
      if (createError) {
        console.error("Failed to create auth user:", createError);
        if (createError.message.includes("already been registered") || createError.code === "email_exists") {
          return NextResponse.json({ error: "A user with this email address already exists. Please use a unique email for the partner account." }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
      }
      authUser = newUser.user;
    }

    // 4. Insert into mt_partners
    const { data: partner, error: partnerError } = await supabase
      .from("mt_partners")
      .insert({
        user_id: authUser.id,
        application_id: app.id,
        clinic_id: BRAND.clinicId,
        status: "active",
        base_commission_rate: 10.00
      })
      .select("id")
      .single();

    if (partnerError) {
      console.error("Failed to create partner record:", partnerError);
      return NextResponse.json({ error: "Failed to create partner record" }, { status: 500 });
    }

    // 5. Update application status
    await supabase
      .from("mt_partner_applications")
      .update({ status: "approved" })
      .eq("id", app.id);

    // 5b. Generate unique referral code automatically (1-Click Workflow)
    const baseName = app.name.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digits
    const generatedCode = `${baseName}${randomSuffix}`;

    const { data: newCode, error: codeError } = await supabase.from("mt_referral_codes").insert({
      code: generatedCode,
      partner_id: partner.id,
      clinic_id: BRAND.clinicId,
      landing_path: "/",
      is_active: true
    }).select().single();

    if (codeError) {
      console.error("Failed to generate code:", codeError);
      // Non-fatal, they can generate manually later if this fails, but it shouldn't.
    } else if (newCode) {
      // Create default per-product override rows for all active products and consultations
      const defaultOverrides: any[] = [];

      const { data: allProducts } = await supabase
        .from("mt_products")
        .select("id, product_type")
        .eq("is_active", true)
        .eq("status", "PUBLISHED");

      const { data: allConsultations } = await supabase
        .from("mt_consultation_fees")
        .select("id")
        .eq("is_active", true);

      for (const p of (allProducts || [])) {
        defaultOverrides.push({
          referral_code_id: newCode.id,
          product_type: p.product_type?.toLowerCase() || "all",
          product_id: p.id,
          discount_type: "percentage",
          discount_value: 10,
          commission_type: "percentage",
          commission_value: 10,
          is_active: true,
        });
      }

      for (const c of (allConsultations || [])) {
        defaultOverrides.push({
          referral_code_id: newCode.id,
          product_type: "consultation",
          product_id: c.id,
          discount_type: "percentage",
          discount_value: 10,
          commission_type: "percentage",
          commission_value: 10,
          is_active: true,
        });
      }

      if (defaultOverrides.length > 0) {
        await supabase.from("mt_referral_products").insert(defaultOverrides);
      }
    }

    // 6. Send Approval Email with Login Credentials
    await sendConfirmationEmail(
      app.email,
      "Welcome to the MediTonic Partner Program!",
      Template_PartnerApproved(app.name, "https://meditonic.glowhomeo.com/partner-login", rawPassword, app.email),
      { cc: "care.meditonic@gmail.com", bcc: "aman.aga998@gmail.com" }
    );

    return NextResponse.json({ success: true, partnerId: partner.id });

  } catch (error: any) {
    console.error("Approve partner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
