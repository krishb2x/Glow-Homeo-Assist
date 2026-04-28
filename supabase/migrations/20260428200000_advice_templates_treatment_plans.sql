-- ─────────────────────────────────────────────────────────────────────────────
-- advice_templates: doctor-curated reusable advice blocks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advice_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid NOT NULL,
  doctor_id    uuid NOT NULL,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  category     text NOT NULL CHECK (category IN ('diet', 'lifestyle', 'restriction')),
  content      text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  is_shared    boolean NOT NULL DEFAULT false,  -- share with all doctors in clinic
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DO $fk$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'advice_templates_clinic_id_fkey'
      AND conrelid = 'public.advice_templates'::regclass
  ) THEN
    ALTER TABLE public.advice_templates
      ADD CONSTRAINT advice_templates_clinic_id_fkey
      FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL;
END $fk$;

CREATE INDEX IF NOT EXISTS idx_advice_templates_clinic_doctor
  ON public.advice_templates (clinic_id, doctor_id, category, created_at DESC);

-- RLS
ALTER TABLE public.advice_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advice_templates_select" ON public.advice_templates;
CREATE POLICY "advice_templates_select" ON public.advice_templates
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (doctor_id = auth.uid() OR is_shared = true)
  );

DROP POLICY IF EXISTS "advice_templates_insert" ON public.advice_templates;
CREATE POLICY "advice_templates_insert" ON public.advice_templates
  FOR INSERT WITH CHECK (
    doctor_id = auth.uid()
    AND clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "advice_templates_update" ON public.advice_templates;
CREATE POLICY "advice_templates_update" ON public.advice_templates
  FOR UPDATE USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "advice_templates_delete" ON public.advice_templates;
CREATE POLICY "advice_templates_delete" ON public.advice_templates
  FOR DELETE USING (doctor_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- treatment_plans: structured combinations of advice for reuse across patients
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            uuid NOT NULL,
  doctor_id            uuid NOT NULL,
  title                text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description          text CHECK (char_length(description) <= 2000),
  diet_advice          text CHECK (char_length(diet_advice) <= 4000),
  lifestyle_advice     text CHECK (char_length(lifestyle_advice) <= 4000),
  restriction_advice   text CHECK (char_length(restriction_advice) <= 4000),
  -- remedy_guidelines: free-text guidance (e.g. potency notes, dosing philosophy)
  remedy_guidelines    text CHECK (char_length(remedy_guidelines) <= 4000),
  -- linked_template_ids: optional references to advice_templates for quick apply
  linked_template_ids  uuid[],
  is_shared            boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DO $fk2$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'treatment_plans_clinic_id_fkey'
      AND conrelid = 'public.treatment_plans'::regclass
  ) THEN
    ALTER TABLE public.treatment_plans
      ADD CONSTRAINT treatment_plans_clinic_id_fkey
      FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL;
END $fk2$;

CREATE INDEX IF NOT EXISTS idx_treatment_plans_clinic_doctor
  ON public.treatment_plans (clinic_id, doctor_id, created_at DESC);

-- RLS
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatment_plans_select" ON public.treatment_plans;
CREATE POLICY "treatment_plans_select" ON public.treatment_plans
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (doctor_id = auth.uid() OR is_shared = true)
  );

DROP POLICY IF EXISTS "treatment_plans_insert" ON public.treatment_plans;
CREATE POLICY "treatment_plans_insert" ON public.treatment_plans
  FOR INSERT WITH CHECK (
    doctor_id = auth.uid()
    AND clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "treatment_plans_update" ON public.treatment_plans;
CREATE POLICY "treatment_plans_update" ON public.treatment_plans
  FOR UPDATE USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "treatment_plans_delete" ON public.treatment_plans;
CREATE POLICY "treatment_plans_delete" ON public.treatment_plans
  FOR DELETE USING (doctor_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend clinics: add address field if not present
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS registration_number text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend profiles: full_name editable, specialty field
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS specialty text;
