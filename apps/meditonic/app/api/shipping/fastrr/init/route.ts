import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase";
import { BRAND } from "../../../../../lib/constants";

export async function POST(req: Request) {
  try {
    const { items, amount, discountInfo, contact } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. Create a "PENDING" order in our DB to track this checkout attempt
    const supabase = createAdminClient();
    
    // We can pre-fill customer info if available, otherwise it's null
    const { data: dbOrder, error } = await supabase
      .from("mt_orders")
      .insert({
        clinic_id: BRAND.clinicId,
        customer_name: contact?.name || "Pending Fastrr Customer",
        customer_email: contact?.email || "pending@fastrr.com",
        customer_phone: contact?.phone || "0000000000",
        total_amount: amount,
        status: "pending",
        payment_method: "prepaid", // Valid placeholder, webhook overwrites this
        fulfillment_status: "unfulfilled",
        items: items,
        audit_log: [{ action: 'fastrr_checkout_initiated', timestamp: new Date().toISOString() }],
        workflow_status: "checkout_pending"
      })
      .select()
      .single();

    if (error) {
      console.error("DB Order Creation Error:", error);
      return NextResponse.json({ error: "Failed to create DB order" }, { status: 500 });
    }

    // 2. Fetch the Fastrr configuration from Environment Variables
    const fastrrApiUrl = process.env.FASTRR_API_URL;
    const fastrrApiKey = process.env.FASTRR_API_KEY;

    if (!fastrrApiUrl || !fastrrApiKey) {
      console.error("Fastrr API credentials missing");
      return NextResponse.json({ error: "Checkout configuration missing on server" }, { status: 500 });
    }

    // 3. Construct the payload for Fastrr
    const payload = {
      order_id: dbOrder.id,
      amount: amount,
      currency: "INR",
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://meditonic.glowhomeo.com"}/payment-success?order_id=${dbOrder.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://meditonic.glowhomeo.com"}/store`,
      customer: {
        name: contact?.name || "",
        email: contact?.email || "",
        phone: contact?.phone || "",
      },
      items: items.map((item: any) => ({
        id: item.product.id,
        name: item.product.title,
        price: item.price,
        quantity: item.quantity,
        sku: item.product.sku || "",
        image_url: item.product.cover_image || ""
      }))
    };

    // 4. Initialize Checkout Session with Fastrr
    try {
      const response = await fetch(fastrrApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${fastrrApiKey}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Fastrr API Error:", errText);
        return NextResponse.json({ error: "Failed to initialize checkout with provider" }, { status: 500 });
      }

      const responseData = await response.json();
      
      // Fastrr usually returns a redirect URL (e.g. data.redirect_url or data.url)
      const redirectUrl = responseData.data?.redirect_url || responseData.redirect_url || responseData.url;

      if (!redirectUrl) {
        console.error("No redirect URL returned by Fastrr:", responseData);
        return NextResponse.json({ error: "Invalid response from provider" }, { status: 500 });
      }

      return NextResponse.json({ success: true, redirectUrl });

    } catch (apiError: any) {
      console.error("Fastrr Fetch Error:", apiError);
      return NextResponse.json({ error: "Failed to connect to checkout provider" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Fastrr Init Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
