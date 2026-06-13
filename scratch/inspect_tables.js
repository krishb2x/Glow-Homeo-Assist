const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function inspect() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const tables = ['mt_referral_codes', 'mt_referral_products', 'mt_products', 'mt_partners'];
  for (const t of tables) {
    console.log(`\n=== Table: ${t} ===`);
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.error(`Error on ${t}:`, error);
    } else if (data && data.length > 0) {
      console.log(`Columns of ${t}:`, Object.keys(data[0]));
      console.log(`Sample row:`, data[0]);
    } else {
      console.log(`Table ${t} is empty. Trying to select columns via alternative method if possible.`);
    }
  }
}

inspect();
