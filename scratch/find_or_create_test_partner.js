const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../apps/meditonic/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Finding or creating test partner user...');
  const testEmail = 'testpartner@example.com';
  const testPassword = 'Password123!';
  const clinicId = '595cd444-e89c-4d1f-b31f-27f76f59e0d7';

  // Find user by querying public profiles or mt_partners or mt_partner_applications
  let userId = null;

  // Let's try to query profiles table
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', testEmail) // if profiles has email
      .maybeSingle();

    if (profile) {
      userId = profile.id;
    }
  } catch (err) {
    console.log('Profiles select check skipped or failed');
  }

  // If we can't find by profile, let's check mt_partner_applications
  const { data: existingApp } = await supabase
    .from('mt_partner_applications')
    .select('id, mt_partners(id, user_id)')
    .eq('email', testEmail)
    .maybeSingle();

  if (existingApp) {
    console.log('Found existing partner application.');
    if (existingApp.mt_partners && existingApp.mt_partners.length > 0) {
      userId = existingApp.mt_partners[0].user_id;
    }
  }
  
  if (existingApp) {
    const partner = existingApp.mt_partners?.[0];
    if (partner) {
      const partnerId = partner.id;
      userId = partner.user_id;

      await supabase.from('mt_order_attributions').delete().eq('partner_id', partnerId);
      await supabase.from('mt_partner_payouts').delete().eq('partner_id', partnerId);
      await supabase.from('mt_partner_email_logs').delete().eq('partner_id', partnerId);

      const { data: codes } = await supabase.from('mt_referral_codes').select('id').eq('partner_id', partnerId);
      const codeIds = codes?.map(c => c.id) || [];
      if (codeIds.length > 0) {
        await supabase.from('mt_referral_products').delete().in('referral_code_id', codeIds);
        await supabase.from('mt_referral_codes').delete().in('id', codeIds);
      }

      await supabase.from('mt_partners').delete().eq('id', partnerId);
    }
    await supabase.from('mt_partner_applications').delete().eq('id', existingApp.id);
  }

  // If userId is still null, let's try to login to check if user already exists
  console.log('Creating fresh/updated test partner user...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: 'Test Partner Browser', role: 'PARTNER' }
  });

  let authUser = newUser?.user;

  if (createError) {
    console.log('Create user error or user exists:', createError.message);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInData?.user) {
      userId = signInData.user.id;
      console.log('Logged in successfully. User ID:', userId);
    } else {
      console.log('Could not log in:', signInError?.message);
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listData?.users) {
        const found = listData.users.find(u => u.email === testEmail);
        if (found) {
          userId = found.id;
          console.log('Found user ID from listUsers:', userId);
        }
      }
    }

    if (userId) {
      console.log('Updating user password to Password123!...');
      const { data: updData, error: updError } = await supabase.auth.admin.updateUserById(userId, {
        password: testPassword,
        user_metadata: { name: 'Test Partner Browser', role: 'PARTNER' }
      });
      if (updError) {
        console.error('Update user error:', updError);
        return;
      }
      authUser = updData.user;
    } else {
      console.error('Failed to obtain userId of existing auth user.');
      return;
    }
  }

  // Create application
  const { data: app, error: appError } = await supabase
    .from('mt_partner_applications')
    .insert({
      clinic_id: clinicId,
      name: 'Test Partner Browser',
      email: testEmail,
      mobile: '9876543211',
      profession: 'Tester',
      city: 'Test City',
      state: 'Test State',
      status: 'approved'
    })
    .select()
    .single();

  if (appError) {
    console.error('App insert error:', appError);
    return;
  }

  // Create partner
  const { data: newPartner, error: partnerInsError } = await supabase
    .from('mt_partners')
    .insert({
      user_id: authUser.id,
      application_id: app.id,
      clinic_id: clinicId,
      status: 'active',
      base_commission_rate: 10.00
    })
    .select()
    .single();

  if (partnerInsError) {
    console.error('Partner insert error:', partnerInsError);
    return;
  }
  const partnerId = newPartner.id;
  console.log('Created partner record:', partnerId);

  // Create referral code
  const { error: codeInsError } = await supabase
    .from('mt_referral_codes')
    .insert({
      code: 'TESTBROWSER',
      partner_id: partnerId,
      clinic_id: clinicId,
      discount_type: 'percentage',
      discount_value: 10,
      landing_path: '/',
      is_active: true
    });

  if (codeInsError) {
    console.error('Code insert error:', codeInsError);
    return;
  }
  console.log('Created code: TESTBROWSER');

  // Create mock attributions
  console.log('Creating mock attributions...');
  const { error: attrInsError } = await supabase
    .from('mt_order_attributions')
    .insert([
      {
        partner_id: partnerId,
        order_id: 'ord_mock123',
        customer_id: 'cust_mock1',
        product_type: 'consultation',
        product_id: '595cd444-e89c-4d1f-b31f-27f76f59e0d7',
        revenue_after_discount: 1000,
        commission_amount: 100,
        status: 'pending',
        created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        partner_id: partnerId,
        order_id: 'ord_mock124',
        customer_id: 'cust_mock2',
        product_type: 'ebook',
        product_id: '595cd444-e89c-4d1f-b31f-27f76f59e0d7',
        revenue_after_discount: 500,
        commission_amount: 50,
        status: 'paid',
        created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      }
    ]);

  if (attrInsError) {
    console.error('Attribution insert error:', attrInsError);
  } else {
    console.log('Created mock attributions.');
  }

  // Create mock payout
  console.log('Creating mock payout...');
  const { error: payoutInsError } = await supabase
    .from('mt_partner_payouts')
    .insert({
      partner_id: partnerId,
      amount: 150,
      status: 'paid',
      payment_method: 'bank_transfer',
      transaction_reference: 'MOCKTXN456',
      receipt_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      admin_remarks: 'Cleared commissions for April and May.',
      paid_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
    });

  if (payoutInsError) {
    console.error('Payout insert error:', payoutInsError);
  } else {
    console.log('Created mock payout.');
  }

  console.log('Test partner setup completed successfully! Credentials:');
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);
}

run();
