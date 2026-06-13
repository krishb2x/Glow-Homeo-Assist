export const maxDuration = 300; // Allow up to 5 minutes for large PDF processing
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient, createPublicClient } from "../../../../../../lib/supabase";
import { sendConfirmationEmail } from "../../../../../../lib/email";
import { Template_StoreProductDelivery } from "../../../../../../lib/email-templates";
import { deliverPdfs, DeliveryItem } from "../../../../../../lib/pdf/deliveryService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Authenticate Admin
    const authClient = createPublicClient();
    
    const { data: { user }, error: authError } = await authClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 2. Fetch Order
    const { data: order, error } = await supabase
      .from("mt_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = order.items || [];
    let digitalItems: DeliveryItem[] = [];

    // 3. Extract digital items and bundle children
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
          requires_watermark: latestProduct?.metadata?.requires_watermark !== false,
        });
      } else if (p.product_type === 'BUNDLE' || p.is_bundle) {
        const { data: bundleRels } = await supabase
          .from("mt_product_relationships")
          .select(`
            related_product_id,
            mt_products!mt_product_relationships_related_product_id_fkey (
              id, title, slug, stock_status, metadata
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
                requires_watermark: childProduct.metadata?.requires_watermark !== false,
              });
            }
          }
        }
      }
    }

    if (digitalItems.length === 0) {
      return NextResponse.json({ error: "Order does not contain any digital items" }, { status: 400 });
    }

    const physicalItems = items.filter((item: any) => item.product.product_type === 'PHYSICAL_BOOK' || item.product.product_type === 'TREATMENT_KIT');

    // 4. Send request to Railway Background Worker
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
          return NextResponse.json({ error: `Railway background worker rejected the request (Status ${workerRes.status}). Ensure WORKER_SECRET matches. Details: ${errText.slice(0, 100)}` }, { status: 500 });
        }
        
        // Consume the response body to ensure the fetch stream is closed and Lambda doesn't hang
        await workerRes.text();
        console.log("[Railway Worker] Successfully triggered PDF background generation.");
      } catch (e: any) {
        console.error("Failed to trigger background PDF worker:", e);
        return NextResponse.json({ error: `Failed to connect to the background PDF worker: ${e.message}. (URL used: ${workerUrl})` }, { status: 500 });
      }
    } else {
      // 5. If no digital items, send confirmation email immediately
      try {
        const emailResult = await sendConfirmationEmail(
          order.customer_email,
          `Your MediTonic Order #${order.id.slice(0, 8)}`,
          Template_StoreProductDelivery(order.customer_name, order.id, [], physicalItems, false)
        );
        
        if (!emailResult.success) {
          throw new Error(typeof emailResult.error === 'string' ? emailResult.error : JSON.stringify(emailResult.error));
        }
      } catch (emailErr: any) {
        console.error("Failed to send product delivery email:", emailErr);
        return NextResponse.json({ error: `Failed to send email: ${emailErr.message}` }, { status: 500 });
      }
    }

    // 6. Update Audit Log
    const adminUser = user.user_metadata?.first_name || user.email || "Admin";
    const auditEntry = {
      action: "Resent Delivery Email",
      timestamp: new Date().toISOString(),
      user: adminUser
    };
    const newAuditLog = [...(order.audit_log || []), auditEntry];

    await supabase
      .from("mt_orders")
      .update({ 
        fulfillment_status: "fulfilled",
        audit_log: newAuditLog,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    return NextResponse.json({ success: true, message: digitalItems.length > 0 ? "Background processing started" : "Email sent", audit_log: newAuditLog });
  } catch (error: any) {
    console.error("Resend Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
