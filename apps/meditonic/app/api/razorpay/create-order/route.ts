import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "../../../../lib/supabase";
import { BRAND } from "../../../../lib/constants";

export async function POST(req: Request) {
  try {
    const { amount, items, contact, referralCode, shippingAddress, paymentMethod, codAmountPending, partialCodDeposited } = await req.json();

    if (!amount || !items || !contact) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const rzp = new Razorpay({
      key_id: process.env.MEDITONIC_RAZORPAY_KEY_ID || "",
      key_secret: process.env.MEDITONIC_RAZORPAY_KEY_SECRET || "",
    });

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);

    // Create mt_orders record (pending)
    const supabase = createAdminClient();
    const { data: dbOrder, error } = await supabase
      .from("mt_orders")
      .insert({
        clinic_id: BRAND.clinicId,
        customer_name: contact.name,
        customer_email: contact.email,
        customer_phone: contact.phone,
        razorpay_order_id: order.id,
        total_amount: paymentMethod === 'partial_cod' ? (amount + (codAmountPending || 0)) : amount, // Store the FULL order total value (deposit + remaining)
        status: "pending",
        payment_method: paymentMethod || "prepaid",
        cod_amount_pending: codAmountPending || 0,
        partial_cod_deposited: partialCodDeposited || 0,
        items: items, // CartItem[]
        // Pick utm_source from the first item if exists
        utm_source: items[0]?.utm_source || null,
        utm_campaign: items[0]?.utm_campaign || null,
        audit_log: referralCode ? [{ action: 'applied_referral', code: referralCode, timestamp: new Date().toISOString() }] : [],
        // Physical Shipping Address details
        shipping_street: shippingAddress?.street || null,
        shipping_city: shippingAddress?.city || null,
        shipping_state: shippingAddress?.state || null,
        shipping_pincode: shippingAddress?.pincode || null,
        shipping_landmark: shippingAddress?.landmark || null,
        workflow_status: shippingAddress ? 'packing_queue' : null
      })
      .select()
      .single();

    if (error) {
      console.error("DB Order Error:", error);
      throw new Error("Failed to create DB order");
    }

    return NextResponse.json({
      orderId: order.id,
      mtOrderId: dbOrder.id,
      keyId: process.env.MEDITONIC_RAZORPAY_KEY_ID || ""
    });
  } catch (error: any) {
    console.error("Create Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
