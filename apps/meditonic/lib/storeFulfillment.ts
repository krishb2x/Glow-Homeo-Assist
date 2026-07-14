import { createAdminClient } from "../lib/supabase";
import { sendConfirmationEmail } from "../lib/email";
import { Template_StoreProductDelivery, Template_StoreAdminNotification } from "../lib/email-templates";
import { deliverPdfs, DeliveryItem } from "../lib/pdf/deliveryService";

export async function processStoreFulfillment(mtOrderId: string) {
  const supabase = createAdminClient();
  
  // Fetch order
  const { data: order, error } = await supabase
    .from("mt_orders")
    .select("*")
    .eq("id", mtOrderId)
    .single();

  if (error || !order) {
    throw new Error("Order not found");
  }

  if (order.fulfillment_status === 'fulfilled') {
    console.log(`Order ${mtOrderId} is already fulfilled. Skipping.`);
    return { success: true, already_fulfilled: true };
  }

  if (order.status !== 'paid' && order.payment_method !== 'cod') {
    throw new Error("Order is not paid");
  }

  const items = order.items || [];
  
  // Extract digital items
  let digitalItems: DeliveryItem[] = [];

  for (const item of items) {
    const p = item.product;
    if (p.product_type === 'EBOOK' || p.product_type === 'COURSE') {
      const { data: latestProduct } = await supabase
        .from("mt_products")
        .select("metadata")
        .eq("id", p.id)
        .single();
        
      digitalItems.push({
        product_id: p.id,
        title: p.title,
        slug: p.slug,
        stock_status: p.stock_status,
        summary: p.summary || p.description,
        requires_watermark: latestProduct?.metadata?.requires_watermark !== false,
      });
    } else if (p.product_type === 'BUNDLE' || p.is_bundle) {
      // Fetch bundle items from relationships
      const { data: bundleRels } = await supabase
        .from("mt_product_relationships")
        .select(`
          related_product_id,
          mt_products!mt_product_relationships_related_product_id_fkey (
            id, title, slug, stock_status, description, metadata
          )
        `)
        .eq("product_id", p.id)
        .eq("relationship_type", "bundle_item");

      if (bundleRels) {
        for (const rel of bundleRels) {
          const childProduct = rel.mt_products as any;
          if (childProduct) {
            digitalItems.push({
              product_id: childProduct.id,
              title: childProduct.title,
              slug: childProduct.slug,
              stock_status: childProduct.stock_status,
              summary: childProduct.description,
              requires_watermark: childProduct.metadata?.requires_watermark !== false,
            });
          }
        }
      }
    }
  }

  const physicalItems = items.filter((item: any) => item.product.product_type === 'PHYSICAL_BOOK' || item.product.product_type === 'TREATMENT_KIT');

  if (physicalItems.length > 0) {
    // 1. Verify stock status
    for (const item of physicalItems) {
      if (item.product.stock_status === 'OUT_OF_STOCK') {
        console.warn(`[Fulfillment Warning] Product ${item.product.id} is out of stock, continuing sync anyway.`);
      }
    }

    // 2. Fetch default pickup warehouse location
    const { data: location } = await supabase
      .from("mt_shipping_locations")
      .select("id")
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();

    // 3. Fetch default enabled logistics provider
    const { data: providerConfig } = await supabase
      .from("mt_logistics_providers")
      .select("provider")
      .eq("enabled", true)
      .eq("default_provider", true)
      .limit(1)
      .maybeSingle();

    const providerName = providerConfig?.provider || "shiprocket";

    // 4. Create local mt_shipments record (sync_status = PENDING)
    const { data: shipment, error: shipErr } = await supabase
      .from("mt_shipments")
      .insert({
        clinic_id: order.clinic_id,
        order_id: order.id,
        shipment_number: 1,
        pickup_location_id: location?.id || null,
        provider: providerName,
        status: "PENDING",
        sync_status: "PENDING"
      })
      .select("id")
      .maybeSingle();

    if (shipErr || !shipment) {
      console.error("[Fulfillment Error] Failed to create local shipment record:", shipErr);
    } else {
      // 5. Log creation audit event
      await supabase.from("mt_shipment_logs").insert({
        shipment_id: shipment.id,
        action: "CREATED"
      });

      // 6. Trigger background async Shiprocket sync (fire-and-forget)
      (async () => {
        try {
          const { syncShipmentToProvider } = await import("./logistics/sync");
          await syncShipmentToProvider(shipment.id);
        } catch (syncErr: any) {
          console.error(`[Fulfillment Sync Trigger Failed] Shipment: ${shipment.id}, Error:`, syncErr.message);
        }
      })();
    }
  }

  // Send request to Railway Background Worker
  if (digitalItems.length > 0) {
    let workerUrl = process.env.RAILWAY_WORKER_URL || "http://localhost:4000";
    if (!workerUrl.startsWith("http")) workerUrl = `https://${workerUrl}`;
    try {
      const workerRes = await fetch(`${workerUrl}/internal/pdf-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": process.env.WORKER_SECRET || "",
        },
        body: JSON.stringify({
          orderId: order.id,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          digitalItems,
          physicalItems,
          date: order.created_at,
        }),
      });
      if (!workerRes.ok) {
        const errText = await workerRes.text();
        console.error(`[Railway Worker Error] Status: ${workerRes.status}, Body: ${errText}`);
      } else {
        console.log(`[Railway Worker] Successfully triggered PDF background generation for order ${order.id}.`);
      }
    } catch (e: any) {
      console.error(`Failed to trigger background PDF worker for order ${order.id}:`, e.message);
    }
  } else {
    // If no digital items, send confirmation email immediately
    try {
      await sendConfirmationEmail(
        order.customer_email,
        `Your MediTonic Order #${order.id.slice(0, 8)}`,
        Template_StoreProductDelivery(order.customer_name, order.id, [], physicalItems, false)
      );
    } catch (emailErr) {
      console.error("Failed to send product delivery email:", emailErr);
    }
  }

  // Send Email #3: Admin Notification
  try {
    // Send to both admin addresses
    const adminEmails = ["care.meditonic@gmail.com", "aman.aga998@gmail.com"];
    for (const adminEmail of adminEmails) {
      await sendConfirmationEmail(
        adminEmail,
        `New Store Order: #${order.id.slice(0, 8)}`,
        Template_StoreAdminNotification(order, [], physicalItems) // digital links will be sent later
      );
    }
  } catch (adminErr) {
    console.error("Failed to send admin notification email:", adminErr);
  }

  // Update fulfillment_status
  const hasPhysical = physicalItems.length > 0;
  const targetFulfillmentStatus = hasPhysical ? "PROCESSING" : "fulfilled";

  await supabase
    .from("mt_orders")
    .update({ 
      fulfillment_status: targetFulfillmentStatus,
      updated_at: new Date().toISOString() 
    })
    .eq("id", mtOrderId);

  return { success: true, fulfilled: !hasPhysical };
}
