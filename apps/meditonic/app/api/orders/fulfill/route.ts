import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendConfirmationEmail } from "@/lib/email";
import { Template_StoreProductDelivery, Template_StoreAdminNotification } from "@/lib/email-templates";
import { deliverPdfs, DeliveryItem } from "@/lib/pdf/deliveryService";

export async function POST(req: Request) {
  try {
    const { mtOrderId } = await req.json();

    if (!mtOrderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Fetch order
    const { data: order, error } = await supabase
      .from("mt_orders")
      .select("*")
      .eq("id", mtOrderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== 'paid') {
      return NextResponse.json({ error: "Order is not paid" }, { status: 400 });
    }

    const items = order.items || [];
    
    // Extract digital items
    let digitalItems: DeliveryItem[] = [];

    for (const item of items) {
      const p = item.product;
      if (p.product_type === 'EBOOK' || p.product_type === 'COURSE') {
        digitalItems.push({
          product_id: p.id,
          title: p.title,
          slug: p.slug,
          stock_status: p.stock_status
        });
      } else if (p.product_type === 'BUNDLE' || p.is_bundle) {
        // Fetch bundle items from relationships
        const { data: bundleRels } = await supabase
          .from("mt_product_relationships")
          .select(`
            related_product_id,
            mt_products!mt_product_relationships_related_product_id_fkey (
              id, title, slug, stock_status
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
                stock_status: childProduct.stock_status
              });
            }
          }
        }
      }
    }

    // Deliver PDFs
    const deliveredPdfs = await deliverPdfs(order, digitalItems);

    // Map to the format expected by the email template
    const downloadLinks = deliveredPdfs.map(pdf => ({
      title: pdf.title,
      url: pdf.downloadUrl
    }));

    // Update database with delivery URLs
    if (deliveredPdfs.length > 0) {
      await supabase
        .from("mt_orders")
        .update({ 
          pdf_delivered: true, 
          pdf_urls: deliveredPdfs.map(i => ({ title: i.title, url: i.downloadUrl, s3Key: i.s3Key }))
        })
        .eq("id", mtOrderId);
    }

    const physicalItems = items.filter((item: any) => item.product.product_type === 'PHYSICAL_BOOK' || item.product.product_type === 'TREATMENT_KIT');

    // Send Email #2: Product Delivery to Customer
    try {
      await sendConfirmationEmail(
        order.customer_email,
        "Your MediTonic Order is Ready!",
        Template_StoreProductDelivery(order.customer_name, order.id, downloadLinks, physicalItems)
      );
    } catch (emailErr) {
      console.error("Failed to send product delivery email:", emailErr);
    }

    // Send Email #3: Admin Notification
    try {
      // Send to both admin addresses
      const adminEmails = ["care.meditonic@gmail.com", "aman.aga998@gmail.com"];
      for (const adminEmail of adminEmails) {
        await sendConfirmationEmail(
          adminEmail,
          `New Store Order: #${order.id.slice(0, 8)}`,
          Template_StoreAdminNotification(order, downloadLinks, physicalItems)
        );
      }
    } catch (adminErr) {
      console.error("Failed to send admin notification email:", adminErr);
    }

    // Update status to fulfilled
    await supabase
      .from("mt_orders")
      .update({ status: "fulfilled", updated_at: new Date().toISOString() })
      .eq("id", mtOrderId);

    return NextResponse.json({ success: true, fulfilled: true });
  } catch (error: any) {
    console.error("Fulfillment Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
