const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../apps/meditonic/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Applying Unique Partner Constraint on mt_referral_codes ---');

  // Step 1: Check if unique constraint already exists on partner_id
  let constraints = null;
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.mt_referral_codes'::regclass 
          AND contype = 'u' 
          AND conkey = (
            SELECT array_agg(attnum) 
            FROM pg_attribute 
            WHERE attrelid = 'public.mt_referral_codes'::regclass 
              AND attname = 'partner_id'
          );
      `
    });
    if (!error) constraints = data;
  } catch (e) {
    console.log('RPC check failed.');
  }

  if (constraints && constraints.length > 0) {
    console.log('Unique constraint on partner_id already exists:', constraints[0].conname);
    return;
  }

  // Step 2: Check for existing duplicate partner_ids in mt_referral_codes
  let duplicates = null;
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT partner_id, COUNT(*) 
        FROM public.mt_referral_codes 
        WHERE partner_id IS NOT NULL
        GROUP BY partner_id 
        HAVING COUNT(*) > 1;
      `
    });
    if (!error) duplicates = data;
  } catch (e) {
    console.log('RPC check duplicates failed.');
  }

  if (duplicates && duplicates.length > 0) {
    console.log('Found duplicate partner codes in DB:', duplicates);
    console.log('Cleaning up duplicate codes, keeping the most recently updated one...');
    
    for (const dup of duplicates) {
      const partnerId = dup.partner_id;
      
      // Fetch all codes for this partner
      const { data: codes, error: codesErr } = await supabase
        .from('mt_referral_codes')
        .select('id, code, updated_at')
        .eq('partner_id', partnerId)
        .order('updated_at', { ascending: false });

      if (codesErr || !codes || codes.length <= 1) continue;

      // Keep the first (most recently updated), delete the rest
      const keepCode = codes[0];
      const deleteIds = codes.slice(1).map(c => c.id);

      console.log(`For partner ${partnerId}, keeping code ${keepCode.code}. Deleting duplicates:`, deleteIds);

      // Clean referral products mappings for deleted codes
      await supabase.from('mt_referral_products').delete().in('referral_code_id', deleteIds);
      
      // Clean order attributions references or let ON DELETE SET NULL handle it
      await supabase.from('mt_order_attributions').delete().in('referral_code_id', deleteIds);

      // Delete the duplicate codes
      const { error: delErr } = await supabase.from('mt_referral_codes').delete().in('id', deleteIds);
      if (delErr) {
        console.error('Failed to delete duplicate codes:', delErr);
      }
    }
  } else {
    console.log('No duplicate partner codes found.');
  }

  // Step 3: Add UNIQUE constraint to partner_id
  console.log('Adding UNIQUE constraint to partner_id in mt_referral_codes...');
  
  const { data: sqlRes, error: sqlErr } = await supabase.rpc('execute_sql', {
    sql_query: `
      ALTER TABLE public.mt_referral_codes 
      ADD CONSTRAINT mt_referral_codes_partner_id_unique UNIQUE (partner_id);
    `
  });

  if (sqlErr) {
    console.error('Failed to add unique constraint via RPC execute_sql:', sqlErr);
  } else {
    console.log('UNIQUE constraint mt_referral_codes_partner_id_unique added successfully!');
  }
}

run();
