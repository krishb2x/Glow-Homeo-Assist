import { createClient } from '@supabase/supabase-js';
import { generateMockPartnerList } from './factories/partnerFactory';

// Usage: npx ts-node tests/seed.ts
// Seeds the test database with predictable mock data for Playwright E2E tests.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🌱 Seeding database for E2E tests...');

  // 1. Clear existing test data
  await supabase.from('mt_order_attributions').delete().neq('id', '0');
  await supabase.from('mt_referral_codes').delete().neq('id', '0');
  await supabase.from('mt_partners').delete().neq('id', '0');

  // 2. Insert predictable partners
  const partners = generateMockPartnerList(3);
  
  for (const partner of partners) {
    const { data: partnerApp } = await supabase
      .from('mt_partner_applications')
      .insert(partner.mt_partner_applications)
      .select()
      .single();

    if (partnerApp) {
      await supabase.from('mt_partners').insert({
        id: partner.id,
        user_id: partner.user_id,
        clinic_id: partner.clinic_id,
        application_id: partnerApp.id,
        status: partner.status,
        base_commission_rate: partner.base_commission_rate,
      });
    }
  }

  console.log('✅ Seeding complete!');
}

seed().catch(console.error);
