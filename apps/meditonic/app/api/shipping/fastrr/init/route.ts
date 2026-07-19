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

    // 2. Call Shiprocket Fastrr API to generate checkout session
    const fastrrApiUrl = process.env.FASTRR_API_URL || "https://api.shiprocket.in/v1/external/fastrr/init";
    
    // Fastrr uses the standard Shiprocket bearer token
    const { ShiprocketProvider } = await import("../../../../../lib/logistics/shiprocket");
    const shiprocket = new ShiprocketProvider();
    const fastrrApiKey = await shiprocket.getAuthToken(); 

    // Transform items to Fastrr format
    const fastrrItems = items.map((item: any) => ({
      id: item.product.id,
      name: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image_url: item.product.image_url,
      type: item.product.product_type
    }));

    // Generate full callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const payload = {
      order_id: dbOrder.id,
      amount: amount,
      currency: "INR",
      items: fastrrItems,
      return_url: `${baseUrl}/payment-success?order_id=${dbOrder.id}`,
      cancel_url: `${baseUrl}/store`,
      customer: contact || undefined,
      discount_code: discountInfo?.code || undefined
    };

    let checkoutUrl = "";
    
    if (fastrrApiKey) {
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
           throw new Error(`Fastrr API Error: ${await response.text()}`);
        }

        const data = await response.json();
        checkoutUrl = data.checkout_url || data.url;
    } else {
        // Fallback for development if Fastrr is not configured
        console.warn("FASTRR_API_KEY missing. Mocking Fastrr Checkout URL.");
        checkoutUrl = `/payment-success?order_id=${dbOrder.id}&mock_fastrr=true`;
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      mtOrderId: dbOrder.id
    });
  } catch (error: any) {
    console.error("Create Fastrr Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
