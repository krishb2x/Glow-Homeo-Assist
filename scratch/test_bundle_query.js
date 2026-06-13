const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function testBundleQuery() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const bundleId = "40a681a7-392f-4088-bc31-66ade1888401"; // Diagnosis Bundle ID

  console.log("=== Testing query with 'summary' column ===");
  const { data: dataWithSummary, error: errWithSummary } = await supabase
    .from("mt_product_relationships")
    .select(`
      related_product_id,
      mt_products!mt_product_relationships_related_product_id_fkey (
        id, title, slug, stock_status, summary, description, metadata
      )
    `)
    .eq("product_id", bundleId)
    .eq("relationship_type", "bundle_item");

  if (errWithSummary) {
    console.error("Query with 'summary' FAILED:", errWithSummary);
  } else {
    console.log("Query with 'summary' SUCCEEDED:", JSON.stringify(dataWithSummary, null, 2));
  }

  console.log("\n=== Testing query WITHOUT 'summary' column ===");
  const { data: dataNoSummary, error: errNoSummary } = await supabase
    .from("mt_product_relationships")
    .select(`
      related_product_id,
      mt_products!mt_product_relationships_related_product_id_fkey (
        id, title, slug, stock_status, description, metadata
      )
    `)
    .eq("product_id", bundleId)
    .eq("relationship_type", "bundle_item");

  if (errNoSummary) {
    console.error("Query without 'summary' FAILED:", errNoSummary);
  } else {
    console.log("Query without 'summary' SUCCEEDED:", JSON.stringify(dataNoSummary, null, 2));
  }
}

testBundleQuery();
