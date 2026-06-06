-- 1. Modify whatsapp_connections to support channel_type
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS channel_type VARCHAR(20) DEFAULT 'CLINICAL' CHECK (channel_type IN ('AUTOMATED', 'CLINICAL'));

-- Drop the old unique constraint (one connection per doctor)
ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_one_per_doctor;

-- Add new unique constraint (one connection per channel per clinic)
ALTER TABLE public.whatsapp_connections
  ADD CONSTRAINT whatsapp_connections_one_per_channel_per_clinic UNIQUE (clinic_id, channel_type);

-- 2. Create whatsapp_sessions table
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('AUTOMATED', 'CLINICAL')),
  session_starts_at timestamptz NOT NULL,
  session_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_sessions_clinic_patient_channel UNIQUE (clinic_id, patient_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires
  ON public.whatsapp_sessions (session_expires_at);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_sessions_rbac" ON public.whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_rbac" ON public.whatsapp_sessions
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- Force schema reload
NOTIFY pgrst, 'reload schema';
