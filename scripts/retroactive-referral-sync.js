const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function runRetroactiveSync() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=== Starting Retroactive Referral Sync ===");

  let syncedCount = 0;

  // ============================================================
  // PHASE 1: Sync Store & eBook Orders from mt_orders
  // ============================================================
  console.log("\n--- Phase 1: Auditing Store/eBook Orders ---");
  const { data: orders, error: orderErr } = await supabase
    .from('mt_orders')
    .select('id, clinic_id, customer_name, customer_email, total_amount, status, audit_log, created_at')
    .eq('status', 'paid');

  if (orderErr) {
    console.error("Error fetching orders:", orderErr);
  } else {
    console.log(`Found ${orders.length} paid store orders to audit...`);
    for (const order of orders) {
      if (!order.audit_log || !Array.isArray(order.audit_log)) continue;

      const referralLog = order.audit_log.find(log => log.action === 'applied_referral');
      if (!referralLog || !referralLog.code) continue;

      const code = referralLog.code;
      console.log(`Checking Order ${order.id} (applied code: "${code}")`);

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

      console.log(`  [SYNC] Missing attribution found. Syncing store order...`);

      // Fetch referral code details
      const { data: refCodeData, error: refCodeErr } = await supabase
        .from('mt_referral_codes')
        .select(`
          id, 
          code, 
          partner_id, 
          current_uses, 
          mt_partners (
            id, 
            base_commission_rate, 
            total_revenue, 
            total_orders, 
            total_commission
          ),
          mt_referral_products (
            product_type,
            product_id,
            discount_type,
            discount_value,
            commission_type,
            commission_value,
            is_active
          )
        `)
        .ilike('code', code)
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

      // Resolve overrides or fallback to partner's base rate
      let commissionRate = Number(partner.base_commission_rate || 10);
      if (refCodeData.mt_referral_products && refCodeData.mt_referral_products.length > 0) {
        const override = refCodeData.mt_referral_products.find(p => p.product_type === 'store_order' || p.product_type === 'all');
        if (override && override.commission_type === 'percentage') {
          commissionRate = Number(override.commission_value);
        }
      }

      const revenueAfterDiscount = order.total_amount;
      const netRevenue = revenueAfterDiscount * 0.73; // Less GST 18%, PG 2%, Platform 7%
      const commissionAmount = (netRevenue * commissionRate) / 100;

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
          created_at: order.created_at
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
      }

      // Update referral code usage
      const { error: codeUpdateErr } = await supabase
        .from('mt_referral_codes')
        .update({
          current_uses: (refCodeData.current_uses || 0) + 1,
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
  }

  // ============================================================
  // PHASE 2: Sync Consultation Orders from mt_payments
  // ============================================================
  console.log("\n--- Phase 2: Auditing Consultation Payments ---");
  const { data: payments, error: payErr } = await supabase
    .from('mt_payments')
    .select('id, clinic_id, patient_id, amount, original_amount, discount_applied, referral_code_id, reference_id, created_at')
    .eq('status', 'captured')
    .eq('purpose', 'consultation')
    .not('referral_code_id', 'is', null);

  if (payErr) {
    console.error("Error fetching payments:", payErr);
  } else {
    console.log(`Found ${payments.length} captured consultation payments to audit...`);
    for (const payment of payments) {
      console.log(`Checking Consultation payment ${payment.id} for reference ${payment.reference_id}`);

      // Check if attribution already exists
      const { data: existingAttr, error: attrCheckErr } = await supabase
        .from('mt_order_attributions')
        .select('id')
        .eq('order_id', payment.reference_id)
        .maybeSingle();

      if (attrCheckErr) {
        console.error(`  Error checking existing attribution:`, attrCheckErr);
        continue;
      }

      if (existingAttr) {
        console.log(`  [SKIP] Attribution already exists (ID: ${existingAttr.id})`);
        continue;
      }

      console.log(`  [SYNC] Missing attribution found. Syncing consultation payment...`);

      // Fetch referral code details
      const { data: refCodeData, error: refCodeErr } = await supabase
        .from('mt_referral_codes')
        .select(`
          id, 
          code, 
          partner_id, 
          current_uses, 
          mt_partners (
            id, 
            base_commission_rate, 
            total_revenue, 
            total_orders, 
            total_commission
          ),
          mt_referral_products (
            product_type,
            product_id,
            discount_type,
            discount_value,
            commission_type,
            commission_value,
            is_active
          )
        `)
        .eq('id', payment.referral_code_id)
        .single();

      if (refCodeErr || !refCodeData) {
        console.error(`  [ERROR] Failed to fetch referral code by ID "${payment.referral_code_id}":`, refCodeErr || 'Not found');
        continue;
      }

      const partner = Array.isArray(refCodeData.mt_partners) ? refCodeData.mt_partners[0] : refCodeData.mt_partners;
      if (!partner) {
        console.error(`  [ERROR] Partner not found for code ID "${payment.referral_code_id}"`);
        continue;
      }

      // Resolve overrides or fallback to partner's base rate
      let commissionRate = Number(partner.base_commission_rate || 10);
      if (refCodeData.mt_referral_products && refCodeData.mt_referral_products.length > 0) {
        const override = refCodeData.mt_referral_products.find(p => p.product_type === 'consultation' || p.product_type === 'all');
        if (override && override.commission_type === 'percentage') {
          commissionRate = Number(override.commission_value);
        }
      }

      const revenueAfterDiscount = payment.amount;
      const netRevenue = revenueAfterDiscount * 0.73; // Less GST 18%, PG 2%, Platform 7%
      const commissionAmount = (netRevenue * commissionRate) / 100;

      // Create attribution record
      const { data: newAttr, error: attrErr } = await supabase
        .from('mt_order_attributions')
        .insert({
          clinic_id: payment.clinic_id || '595cd444-e89c-4d1f-b31f-27f76f59e0d7',
          partner_id: partner.id,
          referral_code_id: refCodeData.id,
          order_id: payment.reference_id,
          customer_id: payment.patient_id,
          product_type: 'consultation',
          revenue_before_discount: payment.original_amount || payment.amount,
          discount_applied: payment.discount_applied || 0,
          revenue_after_discount: revenueAfterDiscount,
          commission_percentage: commissionRate,
          commission_amount: commissionAmount,
          status: 'pending',
          created_at: payment.created_at
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
      }

      // Update referral code usage
      const { error: codeUpdateErr } = await supabase
        .from('mt_referral_codes')
        .update({
          current_uses: (refCodeData.current_uses || 0) + 1,
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
  }

  console.log(`\n=== Retroactive Sync Finished. Successfully synced ${syncedCount} missing attributions. ===`);
}

runRetroactiveSync();
