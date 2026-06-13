const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function getOrdersSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== Querying pg_catalog / information_schema via RPC or direct select ===");
  
  // Let's try querying information_schema.columns directly
  const { data: cols, error: colsErr } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'mt_orders');

  if (colsErr) {
    console.error("Direct select from information_schema.columns failed:", colsErr);
  } else {
    console.log("Columns of mt_orders:", cols);
  }

  // Let's check check constraints using pg_catalog
  // Since we might not have a direct sql query helper, let's see if we can query pg_constraint
  const { data: cons, error: consErr } = await supabase
    .from('pg_constraint')
    .select('*')
    .eq('conname', 'mt_orders_status_check');

  if (consErr) {
    console.error("Direct select from pg_constraint failed:", consErr);
  } else {
    console.log("Constraint:", cons);
  }
}

getOrdersSchema();
