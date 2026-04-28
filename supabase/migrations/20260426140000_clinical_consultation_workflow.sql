-- Clinical workflow: patient demographics, consultation lifecycle, structured clinical_record, advice, PDF prefs

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS patient_notes text;

COMMENT ON COLUMN public.patients.patient_notes IS 'General chart notes (not chief complaint)';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credentials text;

COMMENT ON COLUMN public.profiles.credentials IS 'Optional degrees / registration line for prescriptions (e.g. BHMS, Reg. no.)';

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS clinical_record jsonb NOT NULL DEFAULT '{}'::jsonb,                                                                                            
  ADD COLUMN IF NOT EXISTS clinical_record_version integer NOT NULL DEFAULT 0,                                                                              
  ADD COLUMN IF NOT EXISTS advice jsonb NOT NULL DEFAULT '{"diet":"","lifestyle":""}'::jsonb,
  ADD COLUMN IF NOT EXISTS follow_up_recommended_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_note text,
  ADD COLUMN IF NOT EXISTS editing_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.consultations
    ADD CONSTRAINT consultations_lifecycle_status_check CHECK (
      lifecycle_status IN ('DRAFT', 'ACTIVE', 'REVIEWING', 'FINALIZED')
    );
EXCEPTION                                                                                                                           
  WHEN duplicate_object THEN NULL;
END $$;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
CREATE INDEX IF NOT EXISTS idx_consultations_clinic_lifecycle
  ON public.consultations (clinic_id, lifecycle_status);

UPDATE public.consultations
SET lifecycle_status = 'FINALIZED',
    finalized_at = COALESCE(finalized_at, ended_at)
WHERE ended_at IS NOT NULL
  AND lifecycle_status IS DISTINCT FROM 'FINALIZED';
