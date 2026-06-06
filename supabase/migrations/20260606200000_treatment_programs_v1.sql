-- Migration: 20260606200000_treatment_programs_v1.sql
-- Description: Core V1 database schema for Treatment Programs (Linear Timeline + Block Registry).

-- 1. PROGRAMS (The Core Protocol)
CREATE TABLE IF NOT EXISTS public.tp_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  duration_days int,
  status text CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. TIMELINE STEPS (Linear Execution Anchors)
CREATE TABLE IF NOT EXISTS public.tp_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.tp_programs(id) ON DELETE CASCADE,
  day_offset int NOT NULL, -- 0 = Day 1, 7 = Week 2 start
  title text NOT NULL,
  sort_order int DEFAULT 0
);

-- 3. UNIFIED BLOCKS (The Configurable Atoms)
CREATE TABLE IF NOT EXISTS public.tp_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.tp_steps(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'content', 'medical', 'tracking', 'assessment', 'media'
  block_type text NOT NULL, -- e.g., 'rich_text', 'mcq_form', 'weight_tracker'
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Block-specific schema
  sort_order int DEFAULT 0,
  is_required boolean DEFAULT false
);

-- 4. PATIENT EXECUTION (Active Assignments)
CREATE TABLE IF NOT EXISTS public.tp_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.tp_programs(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  current_day_offset int DEFAULT 0, -- Calculated daily by cron
  status text CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  completed_at timestamptz
);

-- 5. RESPONSES & TRACKING DATA
CREATE TABLE IF NOT EXISTS public.tp_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.tp_assignments(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.tp_blocks(id) ON DELETE CASCADE,
  response_data jsonb NOT NULL,
  score numeric, -- Optional computed metric
  submitted_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_tp_steps_prog ON public.tp_steps(program_id);
CREATE INDEX idx_tp_blocks_step ON public.tp_blocks(step_id);
CREATE INDEX idx_tp_assignments_pat ON public.tp_assignments(patient_id);
CREATE INDEX idx_tp_responses_assgn ON public.tp_responses(assignment_id);

-- Row Level Security (RLS) Configuration

ALTER TABLE public.tp_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_responses ENABLE ROW LEVEL SECURITY;

-- Basic Doctor/Clinic Policies (Assuming standard RLS based on clinic_id)
-- Note: Replace hardcoded auth patterns with the exact GlowHomeo app.current_clinic() patterns if standard.

CREATE POLICY "tp_programs_select" ON public.tp_programs FOR SELECT USING (clinic_id = (current_setting('app.current_clinic_id', true))::uuid);
CREATE POLICY "tp_programs_insert" ON public.tp_programs FOR INSERT WITH CHECK (clinic_id = (current_setting('app.current_clinic_id', true))::uuid);
CREATE POLICY "tp_programs_update" ON public.tp_programs FOR UPDATE USING (clinic_id = (current_setting('app.current_clinic_id', true))::uuid);
CREATE POLICY "tp_programs_delete" ON public.tp_programs FOR DELETE USING (clinic_id = (current_setting('app.current_clinic_id', true))::uuid);

CREATE POLICY "tp_steps_all" ON public.tp_steps FOR ALL USING (
  program_id IN (SELECT id FROM public.tp_programs WHERE clinic_id = (current_setting('app.current_clinic_id', true))::uuid)
);

CREATE POLICY "tp_blocks_all" ON public.tp_blocks FOR ALL USING (
  step_id IN (SELECT id FROM public.tp_steps WHERE program_id IN (SELECT id FROM public.tp_programs WHERE clinic_id = (current_setting('app.current_clinic_id', true))::uuid))
);

CREATE POLICY "tp_assignments_all" ON public.tp_assignments FOR ALL USING (
  program_id IN (SELECT id FROM public.tp_programs WHERE clinic_id = (current_setting('app.current_clinic_id', true))::uuid)
);

CREATE POLICY "tp_responses_all" ON public.tp_responses FOR ALL USING (
  assignment_id IN (SELECT id FROM public.tp_assignments WHERE program_id IN (SELECT id FROM public.tp_programs WHERE clinic_id = (current_setting('app.current_clinic_id', true))::uuid))
);
