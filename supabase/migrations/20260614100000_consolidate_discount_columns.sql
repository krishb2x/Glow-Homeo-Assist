-- ============================================================
-- COMPREHENSIVE CLEANUP: Consolidate & Clean Partner Referral Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Backfill mt_referral_products with values from mt_referral_codes
-- (copies global discount/commission into per-product rows before we drop those columns)
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'mt_referral_codes' AND column_name = 'discount_type'
    ) THEN
        UPDATE public.mt_referral_products rp
        SET 
          discount_type = COALESCE(rp.discount_type, rc.discount_type, 'percentage'),
          discount_value = COALESCE(rp.discount_value, rc.discount_value, 10),
          commission_type = COALESCE(rp.commission_type, 'percentage'),
          commission_value = COALESCE(rp.commission_value, rc.commission_rate, 10)
        FROM public.mt_referral_codes rc
        WHERE rp.referral_code_id = rc.id
          AND (rp.discount_type IS NULL OR rp.discount_value IS NULL 
               OR rp.commission_type IS NULL OR rp.commission_value IS NULL);
    END IF;
END $$;


-- ============================================================
-- STEP 2: Delete orphaned mt_referral_products rows
-- (rows with product_type = 'all' and no product_id are legacy "catch-all" rows,
--  they're now replaced by individual per-product rows)
-- ============================================================

DELETE FROM public.mt_referral_products 
WHERE product_type = 'all' AND product_id IS NULL;


-- ============================================================
-- STEP 3: Drop redundant discount/commission columns from mt_referral_codes
-- (these now live exclusively in mt_referral_products)
-- ============================================================

ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS discount_type;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS discount_value;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS commission_rate;


-- ============================================================
-- STEP 4: Drop legacy columns from mt_referral_codes
-- (superseded by valid_from, valid_until, max_uses, current_uses)
-- ============================================================

ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS start_date;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS end_date;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS usage_limit;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS current_usage;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS code_name;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS description;
ALTER TABLE public.mt_referral_codes DROP COLUMN IF EXISTS landing_path;


-- ============================================================
-- STEP 5: Ensure NOT NULL constraints on mt_referral_products override columns
-- (so no future rows can have NULL discount/commission)
-- ============================================================

-- First set any remaining NULLs to defaults
UPDATE public.mt_referral_products 
SET discount_type = 'percentage' WHERE discount_type IS NULL;

UPDATE public.mt_referral_products 
SET discount_value = 10 WHERE discount_value IS NULL;

UPDATE public.mt_referral_products 
SET commission_type = 'percentage' WHERE commission_type IS NULL;

UPDATE public.mt_referral_products 
SET commission_value = 10 WHERE commission_value IS NULL;

UPDATE public.mt_referral_products 
SET is_active = true WHERE is_active IS NULL;

-- Now apply NOT NULL constraints
ALTER TABLE public.mt_referral_products ALTER COLUMN discount_type SET NOT NULL;
ALTER TABLE public.mt_referral_products ALTER COLUMN discount_value SET NOT NULL;
ALTER TABLE public.mt_referral_products ALTER COLUMN commission_type SET NOT NULL;
ALTER TABLE public.mt_referral_products ALTER COLUMN commission_value SET NOT NULL;
ALTER TABLE public.mt_referral_products ALTER COLUMN is_active SET NOT NULL;

-- Set defaults for future inserts
ALTER TABLE public.mt_referral_products ALTER COLUMN discount_type SET DEFAULT 'percentage';
ALTER TABLE public.mt_referral_products ALTER COLUMN discount_value SET DEFAULT 10;
ALTER TABLE public.mt_referral_products ALTER COLUMN commission_type SET DEFAULT 'percentage';
ALTER TABLE public.mt_referral_products ALTER COLUMN commission_value SET DEFAULT 10;
ALTER TABLE public.mt_referral_products ALTER COLUMN is_active SET DEFAULT true;


-- ============================================================
-- DONE! Final table structures:
-- 
-- mt_referral_codes (code identity only):
--   id, clinic_id, partner_id, code, is_active,
--   max_uses, current_uses, valid_from, valid_until,
--   created_at, updated_at
--
-- mt_referral_products (single source of truth for discounts):
--   id, referral_code_id, product_type, product_id,
--   discount_type, discount_value,
--   commission_type, commission_value,
--   is_active, created_at
-- ============================================================
