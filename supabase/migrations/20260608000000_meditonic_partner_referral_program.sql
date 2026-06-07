-- Migration: MediTonic Partner Referral Program
-- Description: Adds tables for partner applications, partners, referral codes, order attributions, and commissions.

-- 1. mt_partner_applications
CREATE TABLE mt_partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    profession TEXT NOT NULL,
    instagram_url TEXT,
    youtube_url TEXT,
    website_url TEXT,
    audience_size TEXT,
    city TEXT,
    state TEXT,
    why_partner TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'on_hold')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. mt_partners
CREATE TABLE mt_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable initially if we don't have auth user created immediately
    application_id UUID REFERENCES mt_partner_applications(id) ON DELETE SET NULL,
    clinic_id TEXT NOT NULL,
    partner_type TEXT NOT NULL DEFAULT 'affiliate',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    base_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00, -- e.g. 10.00%
    total_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. mt_referral_codes
CREATE TABLE mt_referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    partner_id UUID REFERENCES mt_partners(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    code_name TEXT,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    usage_limit INTEGER, -- null means unlimited
    current_usage INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. mt_referral_products (Mapping code to specific products. If empty for a code, applies to all)
CREATE TABLE mt_referral_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID REFERENCES mt_referral_codes(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL CHECK (product_type IN ('consultation', 'program', 'ebook', 'course', 'all')),
    product_id TEXT, -- nullable. if null, applies to all of that type.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. mt_order_attributions
CREATE TABLE mt_order_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    partner_id UUID REFERENCES mt_partners(id) ON DELETE SET NULL,
    referral_code_id UUID REFERENCES mt_referral_codes(id) ON DELETE SET NULL,
    order_id TEXT NOT NULL, -- references external order or mt_payments.id/razorpay_order_id
    customer_id UUID REFERENCES mt_patients(id) ON DELETE SET NULL,
    product_type TEXT NOT NULL,
    product_id TEXT,
    revenue_before_discount NUMERIC(10, 2) NOT NULL,
    discount_applied NUMERIC(10, 2) NOT NULL,
    revenue_after_discount NUMERIC(10, 2) NOT NULL,
    commission_percentage NUMERIC(5, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. mt_partner_payouts
CREATE TABLE mt_partner_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES mt_partners(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    payment_method TEXT,
    transaction_reference TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX idx_mt_partner_apps_clinic ON mt_partner_applications(clinic_id);
CREATE INDEX idx_mt_partners_clinic ON mt_partners(clinic_id);
CREATE INDEX idx_mt_partners_user ON mt_partners(user_id);
CREATE INDEX idx_mt_referral_codes_code ON mt_referral_codes(code);
CREATE INDEX idx_mt_referral_codes_partner ON mt_referral_codes(partner_id);
CREATE INDEX idx_mt_order_attributions_partner ON mt_order_attributions(partner_id);
CREATE INDEX idx_mt_order_attributions_order ON mt_order_attributions(order_id);

-- RLS Policies
ALTER TABLE mt_partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_referral_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_order_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_partner_payouts ENABLE ROW LEVEL SECURITY;

-- Note: Proper RLS logic for Admin & Partners depends on how JWTs are structured,
-- but a fallback policy is to allow authenticated access or service role.
-- We can add basic permissive policies for service_role and restrict for anon.

-- For now, allow service role full access (Next.js server uses this)
CREATE POLICY "Allow all actions for service role" ON mt_partner_applications USING (true);
CREATE POLICY "Allow all actions for service role" ON mt_partners USING (true);
CREATE POLICY "Allow all actions for service role" ON mt_referral_codes USING (true);
CREATE POLICY "Allow all actions for service role" ON mt_referral_products USING (true);
CREATE POLICY "Allow all actions for service role" ON mt_order_attributions USING (true);
CREATE POLICY "Allow all actions for service role" ON mt_partner_payouts USING (true);

-- Allow anon to create applications
CREATE POLICY "Allow anon to insert applications" ON mt_partner_applications FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Alter existing tables to support referrals
ALTER TABLE mt_payments ADD COLUMN IF NOT EXISTS referral_code_id UUID REFERENCES mt_referral_codes(id) ON DELETE SET NULL;
ALTER TABLE mt_payments ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE mt_payments ADD COLUMN IF NOT EXISTS original_amount NUMERIC(10, 2);

ALTER TABLE mt_consultation_requests ADD COLUMN IF NOT EXISTS referral_code_id UUID REFERENCES mt_referral_codes(id) ON DELETE SET NULL;
ALTER TABLE mt_consultation_requests ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(10, 2) DEFAULT 0;
