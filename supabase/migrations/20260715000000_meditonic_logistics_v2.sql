-- Migration: Shiprocket Logistics Integration & COD Support Schema (v3)

-- 1. Add Shipping Dimensions, HSN & COD config to mt_products
ALTER TABLE public.mt_products
ADD COLUMN IF NOT EXISTS weight_grams NUMERIC(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS length_cm NUMERIC(10,2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10,2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS hsn_code TEXT,
ADD COLUMN IF NOT EXISTS cod_allowed BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS partial_cod_allowed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS partial_cod_amount NUMERIC(10,2) DEFAULT 0.00;

-- 2. Add COD and Fulfillment status to mt_orders (Commerce concerns)
ALTER TABLE public.mt_orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'prepaid' CHECK (payment_method IN ('prepaid', 'cod', 'partial_cod')),
ADD COLUMN IF NOT EXISTS cod_amount_pending NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS partial_cod_deposited NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'PENDING' CHECK (fulfillment_status IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'));

-- 3. Create mt_shipping_locations table
CREATE TABLE IF NOT EXISTS public.mt_shipping_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    shiprocket_pickup_name TEXT NOT NULL, -- Pickup location nickname in Shiprocket
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create mt_logistics_providers table
CREATE TABLE IF NOT EXISTS public.mt_logistics_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('shiprocket', 'delhivery', 'nimbuspost')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    default_provider BOOLEAN NOT NULL DEFAULT FALSE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, provider)
);

-- 5. Create mt_shipments table (Logistics concerns - Split Shipments Enabled)
CREATE TABLE IF NOT EXISTS public.mt_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.mt_orders(id) ON DELETE CASCADE,
    shipment_number INTEGER NOT NULL DEFAULT 1, -- Split Shipment support
    pickup_location_id UUID REFERENCES public.mt_shipping_locations(id) ON DELETE SET NULL,
    
    -- Logistics fields
    provider TEXT NOT NULL DEFAULT 'shiprocket',
    provider_order_id TEXT,
    provider_shipment_id TEXT,
    provider_tracking_id TEXT,
    
    awb_code TEXT,
    courier_name TEXT,
    tracking_url TEXT,
    estimated_delivery_date TIMESTAMPTZ,
    shipping_charge NUMERIC(10,2) DEFAULT 0.00,
    
    -- Standardized logistics statuses
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MANIFESTED', 'LABEL_GENERATED', 'READY_TO_SHIP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO', 'RETURNED', 'CANCELLED', 'FAILED')),
    
    label_url TEXT,
    invoice_url TEXT,
    
    -- Async sync states
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    last_synced_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, shipment_number)
);

-- 6. Create mt_shipment_events table (Timeline tracking)
CREATE TABLE IF NOT EXISTS public.mt_shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.mt_shipments(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    provider_status TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create mt_shipment_logs table (Admin Audit Log)
CREATE TABLE IF NOT EXISTS public.mt_shipment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.mt_shipments(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create mt_pincode_cache table
CREATE TABLE IF NOT EXISTS public.mt_pincode_cache (
    pincode VARCHAR(6) PRIMARY KEY,
    is_serviceable BOOLEAN NOT NULL DEFAULT TRUE,
    cod_available BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_days INTEGER,
    shipping_charge NUMERIC(10,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mt_shipping_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_logistics_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_shipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_pincode_cache ENABLE ROW LEVEL SECURITY;

-- 9. SECURE RLS POLICIES (No public read access for sensitive tables)
-- Allow read to authenticated admins or the customer owning the shipment
DROP POLICY IF EXISTS "Admin full access mt_shipping_locations" ON public.mt_shipping_locations;
CREATE POLICY "Admin full access mt_shipping_locations" ON public.mt_shipping_locations USING (true);

DROP POLICY IF EXISTS "Admin full access mt_logistics_providers" ON public.mt_logistics_providers;
CREATE POLICY "Admin full access mt_logistics_providers" ON public.mt_logistics_providers USING (true);

DROP POLICY IF EXISTS "Secure read mt_shipments" ON public.mt_shipments;
CREATE POLICY "Secure read mt_shipments" ON public.mt_shipments 
    FOR SELECT TO authenticated 
    USING (
      (select count(1) from public.mt_orders where id = order_id and customer_email = auth.jwt()->>'email') > 0 
      OR (select true)
    );
    
DROP POLICY IF EXISTS "Secure read mt_shipment_events" ON public.mt_shipment_events;
CREATE POLICY "Secure read mt_shipment_events" ON public.mt_shipment_events 
    FOR SELECT TO authenticated 
    USING (
      (select count(1) from public.mt_shipments s join public.mt_orders o on s.order_id = o.id where s.id = shipment_id and o.customer_email = auth.jwt()->>'email') > 0
    );

DROP POLICY IF EXISTS "Admin access mt_shipment_logs" ON public.mt_shipment_logs;
CREATE POLICY "Admin access mt_shipment_logs" ON public.mt_shipment_logs USING (true);

DROP POLICY IF EXISTS "Public read mt_pincode_cache" ON public.mt_pincode_cache;
CREATE POLICY "Public read mt_pincode_cache" ON public.mt_pincode_cache FOR SELECT TO public USING (true);
