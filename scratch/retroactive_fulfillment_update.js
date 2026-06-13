const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function retroactiveFulfillmentUpdate() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== Fetching all orders with status 'paid' or 'fulfilled' ===");
  const { data: orders, error } = await supabase
    .from('mt_orders')
    .select('id, customer_name, customer_email, status, fulfillment_status, items, created_at');

  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }

  console.log(`Total orders fetched: ${orders.length}`);

  const toUpdate = [];

  for (const order of orders) {
    const items = order.items || [];
    const hasPhysical = items.some(item => {
      const p = item.product || {};
      return p.product_type === 'PHYSICAL_BOOK' || p.product_type === 'TREATMENT_KIT';
    });

    const isDigitalOnly = items.length > 0 && !hasPhysical;

    // Condition to update: 
    // Either the order status is 'fulfilled' but fulfillment_status is not 'fulfilled'
    // OR the order status is 'paid' and it's a digital-only order (since digital is auto-delivered)
    // OR the order has 'Resent Delivery Email' in its audit log (already handled by admin)
    if (
      (order.status === 'fulfilled' && order.fulfillment_status !== 'fulfilled') ||
      (order.status === 'paid' && isDigitalOnly)
    ) {
      toUpdate.push(order);
    }
  }

  console.log(`\nFound ${toUpdate.length} orders that need to be marked as FULFILLED:`);
  for (const order of toUpdate) {
    console.log(`- ID: ${order.id}, Customer: ${order.customer_name}, Current Status: ${order.status}, Fulfillment: ${order.fulfillment_status}, Created: ${order.created_at}`);
  }

  if (toUpdate.length === 0) {
    console.log("No orders need updating.");
    return;
  }

  console.log("\n=== Starting database updates ===");
  for (const order of toUpdate) {
    const { error: updateError } = await supabase
      .from('mt_orders')
      .update({
        fulfillment_status: 'fulfilled',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error(`Failed to update order ${order.id}:`, updateError);
    } else {
      console.log(`Successfully updated order ${order.id} to fulfillment_status='fulfilled'`);
    }
  }

  console.log("=== Retroactive update completed! ===");
}

retroactiveFulfillmentUpdate();
