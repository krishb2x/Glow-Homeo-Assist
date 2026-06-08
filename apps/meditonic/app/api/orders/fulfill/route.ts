import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'}/download/${item.product.id}?signature=${Date.now()}`
      }));

    const physicalItems = items.filter((item: any) => item.product.type === 'hardcopy');

    // Send Email
    let emailHtml = `<h1>Thank you for your order, ${order.customer_name}!</h1>`;
    emailHtml += `<p>Your order (ID: ${order.id}) has been confirmed.</p>`;
    
    if (downloadLinks.length > 0) {
      emailHtml += `<h2>Your Digital Downloads</h2><ul>`;
      downloadLinks.forEach((link: any) => {
        emailHtml += `<li><a href="${link.url}">${link.title}</a> (Link expires in 7 days)</li>`;
      });
      emailHtml += `</ul>`;
    }

    if (physicalItems.length > 0) {
      emailHtml += `<h2>Physical Deliveries</h2><p>The following items will be delivered to your address within 5-7 days:</p><ul>`;
      physicalItems.forEach((item: any) => {
        emailHtml += `<li>${item.product.title}</li>`;
      });
      emailHtml += `</ul>`;
    }

    // Try to send email
    try {
      await resend.emails.send({
        from: "MediTonic <noreply@meditonic.com>",
        to: order.customer_email,
        subject: "Your MediTonic Order is Confirmed",
        html: emailHtml,
      });
    } catch (emailErr) {
      console.error("Failed to send fulfillment email:", emailErr);
      // We continue, marking as fulfilled in DB might still be valid, or we could mark as 'paid_but_email_failed'
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
