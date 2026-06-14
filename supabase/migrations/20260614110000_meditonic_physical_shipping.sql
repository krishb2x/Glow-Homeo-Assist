-- Migration: Add shipping, tracking, and operational stage details to mt_orders
-- Table: mt_orders

DO $$
BEGIN
    -- Shipping address details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mt_orders' AND column_name = 'shipping_street') THEN
        ALTER TABLE public.mt_orders
        ADD COLUMN shipping_street TEXT,
        ADD COLUMN shipping_city TEXT,
        ADD COLUMN shipping_state TEXT,
        ADD COLUMN shipping_pincode TEXT,
        ADD COLUMN shipping_landmark TEXT,
        ADD COLUMN shipping_country TEXT DEFAULT 'India';
    END IF;

    -- Kanban workflow tracking column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mt_orders' AND column_name = 'workflow_status') THEN
        ALTER TABLE public.mt_orders
        ADD COLUMN workflow_status TEXT DEFAULT 'packing_queue';
    END IF;

    -- Tracking and Courier details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mt_orders' AND column_name = 'tracking_id') THEN
        ALTER TABLE public.mt_orders
        ADD COLUMN tracking_id TEXT,
        ADD COLUMN carrier_name TEXT,
        ADD COLUMN shipped_at TIMESTAMPTZ,
        ADD COLUMN delivered_at TIMESTAMPTZ,
        ADD COLUMN packed_at TIMESTAMPTZ,
        ADD COLUMN shipping_notes TEXT,
        ADD COLUMN operations_notes TEXT;
    END IF;
END $$;
