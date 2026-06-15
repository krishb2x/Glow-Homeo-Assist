const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSelect() {
  const { data, error } = await supabase.from('mt_products').select('id, title, slug, price, cover_image_path, image_url, product_type').limit(1);
  console.log("Error selecting image_url:", error);
  console.log("Data returned:", data);
}
testSelect();
