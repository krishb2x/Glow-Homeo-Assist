-- Adds delivery tracking columns to mt_orders

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'mt_orders' 
          AND column_name = 'pdf_delivered'
    ) THEN
        ALTER TABLE public.mt_orders
        ADD COLUMN pdf_delivered boolean DEFAULT false,
        ADD COLUMN pdf_urls jsonb;
    END IF;
END $$;
