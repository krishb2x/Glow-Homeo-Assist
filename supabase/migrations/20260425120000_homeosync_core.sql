-- HomeoSync: additive changes on top of docs/sql/rbac_foundation.sql
-- Run after RBAC foundation. Safe to re-run: uses IF NOT EXISTS / OR REPLACE.

-- ---------------------------------------------------------------------------
-- Consultations: complexity + optional appointment; prefer attending_user_id for doctor
-- ---------------------------------------------------------------------------
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS complexity text NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS appointment_id uuid;

COMMENT ON COLUMN public.consultations.complexity IS 'SIMPLE | STANDARD | COMPLEX | URGENT';

-- ---------------------------------------------------------------------------
-- follow_ups (extend legacy table: title + due_at + …)
-- ---------------------------------------------------------------------------
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS case_outcome_expected text,
  ADD COLUMN IF NOT EXISTS symptoms_to_monitor text[],
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_channel text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.follow_ups SET reason = COALESCE(NULLIF(TRIM(title), ''), 'Follow-up') WHERE reason IS NULL;
ALTER TABLE public.follow_ups ALTER COLUMN reason SET NOT NULL;
ALTER TABLE public.follow_ups ALTER COLUMN reason SET DEFAULT 'Follow-up';

-- ---------------------------------------------------------------------------
-- Appointments (new)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  scheduled_for timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'CONFIRMED',
  reason text,
  follow_up_to_consultation_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_status_check CHECK (
    status IN ('REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  CONSTRAINT appointments_unique_patient_time UNIQUE (patient_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_scheduled
  ON public.appointments (clinic_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_scheduled
  ON public.appointments (doctor_id, scheduled_for);

-- ---------------------------------------------------------------------------
-- Case outcomes (new)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES public.consultations (id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  outcome text NOT NULL,
  assessment text,
  symptoms_resolved text[],
  symptoms_improved text[],
  symptoms_worsened text[],
  recommended_action text,
  documented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_outcomes_outcome_check CHECK (
    outcome IN ('CURE', 'IMPROVEMENT', 'PALLIATION', 'NO_CHANGE', 'WORSE')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS case_outcomes_one_per_consultation
  ON public.case_outcomes (consultation_id);

-- Optional FK: appointments -> consultations (follow-up link)
DO $$
BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_follow_up_to_consultation_id_fkey
    FOREIGN KEY (follow_up_to_consultation_id) REFERENCES public.consultations (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.consultations
    ADD CONSTRAINT consultations_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.appointments (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- RLS: new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_rbac" ON public.appointments;
CREATE POLICY "appointments_rbac" ON public.appointments
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

DROP POLICY IF EXISTS "case_outcomes_rbac" ON public.case_outcomes;
CREATE POLICY "case_outcomes_rbac" ON public.case_outcomes
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

UPDATE public.follow_ups SET status = 'PENDING' WHERE status IS NULL;

DO $$
BEGIN
  ALTER TABLE public.follow_ups
    ADD CONSTRAINT follow_ups_status_check CHECK (
      status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill attending_user_id on consultations from patient’s doctor when empty
UPDATE public.consultations c
SET attending_user_id = p.assigned_doctor_id
FROM public.patients p
WHERE c.patient_id = p.id
  AND c.attending_user_id IS NULL
  AND p.assigned_doctor_id IS NOT NULL;
