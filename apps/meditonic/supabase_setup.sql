-- mt_products table (Comprehensive Commerce Schema)
CREATE TABLE mt_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Future proof product types
    product_type TEXT NOT NULL CHECK (product_type IN ('EBOOK', 'PHYSICAL_BOOK', 'PROGRAM', 'COURSE', 'CONSULTATION', 'MEMBERSHIP', 'BUNDLE')),
    
    -- Fulfillment Configurations
    fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('DIGITAL_DOWNLOAD', 'PHYSICAL_SHIPPING', 'LMS_ACCESS', 'BOOKING')),
    
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    category TEXT NOT NULL, 
    audience TEXT,
    
    -- SEO & Status
    meta_title TEXT,
    meta_description TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    
    metadata JSONB, -- contains pages, format, language, course_duration, etc.
    
    -- Storage Bucket Paths (replacing direct URLs)
    cover_image_path TEXT,
    gallery_image_paths JSONB,
    preview_pdf_path TEXT,
    final_pdf_path TEXT,
    
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    is_combo BOOLEAN DEFAULT false,
    combo_includes JSONB,
    stock_status TEXT DEFAULT 'IN_STOCK',
    delivery_method TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- mt_orders table
CREATE TABLE mt_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    total_amount NUMERIC(10, 2) NOT NULL,
    
    -- Payment and general status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    
    -- Operations Fulfillment status
    fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'partial', 'fulfilled')),
    
    utm_source TEXT,
    utm_campaign TEXT,
    items JSONB NOT NULL, -- Array of products purchased
    
    -- Audit logging for operations
    audit_log JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create buckets for storage
INSERT INTO storage.buckets (id, name, public) VALUES ('meditonic-public', 'meditonic-public', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('meditonic-private', 'meditonic-private', false) ON CONFLICT DO NOTHING;

-- Storage RLS Policies
-- Allow public read access to meditonic-public
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'meditonic-public');
-- Allow authenticated insert to meditonic-public
CREATE POLICY "Auth Insert Public" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'meditonic-public' AND auth.role() = 'authenticated');

-- Allow authenticated read/insert to meditonic-private
CREATE POLICY "Auth Access Private" ON storage.objects FOR SELECT USING (bucket_id = 'meditonic-private' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Insert Private" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'meditonic-private' AND auth.role() = 'authenticated');

-- Map legacy mt_ebooks data to new schema
INSERT INTO mt_products (
    id, clinic_id, slug, title, description, product_type, fulfillment_type, price, original_price, 
    category, metadata, cover_image_path, is_active, sort_order, is_combo, combo_includes, status
)
SELECT 
    id, clinic_id, slug, title, description, 
    -- Map legacy type to product_type
    CASE 
        WHEN type = 'book' THEN 'EBOOK' 
        WHEN type = 'hardcopy' THEN 'PHYSICAL_BOOK'
        WHEN type = 'course' THEN 'COURSE'
        ELSE 'EBOOK' 
    END as product_type, 
    -- Map fulfillment_type based on type
    CASE 
        WHEN type = 'hardcopy' THEN 'PHYSICAL_SHIPPING'
        WHEN type = 'course' THEN 'LMS_ACCESS'
        ELSE 'DIGITAL_DOWNLOAD' 
    END as fulfillment_type,
    price, original_price, category, metadata, 
    image_url as cover_image_path, -- store the old URL in cover_image_path for now
    is_active, sort_order, is_combo, combo_includes,
    CASE WHEN is_active THEN 'PUBLISHED' ELSE 'DRAFT' END as status
FROM mt_ebooks;
