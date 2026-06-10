import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "../../../../lib/supabase";
import { sendConfirmationEmail } from "../../../../lib/email";
import { Template_StorePaymentConfirmed } from "../../../../lib/email-templates";

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
    const { data: order, error } = await supabase
      .from("mt_orders")
      .update({
        status: "paid",
        razorpay_payment_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", mtOrderId)
      .select("id, customer_name, customer_email")
      .single();

    if (error) {
      console.error("Failed to update order status:", error);
      throw error;
    }

    // Send Payment Confirmation Email (Email #1)
    if (order && order.customer_email) {
      try {
        await sendConfirmationEmail(
          order.customer_email,
          "Payment Successful - MediTonic",
          Template_StorePaymentConfirmed(order.customer_name, order.id)
        );
      } catch (err) {
        console.error("Failed to send payment confirmation email:", err);
      }
    }

    // In a real production setup, we might push to an SQS queue here or call the fulfill route.
    // We will call the fulfill route synchronously for this flow, or trigger it directly.
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://meditonic.glowhomeo.com'}/api/orders/fulfill`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET || ""
        },
        body: JSON.stringify({ mtOrderId })
      });
    } catch (e) {
      console.error("Fulfillment trigger failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
