-- Clinic contact on letterhead; doctor registration & signature; prescription PDF prefs; consultation mode

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS signature_object_key text,
  ADD COLUMN IF NOT EXISTS prescription_document_prefs jsonb NOT NULL DEFAULT '{"showClinicDetails":true,"showSignature":true,"showRegistrationNumber":true}'::jsonb;

COMMENT ON COLUMN public.profiles.signature_object_key IS 'S3 object key for uploaded signature image (document category)';
COMMENT ON COLUMN public.profiles.prescription_document_prefs IS 'Doctor toggles for PDF: showClinicDetails, showSignature, showRegistrationNumber';

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS consultation_mode text NOT NULL DEFAULT 'IN_CLINIC';

DO $$
BEGIN
  ALTER TABLE public.consultations
    ADD CONSTRAINT consultations_consultation_mode_check CHECK (
      consultation_mode IN ('IN_CLINIC', 'ONLINE')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultations_clinic_mode_open
  ON public.consultations (clinic_id, consultation_mode)
  WHERE ended_at IS NULL;
