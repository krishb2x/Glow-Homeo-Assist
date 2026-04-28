-- Clinical continuity: richer patient profile, patient-scoped documents, follow-up status writes
-- Idempotent — safe to re-run.

-- 1) Patients: clinically-relevant fields beyond demographics
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS ongoing_conditions text,
  ADD COLUMN IF NOT EXISTS tags text[];

COMMENT ON COLUMN public.patients.allergies IS 'Free-text allergies / sensitivities, surfaced on chart header';
COMMENT ON COLUMN public.patients.emergency_contact_name IS 'Name for urgent contact';
COMMENT ON COLUMN public.patients.emergency_contact_phone IS 'Phone for urgent contact';
COMMENT ON COLUMN public.patients.blood_group IS 'Blood group label (e.g. O+, AB-)';
COMMENT ON COLUMN public.patients.ongoing_conditions IS 'Free-text long-term conditions / current Rx outside our system';
COMMENT ON COLUMN public.patients.tags IS 'Operational tags shown in list and chart (chronic / acute / first_visit / follow_up etc.)';

-- 2) file_objects: allow patient-scoped documents (not tied to a single consultation).
-- Existing column `consultation_id` stays optional; we add `patient_id` so patient-level uploads are easy.
ALTER TABLE public.file_objects
  ADD COLUMN IF NOT EXISTS patient_id uuid;

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'file_objects_patient_id_fkey' AND conrelid = 'public.file_objects'::regclass
  ) THEN
    ALTER TABLE public.file_objects
      ADD CONSTRAINT file_objects_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients (id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END
$fk$;

CREATE INDEX IF NOT EXISTS idx_file_objects_clinic_patient
  ON public.file_objects (clinic_id, patient_id, created_at DESC);

-- 3) Backfill patient_id from consultations for existing rows (best-effort; safe to run repeatedly)
UPDATE public.file_objects f
SET patient_id = c.patient_id
FROM public.consultations c
WHERE f.consultation_id = c.id
  AND f.patient_id IS NULL;
