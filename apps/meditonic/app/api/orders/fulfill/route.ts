import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendConfirmationEmail } from "@/lib/email";
import { Template_StoreProductDelivery, Template_StoreAdminNotification } from "@/lib/email-templates";

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
    
    // In a real app, generate signed URLs from S3/R2 for digital products.
    // For this mockup, we generate fake signed URLs based on the product.
    const downloadLinks = items
      .filter((item: any) => item.product.type === 'ebook' || item.product.type === 'course')
      .map((item: any) => ({
        title: item.product.title,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meditonic.glowhomeo.com'}/download/${item.product.id}?signature=${Date.now()}`
      }));

    const physicalItems = items.filter((item: any) => item.product.type === 'hardcopy');

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
