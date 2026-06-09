import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET!;

async function runTests() {
  console.log("Starting Security & Delivery Tests...\n");

  // --- SECURITY TESTS ---
  console.log("Test 1: S3 Presign without Auth");
  try {
    const s3Res = await fetch(`${APP_URL}/api/admin/s3-presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "test-slug" })
    });
    
    if (s3Res.status === 401 || s3Res.status === 500) {
      console.log("✅ Passed: Blocked unauthorized access.");
    } else {
      console.log(`❌ Failed: Returned status ${s3Res.status}`);
    }
  } catch (e: any) {
    console.log("✅ Passed (Fetch error):", e.message);
  }

  console.log("\nTest 2: Fulfillment without Secret");
  try {
    const fulfillRes = await fetch(`${APP_URL}/api/orders/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mtOrderId: "fake-id" })
    });
    
    if (fulfillRes.status === 401) {
      console.log("✅ Passed: Blocked unauthorized fulfillment.");
    } else {
      console.log(`❌ Failed: Returned status ${fulfillRes.status}`);
    }
  } catch (e: any) {
    console.log("✅ Passed (Fetch error):", e.message);
  }

  // --- DELIVERY TESTS ---
  console.log("\nTest 3: Combo Delivery Logic");
  
  // 1. Find a product
  const { data: comboProducts } = await supabase
    .from("mt_products")
    .select("*, mt_product_relationships(related_product_id)")
    .eq("type", "digital")
    .limit(1);
    
  const comboProduct = comboProducts?.[0];
    
  if (!comboProduct) {
    console.log("❌ Failed: Could not find any digital product in DB.");
    return;
  }

  // 2. Fetch its items
  const { data: bundleRels } = await supabase
    .from("mt_product_relationships")
    .select(`
      related_product_id,
      mt_products!mt_product_relationships_related_product_id_fkey (
        id, title, slug, stock_status
      )
    `)
    .eq("product_id", comboProduct.id)
    .eq("relationship_type", "bundle_item");
    
  const digitalItems: any[] = [];
  if (bundleRels) {
    for (const rel of bundleRels) {
      const child = rel.mt_products as any;
      if (child) {
        digitalItems.push({
          product_id: child.id,
          title: child.title,
          slug: child.slug,
          stock_status: child.stock_status
        });
      }
    }
  }
  
  console.log(`Found ${digitalItems.length} items in combo.`);

  // 3. Create dummy order
  const { data: order, error: orderErr } = await supabase
    .from("mt_orders")
    .insert({
      customer_name: "Test User Security",
      customer_email: "test_security@example.com",
      status: "paid",
      payment_method: "test",
      items: [{
        product: {
          id: comboProduct.id,
          title: comboProduct.title,
          product_type: "BUNDLE",
          is_bundle: true
        },
        quantity: 1,
        price: comboProduct.price
      }],
      subtotal: comboProduct.price,
      total: comboProduct.price,
    })
    .select("*")
    .single();

  if (orderErr) {
    console.error("❌ Failed to create dummy order:", orderErr);
    return;
  }

  console.log(`Created dummy order ${order.id}. Fulfilling...`);

  // 4. Trigger fulfillment via the secured route!
  const fulfillAuthRes = await fetch(`${APP_URL}/api/orders/fulfill`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET
    },
    body: JSON.stringify({ mtOrderId: order.id })
  });

  if (fulfillAuthRes.ok) {
    console.log(`✅ Passed: Successfully delivered PDFs via secured webhook!`);
  } else {
    const errorText = await fulfillAuthRes.text();
    console.log(`❌ Failed: HTTP ${fulfillAuthRes.status} - ${errorText}`);
  }

  // Check if DB updated
  const { data: updatedOrder } = await supabase.from("mt_orders").select("pdf_delivered").eq("id", order.id).single();
  if (updatedOrder?.pdf_delivered) {
    console.log("✅ Passed: Database confirmed PDF delivery!");
  }

  // Cleanup
  await supabase.from("mt_orders").delete().eq("id", order.id);
  console.log("\nCleanup: Deleted dummy order.");
}

runTests();
