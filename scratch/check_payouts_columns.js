const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../apps/meditonic/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- mt_partner_payouts columns ---');
  const { data: rows, error } = await supabase.from('mt_partner_payouts').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', rows.length > 0 ? Object.keys(rows[0]) : 'No rows. Trying mock insert...');
    // Try mock insert to check columns
    const { data: insData, error: insErr } = await supabase.from('mt_partner_payouts').insert({
      partner_id: '00000000-0000-0000-0000-000000000000', // invalid but will check schema first
      amount: 100,
      receipt_url: 'test_url',
      admin_remarks: 'test_remarks'
    }).select();
    
    console.log('Insert Error details:', insErr);
  }
}

run();
