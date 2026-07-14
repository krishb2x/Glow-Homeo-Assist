import { createAdminClient } from "../supabase";
import { getLogisticsProvider } from "./index";
import { ShipmentInput } from "./types";

export async function syncShipmentToProvider(shipmentId: string) {
  const supabase = createAdminClient();
  console.log(`[Shipment Sync Worker] Starting sync for shipment: ${shipmentId}`);

  try {
    // 1. Fetch shipment
    const { data: shipment, error: shipmentErr } = await supabase
      .from("mt_shipments")
      .select("*")
      .eq("id", shipmentId)
      .single();

    if (shipmentErr || !shipment) {
      throw new Error(`Shipment ${shipmentId} not found in database.`);
    }

    // 2. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("mt_orders")
      .select("*")
      .eq("id", shipment.order_id)
      .single();

    if (orderErr || !order) {
      throw new Error(`Order ${shipment.order_id} linked to shipment not found.`);
    }

    // Update sync state to processing
    await supabase
      .from("mt_shipments")
      .update({
        sync_status: "RETRYING",
        retry_count: shipment.retry_count + 1,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", shipment.id);

    // 3. Fetch pickup location
    const { data: location, error: locErr } = await supabase
      .from("mt_shipping_locations")
      .select("*")
      .eq("id", shipment.pickup_location_id)
      .single();

    const pickupName = location?.shiprocket_pickup_name || "MAIN";

    // 4. Query physical products for accurate dimensions/weights
    const physicalItems = (order.items || []).filter((item: any) =>
      item.product.product_type === "PHYSICAL_BOOK" ||
      item.product.product_type === "TREATMENT_KIT"
    );

    if (physicalItems.length === 0) {
      throw new Error("No physical products found in this order.");
    }

    const productIds = physicalItems.map((item: any) => item.product.id);
    const { data: dbProducts } = await supabase
      .from("mt_products")
      .select("id, weight_grams, length_cm, width_cm, height_cm, hsn_code")
      .in("id", productIds);

    const productMetricsMap = new Map<string, any>();
    (dbProducts || []).forEach(p => {
      productMetricsMap.set(p.id, p);
    });

    // 5. Calculate cumulative package size and weights
    let totalWeightGrams = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    const shipmentItems = physicalItems.map((item: any) => {
      const dbProduct = productMetricsMap.get(item.product.id) || {};
      const weight = Number(dbProduct.weight_grams || item.product.weight_grams || 500);
      const length = Number(dbProduct.length_cm || item.product.length_cm || 15);
      const width = Number(dbProduct.width_cm || item.product.width_cm || 15);
      const height = Number(dbProduct.height_cm || item.product.height_cm || 5);

      totalWeightGrams += weight * item.quantity;
      maxLength = Math.max(maxLength, length);
      maxWidth = Math.max(maxWidth, width);
      totalHeight += height * item.quantity; // Stack items

      return {
        name: item.product.title,
        sku: item.product.slug,
        price: Number(item.product.price),
        quantity: item.quantity,
        weightGrams: weight,
        hsn: dbProduct.hsn_code || "4901",
      };
    });

    const finalLength = maxLength || 15;
    const finalWidth = maxWidth || 15;
    const finalHeight = totalHeight || 5;

    // 6. Build Shipment Input
    const shipmentInput: ShipmentInput = {
      orderId: order.id,
      orderNumber: `MT-${order.id.split("-")[0].toUpperCase()}`,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      street: order.shipping_street || "",
      landmark: order.shipping_landmark || "",
      city: order.shipping_city || "",
      state: order.shipping_state || "",
      pincode: order.shipping_pincode || "",
      items: shipmentItems,
      isCod: order.payment_method === "cod" || order.payment_method === "partial_cod",
      codAmount: Number(order.cod_amount_pending || 0),
      pickupLocationName: pickupName,
      totalWeightGrams,
      lengthCm: finalLength,
      widthCm: finalWidth,
      heightCm: finalHeight,
    };

    // 7. Call provider API
    const provider = getLogisticsProvider(shipment.provider);
    const result = await provider.createShipment(shipmentInput);

    // 8. Update DB on Success
    const { error: updateErr } = await supabase
      .from("mt_shipments")
      .update({
        provider_order_id: result.providerOrderId,
        provider_shipment_id: result.providerShipmentId,
        awb_code: result.awbCode || null,
        courier_name: result.courierName || null,
        label_url: result.labelUrl || null,
        invoice_url: result.invoiceUrl || null,
        status: result.status,
        sync_status: "SUCCESS",
        last_error: null,
      })
      .eq("id", shipment.id);

    if (updateErr) throw updateErr;

    // Insert timeline tracking event
    await supabase
      .from("mt_shipment_events")
      .insert({
        shipment_id: shipment.id,
        status: result.status,
        description: result.awbCode
          ? `Order synchronized successfully. Airway bill AWB: ${result.awbCode} generated via ${result.courierName}.`
          : "Order synchronized successfully on Shiprocket. Courier assignment pending.",
      });

    // Log success
    await supabase
      .from("mt_shipment_logs")
      .insert({
        shipment_id: shipment.id,
        action: "SYNC_SUCCESS",
        new_value: result.status,
      });

    console.log(`[Shipment Sync Worker] Sync success for shipment: ${shipmentId}`);
  } catch (error: any) {
    console.error(`[Shipment Sync Worker Failed] ID: ${shipmentId}, Error:`, error.message);

    // Update state to failed
    await supabase
      .from("mt_shipments")
      .update({
        sync_status: "FAILED",
        last_error: error.message,
      })
      .eq("id", shipmentId);

    // Log failure audit
    await supabase
      .from("mt_shipment_logs")
      .insert({
        shipment_id: shipmentId,
        action: "SYNC_FAILURE",
        old_value: "PENDING",
        new_value: error.message.substring(0, 200),
      });
  }
}
