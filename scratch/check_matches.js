const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Has Key:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMatches() {
  try {
    const { data: partners, error: pErr } = await supabase
      .from('mt_partners')
      .select('*, mt_partner_applications(name, email)');

    if (pErr) {
      console.error("Partners query error:", pErr);
      return;
    }

    const partner = partners.find(p => p.mt_partner_applications?.name?.includes('Krishna'));
    if (!partner) {
      console.error("Partner not found among:", partners.map(p => p.mt_partner_applications?.name));
      return;
    }

    console.log("Partner ID:", partner.id);
    console.log("Partner Clinic ID:", partner.clinic_id);

    const { data: codes } = await supabase
      .from('mt_referral_codes')
      .select('*')
      .eq('partner_id', partner.id);

    if (!codes || codes.length === 0) {
      console.error("No codes found");
      return;
    }

    const code = codes[0];
    console.log("Code ID:", code.id);
    console.log("Code Clinic ID:", code.clinic_id);

    const { data: overrides } = await supabase
      .from('mt_referral_products')
      .select('*')
      .eq('referral_code_id', code.id);

    const { data: products } = await supabase
      .from('mt_products')
      .select('*')
      .eq('is_active', true);

    console.log(`\nFound ${products.length} active products in DB.`);
    console.log(`Found ${overrides.length} override configs in DB.`);

    // Check matches
    products.forEach(p => {
      const match = overrides.find(o => o.product_id === p.id);
      console.log(`Product "${p.title}" (ID: ${p.id}, type: ${p.product_type}, clinic: ${p.clinic_id}) -> Override: ${match ? 'FOUND (is_active=' + match.is_active + ')' : 'NOT FOUND'}`);
    });

  } catch (err) {
    console.error(err);
  }
}

checkMatches();
