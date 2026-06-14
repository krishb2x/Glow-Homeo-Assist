const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../apps/meditonic/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Indexes on mt_referral_codes ---');
  const { data: indexes, error } = await supabase.rpc('execute_sql', {
    sql_query: "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'mt_referral_codes';"
  });

  if (error) {
    // If RPC execute_sql is not available, try checking constraints via direct query or reading pg_catalog
    console.log('RPC execute_sql failed. Trying direct query of table metadata...');
    // Let's try inserting a duplicate to see if it fails
    console.log(error);
  } else {
    console.log(indexes);
  }
}

run();
