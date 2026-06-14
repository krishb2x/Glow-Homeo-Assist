const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../apps/meditonic/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log("Checking mt_products table unique product types...");
  const { data, error } = await supabase.from('mt_products').select('product_type, title');
  if (error) {
    console.error("Error querying mt_products:", error);
  } else {
    const types = new Set(data.map(p => p.product_type));
    console.log("Unique product types in mt_products:", Array.from(types));
    console.log("Sample records:", data.slice(0, 10));
  }
}

checkProducts();
