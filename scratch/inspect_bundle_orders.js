const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function inspectBundleOrders() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: orders, error } = await supabase
    .from('mt_orders')
    .select('id, customer_name, customer_email, items, status, fulfillment_status');

  if (error) {
    console.error(error);
    return;
  }

  for (const order of orders) {
    const items = order.items || [];
    const hasBundle = items.some(item => {
      const p = item.product || {};
      return p.product_type === 'BUNDLE' || p.is_bundle || p.type === 'BUNDLE';
    });

    if (hasBundle) {
      console.log(`\n=== Bundle Order found: ${order.id} ===`);
      console.log(`Customer: ${order.customer_name} (${order.customer_email})`);
      console.log(`Status/Fulfillment: ${order.status} / ${order.fulfillment_status}`);
      console.log(`Items JSON:`, JSON.stringify(order.items, null, 2));
    }
  }
}

inspectBundleOrders();
