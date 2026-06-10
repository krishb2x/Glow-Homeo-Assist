import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import { createClient } from "@supabase/supabase-js";
import { deliverPdfs, DeliveryItem } from "./lib/pdf/deliveryService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function run() {
  const orderId = "81f8a118-d5c0-4004-a7d2-a282c3fe4974";
  console.log("Fetching order:", orderId);
  const { data: order, error } = await supabase.from("mt_orders").select("*").eq("id", orderId).single();
  if (error || !order) {
    console.error("Order not found", error);
    return;
  }

  const items = order.items || [];
  let digitalItems: DeliveryItem[] = [];

  for (const item of items) {
    const p = item.product;
    if (p.product_type === 'EBOOK' || p.product_type === 'COURSE') {
      digitalItems.push({ product_id: p.id, title: p.title, slug: p.slug, stock_status: p.stock_status });
    }
  }

  console.log("Starting PDF generation for:", digitalItems.map(i => i.title));
  console.time("Delivery");
  const deliveredPdfs = await deliverPdfs(order, digitalItems);
  console.timeEnd("Delivery");
  console.log("Delivered:", deliveredPdfs);
}

run().catch(console.error);
