-- 1. Drop the old table if it exists to start fresh
DROP TABLE IF EXISTS mt_products CASCADE;

-- 2. Create the unified mt_products table
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
    
    -- Storage Bucket Paths
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

-- 3. Copy all data from mt_ebooks to mt_products
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
    price, original_price, 
    COALESCE(category, 'uncategorized') as category, -- Safe mapping from legacy column
    metadata, 
    image_url as cover_image_path, 
    is_active, sort_order, is_combo, combo_includes,
    CASE WHEN is_active THEN 'PUBLISHED' ELSE 'DRAFT' END as status
FROM mt_ebooks;
