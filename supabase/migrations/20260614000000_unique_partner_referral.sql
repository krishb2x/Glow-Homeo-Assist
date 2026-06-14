-- Description: Enforce one partner = one referral code constraint
ALTER TABLE public.mt_referral_codes ADD CONSTRAINT mt_referral_codes_partner_id_unique UNIQUE (partner_id);
