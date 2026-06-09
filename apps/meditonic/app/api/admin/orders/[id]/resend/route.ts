import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase";
import { sendConfirmationEmail } from "@/lib/email";
import { Template_StoreProductDelivery } from "@/lib/email-templates";
import { deliverPdfs, DeliveryItem } from "@/lib/pdf/deliveryService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Authenticate Admin
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    );

    const { data: { session } } = await authSupabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for database writes to bypass RLS since we verified admin session
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
        digitalItems.push({
          product_id: p.id,
          title: p.title,
          slug: p.slug,
          stock_status: p.stock_status
        });
      } else if (p.product_type === 'BUNDLE' || p.is_bundle) {
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

    if (digitalItems.length === 0) {
      return NextResponse.json({ error: "Order does not contain any digital items" }, { status: 400 });
    }

    // 4. Regenerate and Deliver PDFs
    const deliveredPdfs = await deliverPdfs(order, digitalItems);

    const downloadLinks = deliveredPdfs.map(pdf => ({
      title: pdf.title,
      url: pdf.downloadUrl
    }));

    if (deliveredPdfs.length > 0) {
      // Update URLs in database
      await supabase
        .from("mt_orders")
        .update({ 
          pdf_delivered: true, 
          pdf_urls: deliveredPdfs.map(i => ({ title: i.title, url: i.downloadUrl, s3Key: i.s3Key }))
        })
        .eq("id", id);
    }

    const physicalItems = items.filter((item: any) => item.product.product_type === 'PHYSICAL_BOOK' || item.product.product_type === 'TREATMENT_KIT');

    // 5. Send Email
    try {
      await sendConfirmationEmail(
        order.customer_email,
        "Your Resent MediTonic Order Links",
        Template_StoreProductDelivery(order.customer_name, order.id, downloadLinks, physicalItems)
      );
    } catch (emailErr) {
      console.error("Failed to send product delivery email:", emailErr);
      return NextResponse.json({ error: "Failed to send email, but PDFs were generated." }, { status: 500 });
    }

    // 6. Update Audit Log
    const adminUser = session.user.user_metadata?.first_name || session.user.email || "Admin";
    const auditEntry = {
      action: "Resent Delivery Email",
      timestamp: new Date().toISOString(),
      user: adminUser
    };
    const newAuditLog = [...(order.audit_log || []), auditEntry];

    await supabase
      .from("mt_orders")
      .update({ audit_log: newAuditLog })
      .eq("id", id);

    return NextResponse.json({ success: true, links: downloadLinks, audit_log: newAuditLog });
  } catch (error: any) {
    console.error("Resend Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
