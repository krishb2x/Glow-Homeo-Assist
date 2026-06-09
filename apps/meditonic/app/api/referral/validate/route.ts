import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const { code, items } = await req.json();

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

    // Check if applicable to the items in the cart
    if (items && items.length > 0 && referralCode.mt_referral_products && referralCode.mt_referral_products.length > 0) {
      // Find at least one eligible item
      const isApplicable = items.some((item: any) => {
        const itemType = item.product.category; // e.g. 'ebooks', 'consultation', 'program'
        return referralCode.mt_referral_products.some(
          (p: any) => p.product_type === 'all' || p.product_type === itemType || p.product_id === item.product.id
        );
      });
      
      if (!isApplicable) {
        return NextResponse.json({ error: "This code is not valid for any items in your cart." }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      id: referralCode.id,
      code: referralCode.code,
      discountType: referralCode.discount_type,
      discountValue: referralCode.discount_value,
      applicableProducts: referralCode.mt_referral_products || []
    });

  } catch (error: any) {
    console.error("Referral validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
