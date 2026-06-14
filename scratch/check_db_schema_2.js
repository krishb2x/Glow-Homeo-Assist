const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../apps/meditonic/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- mt_order_attributions columns ---');
  const { data: row, error } = await supabase.from('mt_order_attributions').select('*').limit(1);
  if (row && row.length > 0) {
    console.log(Object.keys(row[0]));
  } else {
    console.log('Error or no rows in mt_order_attributions:', error || 'no rows');
  }

  console.log('--- mt_partner_email_logs columns ---');
  const { data: row2, error: err2 } = await supabase.from('mt_partner_email_logs').select('*').limit(1);
  if (row2 && row2.length > 0) {
    console.log(Object.keys(row2[0]));
  } else {
    console.log('No rows or error in mt_partner_email_logs:', err2 || 'no rows');
  }
}

run();
