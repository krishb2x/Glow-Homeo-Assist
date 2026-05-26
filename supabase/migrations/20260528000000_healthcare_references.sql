-- Readable healthcare reference IDs (patient, visit) and consultation follow-up symptoms.

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS short_code text;

COMMENT ON COLUMN public.clinics.short_code IS '3–4 letter clinic identifier for GH-XXX-##### patient codes';

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS patient_code text;

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS visit_code text,
  ADD COLUMN IF NOT EXISTS symptoms_to_monitor text[];

CREATE TABLE IF NOT EXISTS public.clinic_reference_counters (
  clinic_id uuid PRIMARY KEY REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_seq bigint NOT NULL DEFAULT 0,
  visit_seq bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS patients_clinic_patient_code_uq
  ON public.patients (clinic_id, patient_code)
  WHERE patient_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS consultations_clinic_visit_code_uq
  ON public.consultations (clinic_id, visit_code)
  WHERE visit_code IS NOT NULL;

-- Derive short_code from slug or clinic name for existing rows.
UPDATE public.clinics
SET short_code = COALESCE(
  NULLIF(UPPER(LEFT(REGEXP_REPLACE(COALESCE(slug, name), '[^A-Za-z]', '', 'g'), 3)), ''),
  'CLN'
)
WHERE short_code IS NULL OR TRIM(short_code) = '';

CREATE OR REPLACE FUNCTION public.clinic_code_prefix(p_clinic_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(UPPER(LEFT(TRIM(short_code), 4)), ''),
    'CLN'
  )
  FROM public.clinics
  WHERE id = p_clinic_id;
$$;

CREATE OR REPLACE FUNCTION public.allocate_patient_code(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq bigint;
  v_prefix text;
BEGIN
  INSERT INTO public.clinic_reference_counters (clinic_id, patient_seq, visit_seq)
  VALUES (p_clinic_id, 1, 0)
  ON CONFLICT (clinic_id) DO UPDATE
    SET patient_seq = clinic_reference_counters.patient_seq + 1,
        updated_at = now()
  RETURNING patient_seq INTO v_seq;

  v_prefix := public.clinic_code_prefix(p_clinic_id);
  RETURN 'GH-' || v_prefix || '-' || LPAD(v_seq::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_visit_code(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq bigint;
  v_prefix text;
  v_ym text;
BEGIN
  v_ym := to_char(now() AT TIME ZONE 'UTC', 'YYYYMM');

  INSERT INTO public.clinic_reference_counters (clinic_id, patient_seq, visit_seq)
  VALUES (p_clinic_id, 0, 1)
  ON CONFLICT (clinic_id) DO UPDATE
    SET visit_seq = clinic_reference_counters.visit_seq + 1,
        updated_at = now()
  RETURNING visit_seq INTO v_seq;

  v_prefix := public.clinic_code_prefix(p_clinic_id);
  RETURN 'GH-' || v_prefix || '-V' || v_ym || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

-- Backfill patient codes for existing patients (ordered by created_at per clinic).
WITH numbered AS (
  SELECT
    p.id,
    p.clinic_id,
    ROW_NUMBER() OVER (PARTITION BY p.clinic_id ORDER BY p.created_at ASC, p.id ASC) AS rn
  FROM public.patients p
  WHERE p.patient_code IS NULL
)
UPDATE public.patients p
SET patient_code = 'GH-' || public.clinic_code_prefix(p.clinic_id) || '-' || LPAD(n.rn::text, 5, '0')
FROM numbered n
WHERE p.id = n.id;

-- Sync counters after backfill.
INSERT INTO public.clinic_reference_counters (clinic_id, patient_seq, visit_seq)
SELECT clinic_id, COALESCE(MAX(CAST(SPLIT_PART(patient_code, '-', 3) AS bigint)), 0), 0
FROM public.patients
WHERE patient_code IS NOT NULL
GROUP BY clinic_id
ON CONFLICT (clinic_id) DO UPDATE
SET patient_seq = GREATEST(clinic_reference_counters.patient_seq, EXCLUDED.patient_seq);

-- Backfill visit codes for consultations missing one.
WITH numbered AS (
  SELECT
    c.id,
    c.clinic_id,
    c.started_at,
    ROW_NUMBER() OVER (
      PARTITION BY c.clinic_id, to_char(c.started_at AT TIME ZONE 'UTC', 'YYYYMM')
      ORDER BY c.started_at ASC, c.id ASC
    ) AS rn
  FROM public.consultations c
  WHERE c.visit_code IS NULL
)
UPDATE public.consultations c
SET visit_code =
  'GH-' || public.clinic_code_prefix(c.clinic_id) || '-V'
  || to_char(n.started_at AT TIME ZONE 'UTC', 'YYYYMM') || '-'
  || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE c.id = n.id;
