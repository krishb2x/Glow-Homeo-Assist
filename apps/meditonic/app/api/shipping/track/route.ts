import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const contactInfo = searchParams.get("contact"); // Phone number or email

    if (!orderId || !contactInfo) {
      return NextResponse.json({ error: "Missing required fields: orderId and contact info" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch the order to verify owner details
    const { data: order, error: orderErr } = await supabase
      .from("mt_orders")
      .select("id, customer_email, customer_phone")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Secure ownership validation
    const cleanContact = contactInfo.trim().toLowerCase();
    const matchesEmail = order.customer_email?.trim().toLowerCase() === cleanContact;
    const matchesPhone = order.customer_phone?.trim().replace(/\D/g, "") === cleanContact.replace(/\D/g, "");

    if (!matchesEmail && !matchesPhone) {
      return NextResponse.json({ error: "Access denied. Verification credentials do not match order info." }, { status: 403 });
    }

    // 2. Fetch active shipments linked to this order
    const { data: shipments, error: shipmentErr } = await supabase
      .from("mt_shipments")
      .select("id, awb_code, courier_name, tracking_url, estimated_delivery_date, status")
      .eq("order_id", orderId)
      .order("shipment_number", { ascending: true });

    if (shipmentErr || !shipments || shipments.length === 0) {
      return NextResponse.json({
        orderId,
        fulfillmentStatus: "Pending Shipment Creation",
        shipments: []
      });
    }

    // 3. Fetch tracking timeline events for all shipments
    const shipmentIds = shipments.map(s => s.id);
    const { data: events, error: eventsErr } = await supabase
      .from("mt_shipment_events")
      .select("shipment_id, status, description, created_at")
      .in("shipment_id", shipmentIds)
      .order("created_at", { ascending: false });

    const timelineEvents = events || [];

    const formattedShipments = shipments.map(shipment => ({
      id: shipment.id,
      awbCode: shipment.awb_code,
      carrierName: shipment.courier_name,
      trackingUrl: shipment.tracking_url,
      estimatedDeliveryDate: shipment.estimated_delivery_date,
      status: shipment.status,
      timeline: timelineEvents.filter(e => e.shipment_id === shipment.id).map(e => ({
        status: e.status,
        description: e.description,
        timestamp: e.created_at
      }))
    }));

    return NextResponse.json({
      orderId,
      shipments: formattedShipments
    });
  } catch (error: any) {
    console.error("[Tracking API Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
