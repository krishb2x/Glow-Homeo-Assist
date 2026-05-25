-- Online / telemedicine: appointments, patient access tokens, appointment reminders.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS consultation_mode text NOT NULL DEFAULT 'IN_CLINIC',
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS join_token uuid,
  ADD COLUMN IF NOT EXISTS notify_patient boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_consultation_mode_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_consultation_mode_check
  CHECK (consultation_mode IN ('IN_CLINIC', 'ONLINE'));

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_reminders
  ON public.appointments (clinic_id, scheduled_for)
  WHERE status IN ('REQUESTED', 'CONFIRMED') AND notify_patient = true;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS email text;

-- Secure patient links (join video, view prescription) — no login required; token + expiry.
CREATE TABLE IF NOT EXISTS public.patient_access_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  purpose         text NOT NULL,
  token           uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_access_tokens_purpose_check
    CHECK (purpose IN ('join_consultation', 'view_prescription', 'view_report')),
  CONSTRAINT patient_access_tokens_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_patient_access_token_lookup
  ON public.patient_access_tokens (token);

ALTER TABLE public.patient_access_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patient_access_tokens_service" ON public.patient_access_tokens;
CREATE POLICY "patient_access_tokens_service" ON public.patient_access_tokens
  FOR ALL TO authenticated
  USING (public.is_platform_super_admin() OR clinic_id = public.current_profile_clinic_id())
  WITH CHECK (public.is_platform_super_admin() OR clinic_id = public.current_profile_clinic_id());

ALTER TABLE public.video_sessions DROP CONSTRAINT IF EXISTS video_sessions_status_check;
ALTER TABLE public.video_sessions
  ADD CONSTRAINT video_sessions_status_check
  CHECK (status IN ('PROVISIONED', 'LIVE', 'ENDED', 'FAILED', 'RECORDING'));
