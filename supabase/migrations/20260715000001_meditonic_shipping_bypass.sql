-- Migration: Add bypass_shipping_check column to mt_products
ALTER TABLE public.mt_products
ADD COLUMN IF NOT EXISTS bypass_shipping_check BOOLEAN DEFAULT FALSE;
