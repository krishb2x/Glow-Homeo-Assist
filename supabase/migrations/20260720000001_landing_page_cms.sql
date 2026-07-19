-- =================================================================================
-- Migration: Website CMS and Homepage Builder
-- Description: Introduces Media Library, Landing Pages, Sections, Items, and CTAs
-- =================================================================================

BEGIN;

-- 1. Media Library
CREATE TABLE IF NOT EXISTS public.mt_media_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    folder_path TEXT DEFAULT '/',
    alt_text TEXT,
    tags TEXT[],
    width INT,
    height INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Landing Pages
CREATE TABLE IF NOT EXISTS public.mt_landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    seo_title TEXT,
    meta_description TEXT,
    og_image_id UUID REFERENCES public.mt_media_library(id) ON DELETE SET NULL,
    canonical_url TEXT,
    index_status TEXT DEFAULT 'index', -- 'index' or 'noindex'
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Published', 'Scheduled'
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id, slug)
);

-- 3. CTA Blocks
CREATE TABLE IF NOT EXISTS public.mt_cta_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    button_text TEXT NOT NULL,
    button_link TEXT NOT NULL,
    style TEXT DEFAULT 'primary', -- 'primary', 'secondary', 'outline', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Announcement Bars
CREATE TABLE IF NOT EXISTS public.mt_announcement_bars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    bg_color TEXT,
    text_color TEXT,
    link_url TEXT,
    target_pages TEXT[] DEFAULT '{"all"}', -- 'all', 'homepage', 'product', 'category', 'cart', 'checkout'
    status TEXT DEFAULT 'Draft',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Promotion Banners
CREATE TABLE IF NOT EXISTS public.mt_promotion_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB,
    target_pages TEXT[] DEFAULT '{"homepage"}', 
    status TEXT DEFAULT 'Draft',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Landing Page Sections
CREATE TABLE IF NOT EXISTS public.mt_landing_page_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.mt_landing_pages(id) ON DELETE CASCADE,
    slug TEXT NOT NULL, -- 'hero', 'trust-strip', 'categories', 'best-sellers', 'reviews', 'youtube', etc.
    display_order INT NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Published',
    settings JSONB, -- stores layout configs: title, subtitle, bg_color, max_items, etc.
    bg_image_id UUID REFERENCES public.mt_media_library(id) ON DELETE SET NULL,
    cta_block_id UUID REFERENCES public.mt_cta_blocks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Landing Page Items
CREATE TABLE IF NOT EXISTS public.mt_landing_page_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES public.mt_landing_page_sections(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Published',
    -- Relational fields for specific item types:
    product_id UUID REFERENCES public.mt_products(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.mt_categories(id) ON DELETE SET NULL,
    media_id_desktop UUID REFERENCES public.mt_media_library(id) ON DELETE SET NULL,
    media_id_mobile UUID REFERENCES public.mt_media_library(id) ON DELETE SET NULL,
    -- JSONB for misc presentation configurations (e.g. alignment, overlay opacity, youtube url)
    item_settings JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Reviews
CREATE TABLE IF NOT EXISTS public.mt_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.mt_products(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL,
    reviewer_photo_id UUID REFERENCES public.mt_media_library(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    is_verified_purchase BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================
-- Enable RLS & Add Policies
-- ==========================================

-- Enable RLS
ALTER TABLE public.mt_media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_cta_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_announcement_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_promotion_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_landing_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_landing_page_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_reviews ENABLE ROW LEVEL SECURITY;


-- Allow public read access to all these tables (they are frontend content)
CREATE POLICY "Public can view media library" ON public.mt_media_library FOR SELECT USING (true);
CREATE POLICY "Public can view landing pages" ON public.mt_landing_pages FOR SELECT USING (true);
CREATE POLICY "Public can view cta blocks" ON public.mt_cta_blocks FOR SELECT USING (true);
CREATE POLICY "Public can view announcement bars" ON public.mt_announcement_bars FOR SELECT USING (true);
CREATE POLICY "Public can view promotion banners" ON public.mt_promotion_banners FOR SELECT USING (true);
CREATE POLICY "Public can view landing page sections" ON public.mt_landing_page_sections FOR SELECT USING (true);
CREATE POLICY "Public can view landing page items" ON public.mt_landing_page_items FOR SELECT USING (true);
CREATE POLICY "Public can view reviews" ON public.mt_reviews FOR SELECT USING (true);


-- Allow admins to manage all these tables
CREATE OR REPLACE FUNCTION public.is_admin_or_owner() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner', 'superadmin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins manage media library" ON public.mt_media_library FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Admins manage landing pages" ON public.mt_landing_pages FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Admins manage cta blocks" ON public.mt_cta_blocks FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Admins manage announcement bars" ON public.mt_announcement_bars FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Admins manage promotion banners" ON public.mt_promotion_banners FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Admins manage landing page sections" ON public.mt_landing_page_sections FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Admins manage landing page items" ON public.mt_landing_page_items FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Admins manage reviews" ON public.mt_reviews FOR ALL USING (public.is_admin_or_owner());


COMMIT;
