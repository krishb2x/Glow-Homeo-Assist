import { createAdminClient } from "../../../lib/supabase";
import { formatPrice, formatDate } from "../../../lib/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: orders, count, error } = await supabase
      .from("mt_orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error });
    }

    const results = (orders || []).map(order => {
      const types = new Set(
        (Array.isArray(order.items) ? order.items : [])
          .map((i: any) => i?.product?.product_type || i?.product?.type || 'UNKNOWN')
      );
      const typeLabels = Array.from(types).join(", ");
      
      return {
        id: order.id,
        rpId: order.razorpay_order_id || (order.id && order.id.split('-')[0]) || 'UNKNOWN',
        date: formatDate(order.created_at),
        name: order.customer_name,
        email: order.customer_email,
        itemsLen: order.items?.length || 0,
        typeLabels,
        price: formatPrice(order.total_amount)
      };
    });

    return NextResponse.json({ success: true, count, results });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      message: err.message, 
      stack: err.stack,
      envKeys: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "PRESENT" : "MISSING"
      }
    });
  }
}
