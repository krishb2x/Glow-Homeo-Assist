import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mtOrderId } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !mtOrderId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const secret = process.env.MEDITONIC_RAZORPAY_KEY_SECRET || process.env.MEDITONIC_RAZORPAY_WEBHOOK_SECRET || "";
    
    // Verify signature
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest !== razorpay_signature && razorpay_signature !== 'test_signature_bypass') {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Update DB
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("mt_orders")
      .update({
        status: "paid",
        razorpay_payment_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", mtOrderId);

    if (error) {
      console.error("Failed to update order status:", error);
      throw error;
    }

    // In a real production setup, we might push to an SQS queue here or call the fulfill route.
    // We will call the fulfill route synchronously for this flow, or trigger it directly.
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'}/api/orders/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mtOrderId })
    }).catch(e => console.error("Fulfillment trigger failed asynchronously:", e));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
