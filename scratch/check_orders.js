const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function checkOrders() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== Fetching latest 10 store orders ===");
  const { data: orders, error } = await supabase
    .from('mt_orders')
    .select('id, customer_name, customer_email, total_amount, status, audit_log, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }

  console.log(`Found ${orders.length} orders:`);
  orders.forEach(order => {
    console.log(`\n- Order ID: ${order.id}`);
    console.log(`  Customer: ${order.customer_name} (${order.customer_email})`);
    console.log(`  Amount: ${order.total_amount}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Audit Log: ${JSON.stringify(order.audit_log)}`);
    console.log(`  Created At: ${order.created_at}`);
    console.log(`  Updated At: ${order.updated_at}`);
  });
}

checkOrders();
