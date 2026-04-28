-- Add date_of_birth to patients; keep age as a computed convenience column.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Back-fill a rough DOB from age where we have it and no DOB yet.
-- Uses "today minus age years" as a placeholder — real data should be entered.
UPDATE public.patients
SET date_of_birth = (CURRENT_DATE - (age || ' years')::interval)::date
WHERE age IS NOT NULL AND date_of_birth IS NULL;

COMMENT ON COLUMN public.patients.date_of_birth IS
  'Actual date of birth. Preferred over the age integer for clinical accuracy.';
