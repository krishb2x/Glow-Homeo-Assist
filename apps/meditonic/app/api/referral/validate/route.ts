import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const productType = searchParams.get("productType"); // 'consultation', 'program', 'ebook', 'course'

    if (!code) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const clinicId = BRAND.clinicId;

    // Fetch the code
    const { data: referralCode, error } = await supabase
      .from("mt_referral_codes")
      .select(`
        id,
        partner_id,
        code,
        discount_type,
        discount_value,
        is_active,
        start_date,
        end_date,
        usage_limit,
        current_usage,
        mt_referral_products (
          product_type,
          product_id
        )
      `)
      .eq("clinic_id", clinicId)
      .ilike("code", code)
      .single();

    if (error || !referralCode) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    if (!referralCode.is_active) {
      return NextResponse.json({ error: "Referral code is inactive" }, { status: 400 });
    }

    const now = new Date();
    if (referralCode.start_date && new Date(referralCode.start_date) > now) {
      return NextResponse.json({ error: "Referral code is not yet active" }, { status: 400 });
    }

    if (referralCode.end_date && new Date(referralCode.end_date) < now) {
      return NextResponse.json({ error: "Referral code has expired" }, { status: 400 });
    }

    if (referralCode.usage_limit && referralCode.current_usage >= referralCode.usage_limit) {
      return NextResponse.json({ error: "Referral code usage limit reached" }, { status: 400 });
    }

    // Check if applicable to the product type
    if (productType && referralCode.mt_referral_products && referralCode.mt_referral_products.length > 0) {
      const isApplicable = referralCode.mt_referral_products.some(
        (p: any) => p.product_type === 'all' || p.product_type === productType
      );
      if (!isApplicable) {
        return NextResponse.json({ error: `Code is not applicable for ${productType}s` }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      id: referralCode.id,
      code: referralCode.code,
      discountType: referralCode.discount_type,
      discountValue: referralCode.discount_value,
    });

  } catch (error: any) {
    console.error("Referral validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
