const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function inspectOrders() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: orders, error } = await supabase
    .from('mt_orders')
    .select('id, customer_name, customer_email, status, fulfillment_status, audit_log, items, created_at');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Inspecting ${orders.length} orders:`);
  for (const order of orders) {
    console.log(`\nOrder ID: ${order.id}`);
    console.log(`Customer: ${order.customer_name} (${order.customer_email})`);
    console.log(`Status/Fulfillment: ${order.status} / ${order.fulfillment_status}`);
    console.log(`Audit Log:`, JSON.stringify(order.audit_log, null, 2));
    
    // Check if the order contains ebooks
    const items = order.items || [];
    const itemSummary = items.map(item => {
      const p = item.product || {};
      return `${p.title} (${p.product_type || 'Unknown'})`;
    });
    console.log(`Items:`, itemSummary.join(', '));
  }
}

inspectOrders();
