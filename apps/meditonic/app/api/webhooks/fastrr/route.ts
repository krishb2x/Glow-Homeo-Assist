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

    // Support for standard Shiprocket plain-text webhook tokens or Fastrr HMAC signatures
    const secret = process.env.FASTRR_WEBHOOK_SECRET;
    const plainToken = req.headers.get("x-api-key");
    
    if (secret) {
      if (signature) {
        const expectedSignature = crypto
          .createHmac("sha256", secret)
          .update(payloadString)
          .digest("hex");
          
        if (signature !== expectedSignature) {
          console.error("Fastrr Webhook signature mismatch");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      } else if (plainToken) {
        if (plainToken !== secret) {
          console.error("Shiprocket Webhook token mismatch");
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
      } else {
        console.error("Missing webhook authentication headers");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { event, data } = payload;
    const mtOrderId = data?.order_id || data?.reference_id; // Our internal mt_orders ID

    if (!mtOrderId) {
      console.log("Fastrr Webhook: Received test or malformed payload. Returning 200 to satisfy Shiprocket Test.", payload);
      return NextResponse.json({ success: true, message: "Test payload received successfully" });
    }

    const supabase = createAdminClient();

    // Ensure the order exists
    const { data: dbOrder, error: orderErr } = await supabase
      .from("mt_orders")
      .select("*")
      .eq("id", mtOrderId)
      .single();

    if (orderErr || !dbOrder) {
      console.warn(`Fastrr Webhook: Order ${mtOrderId} not found. Returning 200 to prevent retry loops.`);
      return NextResponse.json({ success: true, warning: "Order not found but accepted payload" });
    }

    if (event === "order.success" || event === "payment.success") {
      
      const paymentMethod = data.payment_method?.toLowerCase() === "cod" ? "cod" : "prepaid";
      const paymentStatus = paymentMethod === "cod" ? "confirmed" : "paid";

      // 1. Update Order Status and Customer Details
      const { error: updateErr } = await supabase
        .from("mt_orders")
        .update({
          status: paymentStatus,
          payment_method: paymentMethod,
          cod_amount_pending: paymentMethod === "cod" ? data.amount : 0,
          customer_name: data.customer?.name || dbOrder.customer_name,
          customer_email: data.customer?.email || dbOrder.customer_email,
          customer_phone: data.customer?.phone || dbOrder.customer_phone,
          shipping_street: data.shipping_address?.street || dbOrder.shipping_street,
          shipping_city: data.shipping_address?.city || dbOrder.shipping_city,
          shipping_state: data.shipping_address?.state || dbOrder.shipping_state,
          shipping_pincode: data.shipping_address?.pincode || dbOrder.shipping_pincode,
          workflow_status: "packing_queue"
        })
        .eq("id", mtOrderId);

      if (updateErr) {
        console.error("Webhook Order Update Error:", updateErr);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
      }

      // 2. Trigger Store Fulfillment Pipeline
      if (dbOrder.fulfillment_status === "unfulfilled" || dbOrder.fulfillment_status === "PENDING") {
        console.log(`[Fastrr Webhook] Triggering fulfillment for order ${mtOrderId}`);
        try {
          await processStoreFulfillment(mtOrderId);
        } catch (fulfillErr) {
          console.error("[Fastrr Webhook] Fulfillment queueing failed:", fulfillErr);
        }
      }

      return NextResponse.json({ success: true, message: "Order processed successfully" });
    }
    
    // Ignore other events
    return NextResponse.json({ success: true, message: `Ignored event type: ${event}` });
    
  } catch (error: any) {
    console.error("Webhook Processing Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
