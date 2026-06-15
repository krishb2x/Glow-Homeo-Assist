const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    // 1. Fetch partner Krishna
    const { data: partners, error: pErr } = await supabase
      .from('mt_partners')
      .select('*, mt_partner_applications(name, email)');

    if (pErr) throw pErr;
    console.log("=== PARTNERS ===");
    console.log(JSON.stringify(partners, null, 2));

    const partner = partners.find(p => p.mt_partner_applications?.name?.includes('Krishna'));
    if (partner) {
      // 2. Fetch referral codes
      const { data: codes } = await supabase
        .from('mt_referral_codes')
        .select('*')
        .eq('partner_id', partner.id);
      console.log("\n=== REFERRAL CODES ===");
      console.log(codes);

      if (codes && codes.length > 0) {
        // 3. Fetch referral products
        const { data: refProds } = await supabase
          .from('mt_referral_products')
          .select('*')
          .eq('referral_code_id', codes[0].id);
        console.log("\n=== REFERRAL PRODUCTS OVERRIDES ===");
        console.log(JSON.stringify(refProds, null, 2));
      }
    }

    // 4. Fetch products
    const { data: products, error: prodErr } = await supabase
      .from('mt_products')
      .select('id, title, slug, price, product_type, clinic_id, is_active, status')
      .limit(10);
    if (prodErr) throw prodErr;
    console.log("\n=== PRODUCTS ===");
    console.log(JSON.stringify(products, null, 2));

  } catch (err) {
    console.error(err);
  }
}

inspect();
