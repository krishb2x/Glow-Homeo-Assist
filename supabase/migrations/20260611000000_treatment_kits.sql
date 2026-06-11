-- Migration: Add Treatment Kit management columns to mt_cases

-- 1. Update case_type CHECK constraint to allow 'treatment_kit'
ALTER TABLE public.mt_cases DROP CONSTRAINT IF EXISTS mt_cases_case_type_check;
ALTER TABLE public.mt_cases ADD CONSTRAINT mt_cases_case_type_check CHECK (case_type IN ('consultation', 'program', 'ebook', 'kit', 'treatment_kit', 'followup', 'other'));

-- 2. Update status CHECK constraint to allow approved, more information, and rejected statuses
ALTER TABLE public.mt_cases DROP CONSTRAINT IF EXISTS mt_cases_status_check;
ALTER TABLE public.mt_cases ADD CONSTRAINT mt_cases_status_check CHECK (status IN ('new', 'under_review', 'approved', 'more_information_required', 'rejected', 'assigned', 'patient_created', 'scheduled', 'completed', 'active_treatment', 'followup', 'closed'));

-- 3. Add columns for operations workflow, tracking, and treatment kit details
ALTER TABLE public.mt_cases
ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'doctor_review' CHECK (workflow_status IN ('doctor_review', 'address_collection', 'case_sheet_generation', 'packing_queue', 'ready_to_ship', 'on_the_way', 'delivered')),
ADD COLUMN IF NOT EXISTS treatment_type TEXT, -- Dynamic treatment type (e.g. hair-fall, skin, etc.)
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS courier_name TEXT,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS doctor_notes TEXT,
ADD COLUMN IF NOT EXISTS operations_notes TEXT,
ADD COLUMN IF NOT EXISTS shipping_notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


