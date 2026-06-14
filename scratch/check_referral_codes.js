const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read env variables
dotenv.config({ path: path.join(__dirname, '../apps/meditonic/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars. NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl, 'SUPABASE_SERVICE_ROLE_KEY length:', supabaseKey ? supabaseKey.length : 0);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching all referral codes...');
  const { data: codes, error } = await supabase
    .from('mt_referral_codes')
    .select('id, partner_id, code, updated_at, is_active')
    .order('partner_id');

  if (error) {
    console.error('Error fetching referral codes:', error);
    return;
  }

  console.log(`Total referral codes in DB: ${codes.length}`);

  const partnerMap = {};
  const duplicates = [];

  for (const c of codes) {
    if (!c.partner_id) continue;
    if (!partnerMap[c.partner_id]) {
      partnerMap[c.partner_id] = [];
    }
    partnerMap[c.partner_id].push(c);
  }

  for (const [partnerId, group] of Object.entries(partnerMap)) {
    if (group.length > 1) {
      duplicates.push({ partnerId, codes: group });
    }
  }

  console.log(`Found ${duplicates.length} partners with duplicate codes:`);
  for (const dup of duplicates) {
    console.log(`\nPartner ID: ${dup.partnerId}`);
    for (const code of dup.codes) {
      console.log(`  - Code: ${code.code}, ID: ${code.id}, Updated: ${code.updated_at}, Active: ${code.is_active}`);
    }
  }
}

run();
