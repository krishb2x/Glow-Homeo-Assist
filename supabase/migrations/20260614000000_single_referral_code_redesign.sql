-- Migration: Single Referral Code Redesign and Email Audit Logs
-- Description: Adds overrides columns to mt_referral_products and creates mt_partner_email_logs.

-- 1. Add overrides columns to mt_referral_products
ALTER TABLE public.mt_referral_products ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed'));
ALTER TABLE public.mt_referral_products ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2);
ALTER TABLE public.mt_referral_products ADD COLUMN IF NOT EXISTS commission_type TEXT CHECK (commission_type IN ('percentage', 'fixed'));
ALTER TABLE public.mt_referral_products ADD COLUMN IF NOT EXISTS commission_value NUMERIC(10, 2);
ALTER TABLE public.mt_referral_products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Create mt_partner_email_logs table
CREATE TABLE IF NOT EXISTS public.mt_partner_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.mt_partners(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_by_admin TEXT NOT NULL, -- Name or email of the admin
    to_email TEXT NOT NULL,
    cc_emails TEXT[], -- Array of CC email addresses
    bcc_emails TEXT[], -- Future-ready BCC column
    subject TEXT NOT NULL,
    email_content_snapshot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Sent' CHECK (status IN ('Queued', 'Sent', 'Delivered', 'Failed', 'queued', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for mt_partner_email_logs
ALTER TABLE public.mt_partner_email_logs ENABLE ROW LEVEL SECURITY;

-- Allow all actions for service role
CREATE POLICY "Allow all actions for service role on mt_partner_email_logs" ON public.mt_partner_email_logs USING (true);
