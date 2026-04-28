-- Async patient → clinic messages for doctor inbox (dashboard rail).
CREATE TABLE IF NOT EXISTS public.patient_inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  body text NOT NULL,
  direction text NOT NULL,
  read_at timestamptz,
  created_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_inbox_messages_direction_check CHECK (direction IN ('PATIENT', 'CLINIC'))
);

CREATE INDEX IF NOT EXISTS idx_patient_inbox_clinic_created
  ON public.patient_inbox_messages (clinic_id, created_at DESC);

ALTER TABLE public.patient_inbox_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_inbox_rbac" ON public.patient_inbox_messages;
CREATE POLICY "patient_inbox_rbac" ON public.patient_inbox_messages
  FOR ALL
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );
