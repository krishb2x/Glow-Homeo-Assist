const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
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
  console.log('--- Starting Referral Code Deduplication & Migration ---');

  // 1. Fetch all referral codes
  const { data: codes, error: codesErr } = await supabase
    .from('mt_referral_codes')
    .select('id, partner_id, code, updated_at, is_active')
    .order('partner_id');

  if (codesErr) {
    console.error('Failed to fetch referral codes:', codesErr);
    process.exit(1);
  }

  console.log(`Found ${codes.length} total referral codes in the database.`);

  // Group by partner_id
  const partnerMap = {};
  for (const c of codes) {
    if (!c.partner_id) continue;
    if (!partnerMap[c.partner_id]) {
      partnerMap[c.partner_id] = [];
    }
    partnerMap[c.partner_id].push(c);
  }

  const duplicates = [];
  for (const [partnerId, group] of Object.entries(partnerMap)) {
    if (group.length > 1) {
      duplicates.push({ partnerId, codes: group });
    }
  }

  if (duplicates.length === 0) {
    console.log('No duplicate referral codes found! DB is clean.');
    return;
  }

  console.log(`Found ${duplicates.length} partners with duplicate referral codes.`);

  for (const dup of duplicates) {
    const partnerId = dup.partnerId;
    
    // Sort by updated_at descending, keep the most recently updated one
    const sorted = [...dup.codes].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const keepCode = sorted[0];
    const deleteIds = sorted.slice(1).map(c => c.id);

    console.log(`\nPartner: ${partnerId}`);
    console.log(`  KEEPING: Code: "${keepCode.code}", ID: ${keepCode.id}, Updated: ${keepCode.updated_at}`);
    console.log(`  DELETING ${deleteIds.length} duplicate codes:`);
    for (const c of sorted.slice(1)) {
      console.log(`    - Code: "${c.code}", ID: ${c.id}, Updated: ${c.updated_at}`);
    }

    // A. Migrate mt_order_attributions
    console.log('    Migrating order attributions...');
    const { data: attrUpdate, error: attrErr } = await supabase
      .from('mt_order_attributions')
      .update({ referral_code_id: keepCode.id })
      .in('referral_code_id', deleteIds);
    if (attrErr) console.warn('      Warning/Error migrating mt_order_attributions:', attrErr.message);

    // B. Migrate mt_payments
    console.log('    Migrating payments...');
    const { data: payUpdate, error: payErr } = await supabase
      .from('mt_payments')
      .update({ referral_code_id: keepCode.id })
      .in('referral_code_id', deleteIds);
    if (payErr) console.warn('      Warning/Error migrating mt_payments:', payErr.message);

    // C. Migrate mt_consultation_requests
    console.log('    Migrating consultation requests...');
    const { data: consultUpdate, error: consultErr } = await supabase
      .from('mt_consultation_requests')
      .update({ referral_code_id: keepCode.id })
      .in('referral_code_id', deleteIds);
    if (consultErr) console.warn('      Warning/Error migrating mt_consultation_requests:', consultErr.message);

    // D. Migrate mt_cases
    console.log('    Migrating cases...');
    const { data: caseUpdate, error: caseErr } = await supabase
      .from('mt_cases')
      .update({ referral_code_id: keepCode.id })
      .in('referral_code_id', deleteIds);
    if (caseErr) console.warn('      Warning/Error migrating mt_cases:', caseErr.message);

    // E. Delete referral configurations mapping for deleted codes
    console.log('    Deleting referral product overrides configurations...');
    const { error: prodErr } = await supabase
      .from('mt_referral_products')
      .delete()
      .in('referral_code_id', deleteIds);
    if (prodErr) console.warn('      Warning/Error deleting mt_referral_products mappings:', prodErr.message);

    // F. Finally delete the duplicate codes
    console.log('    Deleting duplicate codes from mt_referral_codes...');
    const { error: delErr } = await supabase
      .from('mt_referral_codes')
      .delete()
      .in('id', deleteIds);
    if (delErr) {
      console.error(`      ERROR deleting duplicate codes for partner ${partnerId}:`, delErr.message);
    } else {
      console.log('      Successfully deleted duplicate codes.');
    }
  }

  console.log('\n✅ Deduplication and migration completed successfully!');
}

run().catch(console.error);
