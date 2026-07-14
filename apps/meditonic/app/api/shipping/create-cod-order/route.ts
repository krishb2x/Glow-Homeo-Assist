import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";
import { BRAND } from "../../../../lib/constants";
import { processStoreFulfillment } from "../../../../lib/storeFulfillment";

export async function POST(req: Request) {
  try {
    const { amount, items, contact, referralCode, shippingAddress } = await req.json();

    if (!amount || !items || !contact || !shippingAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Create mt_orders record directly as "confirmed" (waiting for shipping/processing)
    const { data: dbOrder, error } = await supabase
      .from("mt_orders")
      .insert({
        clinic_id: BRAND.clinicId,
        customer_name: contact.name,
        customer_email: contact.email,
        customer_phone: contact.phone,
        total_amount: amount,
        status: "confirmed", // Placed but unpaid (COD)
        payment_method: "cod",
        cod_amount_pending: amount,
        fulfillment_status: "PENDING",
        items: items, // CartItem[]
        utm_source: items[0]?.utm_source || null,
        utm_campaign: items[0]?.utm_campaign || null,
        audit_log: referralCode ? [{ action: 'applied_referral', code: referralCode, timestamp: new Date().toISOString() }] : [],
        shipping_street: shippingAddress.street || null,
        shipping_city: shippingAddress.city || null,
        shipping_state: shippingAddress.state || null,
        shipping_pincode: shippingAddress.pincode || null,
        shipping_landmark: shippingAddress.landmark || null,
        workflow_status: "packing_queue"
      })
      .select()
      .single();

    if (error) {
      console.error("DB COD Order Creation Error:", error);
      return NextResponse.json({ error: "Failed to create DB order" }, { status: 500 });
    }

    // 2. Trigger store fulfillment pipeline asynchronously
    try {
      console.log(`[COD Order API] Triggering fulfillment for order ${dbOrder.id}`);
      await processStoreFulfillment(dbOrder.id);
    } catch (fulfillErr) {
      console.error("[COD Order API] Fulfillment queueing failed:", fulfillErr);
      // Do not block client response; order is already saved and can be synced manually/automatically later
    }

    return NextResponse.json({
      success: true,
      mtOrderId: dbOrder.id
    });
  } catch (error: any) {
    console.error("Create COD Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
