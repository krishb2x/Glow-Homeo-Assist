const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  console.log("Checking mt_cases...");
  const { data: cases } = await supabase.from('mt_cases').select('*').order('created_at', { ascending: false }).limit(3);
  console.log("Cases:", JSON.stringify(cases, null, 2));

  console.log("\nChecking mt_payments...");
  const { data: payments } = await supabase.from('mt_payments').select('*').order('created_at', { ascending: false }).limit(3);
  console.log("Payments:", JSON.stringify(payments, null, 2));

  console.log("\nChecking mt_partners...");
  const { data: partners } = await supabase.from('mt_partners').select('*').limit(3);
  console.log("Partners:", JSON.stringify(partners, null, 2));
  
  console.log("\nChecking mt_order_attributions...");
  const { data: attr } = await supabase.from('mt_order_attributions').select('*').order('created_at', { ascending: false }).limit(3);
  console.log("Attributions:", JSON.stringify(attr, null, 2));
}

checkDb();
