const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function test() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Try several potential SQL execution function names
  const functions = ['exec_sql', 'execute_sql', 'run_sql', 'query'];
  for (const fn of functions) {
    const { data, error } = await supabase.rpc(fn, { sql: 'SELECT 1;', query: 'SELECT 1;', sql_query: 'SELECT 1;' });
    console.log(`RPC ${fn} result:`, data, "Error:", error ? error.message : null);
  }
}
test();
