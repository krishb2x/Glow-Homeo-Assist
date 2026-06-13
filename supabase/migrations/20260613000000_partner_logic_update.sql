-- Migration: Partner Referral Program Enhancements
-- Description: Add columns for usage controls (max_uses, current_uses, valid_from, valid_until) to mt_referral_codes and update constraint on mt_referral_products.

-- 1. Add usage and date control columns to mt_referral_codes
ALTER TABLE public.mt_referral_codes ADD COLUMN IF NOT EXISTS max_uses integer;
ALTER TABLE public.mt_referral_codes ADD COLUMN IF NOT EXISTS current_uses integer DEFAULT 0;
ALTER TABLE public.mt_referral_codes ADD COLUMN IF NOT EXISTS valid_from timestamptz;
ALTER TABLE public.mt_referral_codes ADD COLUMN IF NOT EXISTS valid_until timestamptz;

-- 2. Backfill columns from existing legacy fields
UPDATE public.mt_referral_codes
SET 
  max_uses = COALESCE(max_uses, usage_limit),
  current_uses = COALESCE(current_uses, current_usage),
  valid_from = COALESCE(valid_from, start_date),
  valid_until = COALESCE(valid_until, end_date)
WHERE max_uses IS NULL OR valid_from IS NULL OR valid_until IS NULL;

-- 3. Drop existing constraint on mt_referral_products
ALTER TABLE public.mt_referral_products DROP CONSTRAINT IF EXISTS mt_referral_products_product_type_check;

-- 4. Re-create constraint to support all canonical product types plus legacy ones
ALTER TABLE public.mt_referral_products ADD CONSTRAINT mt_referral_products_product_type_check 
CHECK (product_type IN ('consultation', 'program', 'course', 'ebook', 'physical_book', 'treatment_kit', 'bundle', 'membership', 'all', 'ebooks', 'programs'));
