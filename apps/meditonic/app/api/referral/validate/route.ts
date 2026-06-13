import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";
import { BRAND } from "../../../../lib/constants";
import { isReferralApplicable } from "../../../../lib/referrals/product-mapping";

async function validateReferral(code: string | null, items?: any[]) {
  if (!code) {
    return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const clinicId = BRAND.clinicId;

  // Fetch the code using wildcards to gracefully support schema transitions
  const { data: referralCode, error } = await supabase
    .from("mt_referral_codes")
    .select(`
      *,
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

  console.log("DEBUG SCENARIO D:", {
    max_uses: referralCode.max_uses,
    usage_limit: referralCode.usage_limit,
    current_uses: referralCode.current_uses,
    current_usage: referralCode.current_usage,
    valid_until: referralCode.valid_until,
    end_date: referralCode.end_date
  });
  
  // Check start validity (supporting both new valid_from and legacy start_date)
  const validFromVal = referralCode.valid_from !== undefined && referralCode.valid_from !== null ? referralCode.valid_from : referralCode.start_date;
  const validFrom = validFromVal ? new Date(validFromVal) : null;
  if (validFrom && validFrom > now) {
    return NextResponse.json({ error: "Referral code is not yet active" }, { status: 400 });
  }

  // Check expiration (supporting both new valid_until and legacy end_date)
  const validUntilVal = referralCode.valid_until !== undefined && referralCode.valid_until !== null ? referralCode.valid_until : referralCode.end_date;
  const validUntil = validUntilVal ? new Date(validUntilVal) : null;
  if (validUntil && validUntil < now) {
    return NextResponse.json({ error: "Referral code has expired" }, { status: 400 });
  }

  // Check usage limits (supporting both new max_uses and legacy usage_limit)
  const maxUses = referralCode.max_uses !== undefined && referralCode.max_uses !== null ? referralCode.max_uses : referralCode.usage_limit;
  const currentUses = referralCode.current_uses !== undefined && referralCode.current_uses !== null
    ? Math.max(referralCode.current_uses, referralCode.current_usage || 0)
    : (referralCode.current_usage || 0);
  if (maxUses !== undefined && maxUses !== null && currentUses >= maxUses) {
    return NextResponse.json({ error: "Referral code usage limit reached" }, { status: 400 });
  }

  // Check if applicable to the items in the cart
  if (items && items.length > 0 && referralCode.mt_referral_products && referralCode.mt_referral_products.length > 0) {
    // Find at least one eligible item
    const isApplicable = items.some((item: any) => {
      const productType = item.product.product_type; // e.g. 'EBOOK', 'COURSE', 'BUNDLE'
      return referralCode.mt_referral_products.some((p: any) => {
        if (isReferralApplicable(p.product_type, productType)) return true;
        if (p.product_id === item.product.id) return true;
        return false;
      });
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
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const productType = url.searchParams.get("productType");
    const productId = url.searchParams.get("productId");
    
    // Construct items array if productType query param is present
    const items = productType 
      ? [{ product: { id: productId || "", product_type: productType }, quantity: 1 }] 
      : [];

    return await validateReferral(code, items);
  } catch (error: any) {
    console.error("Referral validation GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { code, items } = await req.json();
    return await validateReferral(code, items);
  } catch (error: any) {
    console.error("Referral validation POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
