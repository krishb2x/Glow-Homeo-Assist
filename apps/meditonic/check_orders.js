const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
  console.log("Querying mt_orders...");
  const { data, error, count } = await supabase
    .from('mt_orders')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) {
    console.error("Error fetching mt_orders:", error);
  } else {
    console.log("Success! Count:", count);
    console.log("Columns:", data.length > 0 ? Object.keys(data[0]) : "No records");
    if (data.length > 0) {
      console.log("First record:", JSON.stringify(data[0], null, 2));
    }
  }
}

checkOrders();
