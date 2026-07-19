import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";
import { processStoreFulfillment } from "../../../../lib/storeFulfillment";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-fastrr-signature");
    const payloadString = await req.text();
    let payload;

    try {
      payload = JSON.parse(payloadString);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify webhook signature if FASTRR_WEBHOOK_SECRET is set
    const secret = process.env.FASTRR_WEBHOOK_SECRET;
    if (secret && signature) {
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(payloadString)
        .digest("hex");
        
      if (generatedSignature !== signature) {
        console.error("Fastrr Webhook signature mismatch");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const { event, data } = payload;
    const mtOrderId = data.order_id || data.reference_id; // Our internal mt_orders ID

    if (!mtOrderId) {
      return NextResponse.json({ error: "Missing order_id in payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Ensure the order exists
    const { data: dbOrder, error: orderErr } = await supabase
      .from("mt_orders")
      .select("*")
      .eq("id", mtOrderId)
      .single();

    if (orderErr || !dbOrder) {
      console.error(`Fastrr Webhook: Order ${mtOrderId} not found.`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (event === "order.success" || event === "payment.success") {
      // 1. Update order status and details captured by Fastrr
      const paymentMethod = data.payment_method?.toLowerCase() === "cod" ? "cod" : "prepaid";
      const paymentStatus = paymentMethod === "cod" ? "confirmed" : "paid";
      
      const { error: updateErr } = await supabase
        .from("mt_orders")
        .update({
          status: paymentStatus,
          payment_method: paymentMethod,
          cod_amount_pending: paymentMethod === "cod" ? data.amount : 0,
          customer_name: data.customer?.name || dbOrder.customer_name,
          customer_email: data.customer?.email || dbOrder.customer_email,
          customer_phone: data.customer?.phone || dbOrder.customer_phone,
          shipping_street: data.shipping_address?.address1 || data.shipping_address?.street || null,
          shipping_city: data.shipping_address?.city || null,
          shipping_state: data.shipping_address?.state || null,
          shipping_pincode: data.shipping_address?.pincode || data.shipping_address?.zip || null,
          workflow_status: "packing_queue",
          provider_order_id: data.fastrr_order_id || null // Store Fastrr's order ID
        })
        .eq("id", mtOrderId);

      if (updateErr) {
        console.error("Fastrr Webhook: Failed to update order status", updateErr);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
      }

      // 2. Trigger Store Fulfillment Pipeline
      if (dbOrder.fulfillment_status === "PENDING") {
        console.log(`[Fastrr Webhook] Triggering fulfillment for order ${mtOrderId}`);
        try {
          await processStoreFulfillment(mtOrderId);
        } catch (fulfillErr) {
          console.error("[Fastrr Webhook] Fulfillment trigger failed:", fulfillErr);
        }
      }
    } else if (event === "order.failed" || event === "payment.failed") {
      await supabase
        .from("mt_orders")
        .update({
          status: "failed",
          workflow_status: "payment_failed"
        })
        .eq("id", mtOrderId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fastrr Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
