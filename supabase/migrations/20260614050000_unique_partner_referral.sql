DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'mt_referral_codes_partner_id_unique'
    ) THEN
        ALTER TABLE public.mt_referral_codes ADD CONSTRAINT mt_referral_codes_partner_id_unique UNIQUE (partner_id);
    END IF;
END $$;
