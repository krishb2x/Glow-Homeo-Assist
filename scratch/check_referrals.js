const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function checkReferrals() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== 1. Fetching Partners ===");
  const { data: partners, error: partnerErr } = await supabase
    .from('mt_partners')
    .select('id, base_commission_rate, total_revenue, total_orders, total_commission, mt_partner_applications(name, email, mobile)');

  if (partnerErr) {
    console.error("Error fetching partners:", partnerErr);
  } else {
    console.log(`Found ${partners.length} partners:`);
    partners.forEach(p => {
      console.log(`- Partner ID: ${p.id}, Name: ${p.mt_partner_applications?.name}, Email: ${p.mt_partner_applications?.email}, Code rate: ${p.base_commission_rate}%`);
    });
  }

  console.log("\n=== 2. Fetching Referral Codes ===");
  const { data: codes, error: codeErr } = await supabase
    .from('mt_referral_codes')
    .select('id, partner_id, code, current_usage, is_active');

  if (codeErr) {
    console.error("Error fetching codes:", codeErr);
  } else {
    console.log(`Found ${codes.length} referral codes:`);
    codes.forEach(c => {
      console.log(`- Code: "${c.code}", Partner ID: ${c.partner_id}, Usage count: ${c.current_usage}, Active: ${c.is_active}`);
    });
  }

  console.log("\n=== 3. Auditing Paid Orders with Applied Referral Codes ===");
  const { data: orders, error: orderErr } = await supabase
    .from('mt_orders')
    .select('id, customer_name, customer_email, total_amount, status, audit_log, created_at')
    .eq('status', 'paid');

  if (orderErr) {
    console.error("Error fetching orders:", orderErr);
    return;
  }

  console.log(`Found ${orders.length} paid orders in total.`);
  
  let referralOrdersCount = 0;
  for (const order of orders) {
    if (order.audit_log && Array.isArray(order.audit_log)) {
      const referralLog = order.audit_log.find(log => log.action === 'applied_referral');
      if (referralLog && referralLog.code) {
        referralOrdersCount++;
        console.log(`\nOrder: ${order.id}`);
        console.log(`- Customer: ${order.customer_name} (${order.customer_email})`);
        console.log(`- Amount: ${order.total_amount}`);
        console.log(`- Applied Code: "${referralLog.code}"`);
        console.log(`- Date: ${order.created_at}`);

        // Check if there is an attribution
        const { data: attributions, error: attrErr } = await supabase
          .from('mt_order_attributions')
          .select('id, partner_id, commission_amount, status')
          .eq('order_id', order.id);

        if (attrErr) {
          console.error(`  Error checking attributions:`, attrErr);
        } else if (attributions.length > 0) {
          console.log(`  [OK] Attribution found: ID ${attributions[0].id}, Commission ${attributions[0].commission_amount}, Status: ${attributions[0].status}`);
        } else {
          console.log(`  [MISSING] No attribution found for this order!`);
        }
      }
    }
  }
  
  console.log(`\nTotal paid orders with referral codes: ${referralOrdersCount}`);
}

checkReferrals();
