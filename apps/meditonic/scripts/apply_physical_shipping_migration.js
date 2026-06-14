const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Applying Database Migration: physical shipping fields ---');
  
  const migrationPath = path.join(__dirname, '../../../supabase/migrations/20260614110000_meditonic_physical_shipping.sql');
  const sqlQuery = fs.readFileSync(migrationPath, 'utf8');

  console.log('Executing migration query against Supabase...');
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: sqlQuery
  });

  if (error) {
    console.error('Failed to run migration:', error);
    process.exit(1);
  } else {
    console.log('Database migration completed successfully!', data);
  }
}

run();
