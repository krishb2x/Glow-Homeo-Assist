import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase";
import { BRAND } from "../../../../../lib/constants";
import crypto from "crypto";

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
    const fastrrApiUrl = process.env.FASTRR_API_URL || "https://checkout-api.shiprocket.com/api/v1/access-token/checkout";
    const fastrrApiKey = process.env.FASTRR_API_KEY;
    const fastrrSecretKey = process.env.FASTRR_SECRET_KEY;

    if (!fastrrApiKey || !fastrrSecretKey) {
      console.warn("Fastrr API credentials missing. Returning mock redirect URL for testing.");
      return NextResponse.json({ 
        success: true, 
        mock: true,
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/payment-success?order_id=${dbOrder.id}`
      });
    }

    // 3. Construct the payload for Fastrr
    const payload = {
      cart_data: {
        items: items.map((item: any) => ({
          variant_id: item.product.id,
          quantity: item.quantity
        }))
      },
      redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/payment-success?order_id=${dbOrder.id}`,
      timestamp: new Date().toISOString()
    };

    // 4. Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac("sha256", fastrrSecretKey);
    hmac.update(JSON.stringify(payload));
    const calculatedHmac = hmac.digest("base64");

    // 5. Call Fastrr API
    try {
      const response = await fetch(fastrrApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": fastrrApiKey,
          "X-Api-HMAC-SHA256": calculatedHmac
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Fastrr API Error:", responseData);
        return NextResponse.json({ error: "Failed to initialize checkout with provider", details: responseData }, { status: 500 });
      }
      
      const token = responseData.result?.token || responseData.token;

      if (!token) {
        console.error("No token returned by Fastrr:", responseData);
        return NextResponse.json({ error: "Invalid response from provider" }, { status: 500 });
      }

      return NextResponse.json({ success: true, token });

    } catch (apiError: any) {
      console.error("Fastrr Fetch Error:", apiError);
      return NextResponse.json({ error: "Failed to connect to checkout provider" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Fastrr Init Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
