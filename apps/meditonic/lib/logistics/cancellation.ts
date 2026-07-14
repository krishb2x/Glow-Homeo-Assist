import { createAdminClient } from "../supabase";
import { getLogisticsProvider } from "./index";

export async function cancelOrderShipments(orderId: string, performedBy?: string) {
  const supabase = createAdminClient();
  console.log(`[Cancellation Service] Request to cancel shipments for order: ${orderId}`);

  try {
    // 1. Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from("mt_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    // 2. Fetch active shipments for this order (not already cancelled)
    const { data: shipments, error: shipErr } = await supabase
      .from("mt_shipments")
      .select("*")
      .eq("order_id", orderId)
      .neq("status", "CANCELLED");

    if (shipErr) throw shipErr;

    if (!shipments || shipments.length === 0) {
      console.log(`No active shipments found to cancel for order: ${orderId}`);
    } else {
      for (const shipment of shipments) {
        console.log(`Cancelling shipment: ${shipment.id} (Provider: ${shipment.provider})`);

        // A. Cancel on provider (e.g. Shiprocket)
        let providerCancelled = false;
        if (shipment.provider_order_id) {
          try {
            const provider = getLogisticsProvider(shipment.provider);
            providerCancelled = await provider.cancelShipment(shipment.provider_order_id);
            console.log(`Provider cancellation result for order ${shipment.provider_order_id}: ${providerCancelled}`);
          } catch (provErr: any) {
            console.error(`Failed to cancel shipment on provider:`, provErr.message);
          }
        }

        // B. Update local shipment status
        const { error: updateErr } = await supabase
          .from("mt_shipments")
          .update({
            status: "CANCELLED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", shipment.id);

        if (updateErr) throw updateErr;

        // C. Log timeline events
        await supabase
          .from("mt_shipment_events")
          .insert({
            shipment_id: shipment.id,
            status: "CANCELLED",
            description: providerCancelled 
              ? "Shipment cancelled successfully both locally and on logistics provider dashboard."
              : "Shipment cancelled locally. Provider cancel pending or processed manually.",
          });

        // D. Write admin audit log
        await supabase
          .from("mt_shipment_logs")
          .insert({
            shipment_id: shipment.id,
            action: "CANCELLED",
            performed_by: performedBy || null,
            old_value: shipment.status,
            new_value: "CANCELLED",
          });
      }
    }

    // 3. Release local inventory / log inventory release
    console.log(`[Cancellation Service] Releasing inventory stock levels for order items:`, order.items);

    // 4. Update order state to CANCELLED
    const { error: orderUpdateErr } = await supabase
      .from("mt_orders")
      .update({
        fulfillment_status: "CANCELLED",
        status: order.payment_method === "cod" ? "failed" : order.status, // COD orders are marked failed if cancelled before payment
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderUpdateErr) throw orderUpdateErr;

    console.log(`[Cancellation Service] Order ${orderId} shipments successfully cancelled.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Cancellation Service Error] Failed to cancel order: ${orderId}`, error);
    throw error;
  }
}
