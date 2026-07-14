import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const awbCode = payload.awb || payload.awb_code;
    const providerShipmentId = payload.shipment_id ? String(payload.shipment_id) : null;
    const currentStatus = (payload.current_status || "").trim().toUpperCase();
    const explanation = payload.explanation || payload.status_name || `Shipment status updated to: ${currentStatus}`;

    if (!awbCode && !providerShipmentId) {
      return NextResponse.json({ error: "Missing tracking identifiers (awb or shipment_id)" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Locate the active shipment
    let query = supabase.from("mt_shipments").select("id, order_id, status, provider_shipment_id, awb_code");
    if (providerShipmentId) {
      query = query.eq("provider_shipment_id", providerShipmentId);
    } else {
      query = query.eq("awb_code", awbCode);
    }

    const { data: shipment, error: shipmentErr } = await query.maybeSingle();

    if (shipmentErr) {
      console.error("Failed to query shipment for webhook:", shipmentErr);
      return NextResponse.json({ error: "Database error querying shipment" }, { status: 500 });
    }

    if (!shipment) {
      console.log(`[Shiprocket Webhook] No matching shipment found for AWB: ${awbCode}, ID: ${providerShipmentId}`);
      return NextResponse.json({ message: "No matching shipment found. Ignored." }, { status: 200 });
    }

    // 2. Map Shiprocket Status to Standardized Logistics Statuses
    let mappedStatus: string | null = null;

    if (currentStatus.includes("PICK") || currentStatus.includes("AWB GENERATED")) {
      mappedStatus = "READY_TO_SHIP";
    } else if (currentStatus.includes("PICKED UP") || currentStatus.includes("IN TRANSIT") || currentStatus.includes("SHIPPED")) {
      mappedStatus = "IN_TRANSIT";
    } else if (currentStatus.includes("OUT FOR DELIVERY") || currentStatus.includes("OUTFOR_DELIVERY")) {
      mappedStatus = "OUT_FOR_DELIVERY";
    } else if (currentStatus.includes("DELIVERED")) {
      mappedStatus = "DELIVERED";
    } else if (currentStatus.includes("RTO") || currentStatus.includes("UNDELIVERED") || currentStatus.includes("RETURNED")) {
      mappedStatus = "RTO";
    } else if (currentStatus.includes("CANCEL")) {
      mappedStatus = "CANCELLED";
    } else if (currentStatus.includes("FAIL") || currentStatus.includes("REJECT")) {
      mappedStatus = "FAILED";
    }

    if (mappedStatus && mappedStatus !== shipment.status) {
      console.log(`[Shiprocket Webhook] Order ${shipment.order_id}: Updating status from ${shipment.status} to ${mappedStatus}`);

      // Update shipment status
      const { error: updateErr } = await supabase
        .from("mt_shipments")
        .update({
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shipment.id);

      if (updateErr) throw updateErr;

      // Add a timeline tracking event
      await supabase
        .from("mt_shipment_events")
        .insert({
          shipment_id: shipment.id,
          status: mappedStatus,
          provider_status: currentStatus,
          description: explanation,
        });

      // Log the event audit
      await supabase
        .from("mt_shipment_logs")
        .insert({
          shipment_id: shipment.id,
          action: "STATUS_WEBHOOK_UPDATE",
          old_value: shipment.status,
          new_value: mappedStatus,
        });

      // Map Logistics Status to Commerce Order fulfillment_status
      let orderFulfillmentStatus: string | null = null;
      if (mappedStatus === "MANIFESTED" || mappedStatus === "LABEL_GENERATED" || mappedStatus === "READY_TO_SHIP") {
        orderFulfillmentStatus = "PROCESSING";
      } else if (mappedStatus === "IN_TRANSIT" || mappedStatus === "OUT_FOR_DELIVERY") {
        orderFulfillmentStatus = "SHIPPED";
      } else if (mappedStatus === "DELIVERED") {
        orderFulfillmentStatus = "DELIVERED";
      } else if (mappedStatus === "RTO" || mappedStatus === "RETURNED") {
        orderFulfillmentStatus = "RETURNED";
      } else if (mappedStatus === "CANCELLED") {
        orderFulfillmentStatus = "CANCELLED";
      }

      if (orderFulfillmentStatus) {
        const orderUpdates: any = {
          fulfillment_status: orderFulfillmentStatus,
          updated_at: new Date().toISOString(),
        };

        // If the COD order is delivered, it is paid!
        if (mappedStatus === "DELIVERED") {
          const { data: orderDetails } = await supabase
            .from("mt_orders")
            .select("payment_method, total_amount")
            .eq("id", shipment.order_id)
            .single();

          if (orderDetails?.payment_method === "cod" || orderDetails?.payment_method === "partial_cod") {
            orderUpdates.status = "paid";
            orderUpdates.cod_amount_pending = 0;
          }
        }

        await supabase
          .from("mt_orders")
          .update(orderUpdates)
          .eq("id", shipment.order_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Shiprocket Webhook Listener Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
