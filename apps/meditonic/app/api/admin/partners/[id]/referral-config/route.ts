import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../../lib/supabase";
import { BRAND } from "../../../../../../lib/constants";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const { id: partnerId } = await params;

    // 1. Fetch Partner
    const { data: partner, error: partnerError } = await supabase
      .from("mt_partners")
      .select(`
        *,
        mt_partner_applications (
          name,
          email,
          why_partner
        )
      `)
      .eq("id", partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // 2. Fetch Referral Code
    const { data: referralCode } = await supabase
      .from("mt_referral_codes")
      .select("*")
      .eq("partner_id", partnerId)
      .limit(1)
      .maybeSingle();

    // 3. Fetch all active products
    const { data: products, error: prodErr } = await supabase
      .from("mt_products")
      .select("*")
      .eq("is_active", true)
      .eq("status", "PUBLISHED")
      .order("sort_order", { ascending: true });

    // 4. Fetch all active consultations
    const { data: consultations, error: consultErr } = await supabase
      .from("mt_consultation_fees")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    // 5. Fetch referral products mapping if code exists
    const { data: refProducts } = referralCode
      ? await supabase
          .from("mt_referral_products")
          .select("*")
          .eq("referral_code_id", referralCode.id)
      : { data: [] as any[] };

    // 6. Merge products and configurations
    const productConfigs = (products || []).map((p: any) => {
      const existingConfig = (refProducts || []).find((rp: any) => rp.product_id === p.id);
      return {
        db_id: p.id,
        name: p.title,
        product_type: p.product_type,
        price: p.price,
        discount_type: existingConfig ? existingConfig.discount_type : (referralCode?.discount_type || "percentage"),
        discount_value: existingConfig ? Number(existingConfig.discount_value) : Number(referralCode?.discount_value || 10),
        commission_type: existingConfig ? existingConfig.commission_type : "percentage",
        commission_value: existingConfig ? Number(existingConfig.commission_value) : Number(referralCode?.commission_rate || partner.base_commission_rate || 10),
        is_active: existingConfig ? existingConfig.is_active : true,
      };
    });

    const consultationConfigs = (consultations || []).map((c: any) => {
      const existingConfig = (refProducts || []).find((rp: any) => rp.product_id === c.id);
      return {
        db_id: c.id,
        name: c.label || c.type,
        product_type: "consultation",
        price: c.price,
        discount_type: existingConfig ? existingConfig.discount_type : (referralCode?.discount_type || "percentage"),
        discount_value: existingConfig ? Number(existingConfig.discount_value) : Number(referralCode?.discount_value || 10),
        commission_type: existingConfig ? existingConfig.commission_type : "percentage",
        commission_value: existingConfig ? Number(existingConfig.commission_value) : Number(referralCode?.commission_rate || partner.base_commission_rate || 10),
        is_active: existingConfig ? existingConfig.is_active : true,
      };
    });

    const mergedConfigs = [...productConfigs, ...consultationConfigs];

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.mt_partner_applications?.name || "",
        email: partner.mt_partner_applications?.email || "",
        status: partner.status,
        notes: partner.mt_partner_applications?.why_partner || "",
        created_at: partner.created_at,
        updated_at: partner.updated_at,
      },
      referralCode: referralCode
        ? {
            id: referralCode.id,
            code: referralCode.code,
            discount_type: referralCode.discount_type,
            discount_value: referralCode.discount_value,
            commission_rate: referralCode.commission_rate,
            is_active: referralCode.is_active,
          }
        : null,
      configs: mergedConfigs,
    });
  } catch (error: any) {
    console.error("Failed to load partner referral configuration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const { id: partnerId } = await params;
    const body = await req.json();

    const {
      name,
      email,
      status,
      notes,
      referral_code,
      configs, // Array of updated product configs
    } = body;

    // 1. Fetch current Partner and Referral Code
    const { data: partner, error: partnerError } = await supabase
      .from("mt_partners")
      .select("*, mt_partner_applications(*)")
      .eq("id", partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const { data: referralCode } = await supabase
      .from("mt_referral_codes")
      .select("*")
      .eq("partner_id", partnerId)
      .limit(1)
      .maybeSingle();

    // 2. Validate referral code uniqueness across the platform (excluding the partner's own code)
    if (referral_code) {
      const cleanCode = referral_code.trim().toUpperCase();
      const { data: existingCode } = await supabase
        .from("mt_referral_codes")
        .select("id, partner_id")
        .eq("code", cleanCode)
        .neq("partner_id", partnerId)
        .limit(1)
        .maybeSingle();

      if (existingCode) {
        return NextResponse.json({ error: "Referral code already exists and is assigned to another partner." }, { status: 400 });
      }
    }

    // 3. Update mt_partners status
    if (status) {
      await supabase
        .from("mt_partners")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", partnerId);
    }

    // 4. Update partner applications table (name, email, notes)
    if (partner.application_id) {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (notes !== undefined) updateData.why_partner = notes;
      
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("mt_partner_applications")
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq("id", partner.application_id);
      }
    }

    // 5. Update or insert Referral Code
    let codeId = referralCode?.id;
    const cleanCode = referral_code ? referral_code.trim().toUpperCase() : "";

    if (referralCode) {
      await supabase
        .from("mt_referral_codes")
        .update({
          code: cleanCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", referralCode.id);
    } else if (cleanCode) {
      // Create new one if somehow missing
      const { data: newCode } = await supabase
        .from("mt_referral_codes")
        .insert({
          clinic_id: BRAND.clinicId,
          partner_id: partnerId,
          code: cleanCode,
          discount_type: "percentage",
          discount_value: 10,
          is_active: true,
        })
        .select()
        .single();
      codeId = newCode?.id;
    }

    // 6. Save product configurations
    if (codeId && configs && Array.isArray(configs)) {
      // Clean old settings
      await supabase.from("mt_referral_products").delete().eq("referral_code_id", codeId);

      // Insert new settings for overrides
      const overrideInserts = configs.map((cfg: any) => ({
        referral_code_id: codeId,
        product_type: cfg.product_type,
        product_id: cfg.db_id,
        discount_type: cfg.discount_type,
        discount_value: Number(cfg.discount_value),
        commission_type: cfg.commission_type,
        commission_value: Number(cfg.commission_value),
        is_active: cfg.is_active,
      }));

      if (overrideInserts.length > 0) {
        const { error: insErr } = await supabase.from("mt_referral_products").insert(overrideInserts);
        if (insErr) {
          console.error("Failed to insert configs:", insErr);
          return NextResponse.json({ error: "Failed to save product configurations: " + insErr.message }, { status: 500 });
        }
      }
    }

    // 7. Generate change summary
    const summaryLines: string[] = [];
    if (status && status !== partner.status) {
      summaryLines.push(`Status updated to "${status}".`);
    }
    if (referralCode && cleanCode !== referralCode.code) {
      summaryLines.push(`Referral Code updated to "${cleanCode}".`);
    }
    
    const changeSummary = summaryLines.length > 0 ? summaryLines.join(" ") : "Updated product-specific commissions & discounts overrides.";

    return NextResponse.json({
      success: true,
      changeSummary,
    });
  } catch (error: any) {
    console.error("Failed to save referral configurations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
