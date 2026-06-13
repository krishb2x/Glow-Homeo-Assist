const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function runRetroactiveSync() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== Starting Retroactive Referral Sync ===");

  // 1. Fetch all paid orders
  const { data: orders, error: orderErr } = await supabase
    .from('mt_orders')
    .select('id, clinic_id, customer_name, customer_email, total_amount, status, audit_log, created_at')
    .eq('status', 'paid');

  if (orderErr) {
    console.error("Error fetching orders:", orderErr);
    return;
  }

  console.log(`Auditing ${orders.length} paid orders...`);

  let syncedCount = 0;

  for (const order of orders) {
    if (!order.audit_log || !Array.isArray(order.audit_log)) continue;

    const referralLog = order.audit_log.find(log => log.action === 'applied_referral');
    if (!referralLog || !referralLog.code) continue;

    const code = referralLog.code;
    console.log(`\nChecking Order ${order.id} (applied code: "${code}")`);

    // Check if attribution already exists
    const { data: existingAttr, error: attrCheckErr } = await supabase
      .from('mt_order_attributions')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (attrCheckErr) {
      console.error(`  Error checking existing attribution:`, attrCheckErr);
      continue;
    }

    if (existingAttr) {
      console.log(`  [SKIP] Attribution already exists (ID: ${existingAttr.id})`);
      continue;
    }

    console.log(`  [SYNC] Missing attribution found. Processing...`);

    // Fetch referral code details
    const { data: refCodeData, error: refCodeErr } = await supabase
      .from('mt_referral_codes')
      .select('id, code, partner_id, current_usage, commission_rate, mt_partners(id, base_commission_rate, total_revenue, total_orders, total_commission)')
      .eq('code', code)
      .single();

    if (refCodeErr || !refCodeData) {
      console.error(`  [ERROR] Failed to fetch referral code "${code}":`, refCodeErr || 'Not found');
      continue;
    }

    const partner = Array.isArray(refCodeData.mt_partners) ? refCodeData.mt_partners[0] : refCodeData.mt_partners;
    if (!partner) {
      console.error(`  [ERROR] Partner not found for code "${code}"`);
      continue;
    }

    // Calculate commission
    const commissionRate = refCodeData.commission_rate ?? (partner.base_commission_rate || 10);
    const revenueAfterDiscount = order.total_amount;
    const commissionAmount = (revenueAfterDiscount * commissionRate) / 100;

    console.log(`  - Partner ID: ${partner.id}`);
    console.log(`  - Commission Rate: ${commissionRate}%`);
    console.log(`  - Revenue: ${revenueAfterDiscount}`);
    console.log(`  - Calculated Commission: ${commissionAmount}`);

    // Create attribution record
    const { data: newAttr, error: attrErr } = await supabase
      .from('mt_order_attributions')
      .insert({
        clinic_id: order.clinic_id || '595cd444-e89c-4d1f-b31f-27f76f59e0d7',
        partner_id: partner.id,
        referral_code_id: refCodeData.id,
        order_id: order.id,
        customer_id: null,
        product_type: 'store_order',
        revenue_before_discount: revenueAfterDiscount,
        discount_applied: 0,
        revenue_after_discount: revenueAfterDiscount,
        commission_percentage: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
        created_at: order.created_at // Preserve original date
      })
      .select()
      .single();

    if (attrErr) {
      console.error(`  [ERROR] Failed to insert attribution:`, attrErr);
      continue;
    }

    console.log(`  [OK] Created attribution record: ${newAttr.id}`);

    // Update partner metrics
    const { error: partnerUpdateErr } = await supabase
      .from('mt_partners')
      .update({
        total_revenue: Number(partner.total_revenue || 0) + Number(revenueAfterDiscount),
        total_orders: Number(partner.total_orders || 0) + 1,
        total_commission: Number(partner.total_commission || 0) + Number(commissionAmount),
        updated_at: new Date().toISOString()
      })
      .eq('id', partner.id);

    if (partnerUpdateErr) {
      console.error(`  [ERROR] Failed to update partner metrics:`, partnerUpdateErr);
    } else {
      console.log(`  [OK] Updated partner metrics in database`);
      // Update local metrics so subsequent loops add correctly if referring same partner
      partner.total_revenue = Number(partner.total_revenue || 0) + Number(revenueAfterDiscount);
      partner.total_orders = Number(partner.total_orders || 0) + 1;
      partner.total_commission = Number(partner.total_commission || 0) + Number(commissionAmount);
    }

    // Update referral code usage
    const { error: codeUpdateErr } = await supabase
      .from('mt_referral_codes')
      .update({
        current_usage: (refCodeData.current_usage || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', refCodeData.id);

    if (codeUpdateErr) {
      console.error(`  [ERROR] Failed to update code usage:`, codeUpdateErr);
    } else {
      console.log(`  [OK] Incremented code usage count`);
    }

    syncedCount++;
  }

  console.log(`\n=== Retroactive Sync Finished. Successfully synced ${syncedCount} missing attributions. ===`);
}

runRetroactiveSync();
