-- Production hardening: recording consent audit trail.

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS recording_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS recording_consent_ip text;

CREATE INDEX IF NOT EXISTS idx_appointments_missed_today
  ON public.appointments (clinic_id, scheduled_for)
  WHERE consultation_mode = 'ONLINE' AND missed_at IS NOT NULL;
