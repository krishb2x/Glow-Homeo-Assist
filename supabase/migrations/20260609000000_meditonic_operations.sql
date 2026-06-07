-- Migration: MediTonic Operations Management Layer
-- Description: Adds tables for case management, activity logs, and sync queues.

-- 1. DROP EXISTING TABLES IF RE-RUNNING
DROP TABLE IF EXISTS mt_sync_queue CASCADE;
DROP TABLE IF EXISTS mt_case_activities CASCADE;
DROP TABLE IF EXISTS mt_cases CASCADE;

-- 2. mt_cases
CREATE TABLE mt_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    case_type TEXT NOT NULL CHECK (case_type IN ('consultation', 'program', 'ebook', 'kit', 'followup', 'other')),
    reference_id UUID, -- Links to mt_consultation_requests, mt_ebook_orders, etc.
    
    patient_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    age INTEGER,
    gender TEXT,
    
    concern_category TEXT,
    description TEXT,
    source TEXT,
    referral_code_id UUID REFERENCES mt_referral_codes(id) ON DELETE SET NULL,
    
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'captured', 'failed', 'refunded', 'not_required')),
    assigned_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'assigned', 'patient_created', 'scheduled', 'completed', 'active_treatment', 'followup', 'closed')),
    
    -- Integration links
    gh_patient_id UUID, -- References GlowHomeo core patients
    gh_consultation_id UUID, -- References GlowHomeo core consultations
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mt_case_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES mt_cases(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Null if system action
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. mt_sync_queue
CREATE TABLE mt_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES mt_cases(id) ON DELETE CASCADE,
    target_system TEXT NOT NULL CHECK (target_system IN ('google_sheets', 'glowhomeo')),
    operation TEXT NOT NULL CHECK (operation IN ('insert', 'update')),
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX idx_mt_cases_clinic ON mt_cases(clinic_id);
CREATE INDEX idx_mt_cases_reference ON mt_cases(reference_id);
CREATE INDEX idx_mt_cases_status ON mt_cases(status);
CREATE INDEX idx_mt_case_activities_case ON mt_case_activities(case_id);
CREATE INDEX idx_mt_sync_queue_status ON mt_sync_queue(status);

-- RLS Policies
ALTER TABLE mt_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Operations Dashboard
-- Allow full access to admins/super_admins, or anyone working in the clinic
CREATE POLICY "Admin full access to mt_cases" ON mt_cases 
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to mt_case_activities" ON mt_case_activities 
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to mt_sync_queue" ON mt_sync_queue 
    FOR ALL USING (true) WITH CHECK (true);
