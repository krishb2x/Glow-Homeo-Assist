const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function checkSyncQueue() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== Fetching latest sync queue jobs ===");
  const { data: jobs, error } = await supabase
    .from('mt_sync_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching sync queue:", error);
    return;
  }

  console.log(`Found ${jobs.length} latest sync queue jobs:`);
  jobs.forEach(job => {
    console.log(`\n- Job ID: ${job.id}`);
    console.log(`  Target System: ${job.target_system}`);
    console.log(`  Operation: ${job.operation}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Payload: ${JSON.stringify(job.payload)}`);
    console.log(`  Error Message: ${job.error_message}`);
    console.log(`  Attempts: ${job.attempts}`);
    console.log(`  Created At: ${job.created_at}`);
  });
}

checkSyncQueue();
