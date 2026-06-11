const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log("Querying mt_products...");
  const { data, error } = await supabase
    .from('mt_products')
    .select('*')
    .limit(10);

  if (error) {
    console.error("Error fetching mt_products:", error);
  } else {
    console.log(`Fetched ${data.length} products:`);
    if (data.length > 0) {
      console.log("Columns of mt_products:", Object.keys(data[0]));
      console.log("First product data:", JSON.stringify(data[0], null, 2));
    }
  }
}

checkProducts();
