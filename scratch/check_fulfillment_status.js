const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function checkFulfillmentStatus() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== Fetching mt_orders where status is 'fulfilled' ===");
  const { data: orders, error } = await supabase
    .from('mt_orders')
    .select('id, customer_name, customer_email, status, fulfillment_status, created_at');

  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }

  console.log(`Total orders found: ${orders.length}`);
  console.log("\n=== Order List ===");
  orders.forEach(order => {
    console.log(`ID: ${order.id}`);
    console.log(`Customer: ${order.customer_name} (${order.customer_email})`);
    console.log(`Status: ${order.status}`);
    console.log(`Fulfillment Status: ${order.fulfillment_status}`);
    console.log(`Created At: ${order.created_at}`);
    console.log(`-----------------------------------`);
  });
}

checkFulfillmentStatus();
