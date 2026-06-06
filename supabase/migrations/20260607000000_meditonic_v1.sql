-- MediTonic Standalone Website DB Schema (v1.0)
-- Prefix: mt_ (MediTonic) to avoid conflicts with main GlowHomeo tables
-- Connected via clinic_id foreign key where relevant

-- 1. Patients (Leads & Registered)
CREATE TABLE mt_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, phone)
);

-- 2. Consultation Requests (Booking Flow)
CREATE TYPE mt_consultation_type AS ENUM ('initial_online', 'initial_clinic', 'follow_up_online', 'emergency');
CREATE TYPE mt_consultation_status AS ENUM ('pending_payment', 'confirmed', 'completed', 'cancelled');

CREATE TABLE mt_consultation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES mt_patients(id),
    type mt_consultation_type NOT NULL,
    concern_category TEXT NOT NULL,
    concern_description TEXT,
    preferred_date DATE,
    preferred_time_slot TEXT,
    status mt_consultation_status DEFAULT 'pending_payment',
    price_charged NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payments (Razorpay Direct to Doctor)
CREATE TYPE mt_payment_status AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded');

CREATE TABLE mt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES mt_patients(id),
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    status mt_payment_status DEFAULT 'created',
    purpose TEXT NOT NULL, -- 'consultation', 'program', 'ebook'
    reference_id UUID, -- Links to consultation_requests or ebook_orders
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Program Enrollments
CREATE TABLE mt_program_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES mt_patients(id),
    program_slug TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, cancelled
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    price_charged NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. eBooks (Digital Products)
CREATE TABLE mt_ebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    cover_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. eBook Orders (Manual Delivery Tracking)
CREATE TABLE mt_ebook_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES mt_patients(id),
    total_amount NUMERIC(10,2) NOT NULL,
    payment_status mt_payment_status DEFAULT 'created',
    delivery_status TEXT DEFAULT 'pending', -- pending, delivered
    delivered_at TIMESTAMPTZ,
    delivered_via TEXT, -- 'whatsapp', 'email'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mt_ebook_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES mt_ebook_orders(id) ON DELETE CASCADE,
    ebook_id UUID NOT NULL REFERENCES mt_ebooks(id),
    price NUMERIC(10,2) NOT NULL
);

-- 7. Content (Videos, Blogs, Testimonials)
CREATE TABLE mt_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    youtube_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration TEXT,
    category TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mt_blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    excerpt TEXT,
    cover_image_url TEXT,
    category TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mt_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    condition TEXT NOT NULL,
    category TEXT NOT NULL,
    quote TEXT NOT NULL,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    duration TEXT,
    video_url TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Leads & Contacts
CREATE TABLE mt_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT, -- 'newsletter', 'ebook_download', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mt_contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new', -- new, read, replied
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
-- API uses service_role key to bypass RLS, so public access is strictly restricted.
ALTER TABLE mt_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_ebook_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_ebook_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_contact_requests ENABLE ROW LEVEL SECURITY;

-- Public can read active eBooks, Videos, Blogs, and approved Testimonials
ALTER TABLE mt_ebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active eBooks" ON mt_ebooks FOR SELECT USING (is_active = TRUE);

ALTER TABLE mt_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view videos" ON mt_videos FOR SELECT USING (true);

ALTER TABLE mt_blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published blogs" ON mt_blog_posts FOR SELECT USING (is_published = TRUE);

ALTER TABLE mt_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view approved testimonials" ON mt_testimonials FOR SELECT USING (is_approved = TRUE);

-- Indexes for performance
CREATE INDEX idx_mt_consultation_reqs_clinic ON mt_consultation_requests(clinic_id);
CREATE INDEX idx_mt_payments_order_id ON mt_payments(razorpay_order_id);
CREATE INDEX idx_mt_videos_category ON mt_videos(category);
CREATE INDEX idx_mt_blog_posts_category ON mt_blog_posts(category);
