const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

async function testPage() {
  console.log("Fetching all orders...");
  const { data: orders, error } = await supabase.from('mt_orders').select('*');
  if (error) {
    console.error("Failed to fetch orders:", error);
    return;
  }
  console.log(`Fetched ${orders.length} orders. Testing mapping logic...`);
  for (const order of orders) {
    try {
      const rpId = order.razorpay_order_id || (order.id && order.id.split('-')[0]);
      const dateStr = formatDate(order.created_at);
      const name = order.customer_name;
      const email = order.customer_email;
      const itemsLen = order.items?.length || 0;
      
      const types = new Set(order.items?.map((i) => i.product?.product_type || 'UNKNOWN'));
      const typeLabels = Array.from(types).join(", ");
      
      const priceStr = formatPrice(order.total_amount);
      console.log(`Success Order ${order.id}: rpId=${rpId}, date=${dateStr}, name=${name}, items=${itemsLen}, types=${typeLabels}, price=${priceStr}`);
    } catch (e) {
      console.error(`!!! FAILED on order ${order.id}:`, e);
    }
  }
}

testPage();
