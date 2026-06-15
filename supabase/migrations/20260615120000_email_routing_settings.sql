-- Migration: Admin Email Settings & Dynamic Routing Control Panel
-- Table: public.mt_email_settings

CREATE TABLE IF NOT EXISTS public.mt_email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID UNIQUE NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    
    -- Routing configuration
    provider TEXT NOT NULL DEFAULT 'ses' CHECK (provider IN ('ses', 'resend', 'smtp')),
    resend_api_key TEXT,
    
    -- Global CC and BCC default lists
    default_cc TEXT,
    default_bcc TEXT,
    
    -- Template Toggles (Enable/Disable flags)
    enable_consultation_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    enable_store_product_delivery BOOLEAN NOT NULL DEFAULT TRUE,
    enable_partner_application_received BOOLEAN NOT NULL DEFAULT TRUE,
    enable_partner_approved BOOLEAN NOT NULL DEFAULT TRUE,
    enable_partner_payout_processed BOOLEAN NOT NULL DEFAULT TRUE,
    enable_partner_rejected BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mt_email_settings ENABLE ROW LEVEL SECURITY;

-- Dynamic admin policies
CREATE POLICY "Allow service_role full access to mt_email_settings" ON public.mt_email_settings USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to mt_email_settings" ON public.mt_email_settings FOR SELECT TO public USING (true);

-- Seed defaults for the primary MediTonic Clinic ID
INSERT INTO public.mt_email_settings (clinic_id, provider, enable_consultation_confirmed)
VALUES ('595cd444-e89c-4d1f-b31f-27f76f59e0d7', 'ses', true)
ON CONFLICT (clinic_id) DO NOTHING;
