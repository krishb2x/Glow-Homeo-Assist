-- Structured Patient Care Plan Library (templates, blocks, media)

-- ── Reusable media assets (YouTube, links, PDFs, images) ───────────────────
CREATE TABLE IF NOT EXISTS public.care_plan_media (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL,
  doctor_id         uuid NOT NULL,
  media_type        text NOT NULL CHECK (media_type IN (
    'youtube', 'link', 'pdf', 'image', 'infographic', 'food_chart', 'illustration'
  )),
  source_url        text NOT NULL CHECK (char_length(source_url) BETWEEN 4 AND 2000),
  title             text NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  description       text CHECK (char_length(description) <= 4000),
  thumbnail_url     text CHECK (char_length(thumbnail_url) <= 2000),
  duration_seconds  int CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  channel_name      text CHECK (char_length(channel_name) <= 200),
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DO $fk_media$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'care_plan_media_clinic_id_fkey'
      AND conrelid = 'public.care_plan_media'::regclass
  ) THEN
    ALTER TABLE public.care_plan_media
      ADD CONSTRAINT care_plan_media_clinic_id_fkey
      FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL;
END $fk_media$;

CREATE INDEX IF NOT EXISTS idx_care_plan_media_clinic
  ON public.care_plan_media (clinic_id, doctor_id, media_type, created_at DESC);

-- ── Care plan templates (metadata + versioning) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.care_plan_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           uuid NOT NULL,
  doctor_id           uuid NOT NULL,
  title               text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  slug                text NOT NULL CHECK (char_length(slug) BETWEEN 1 AND 120),
  summary             text CHECK (char_length(summary) <= 2000),
  primary_category    text NOT NULL DEFAULT 'wellness_plan' CHECK (primary_category IN (
    'wellness_plan', 'diet_protocol', 'recovery_journey', 'lifestyle_plan',
    'disease_protocol', 'followup_guidance', 'education_module', 'custom'
  )),
  disease_tags        text[] NOT NULL DEFAULT '{}',
  symptom_tags        text[] NOT NULL DEFAULT '{}',
  patient_types       text[] NOT NULL DEFAULT '{}',
  age_groups          text[] NOT NULL DEFAULT '{}',
  severity            text NOT NULL DEFAULT 'any' CHECK (severity IN (
    'any', 'mild', 'moderate', 'severe'
  )),
  visibility          text NOT NULL DEFAULT 'private' CHECK (visibility IN (
    'private', 'clinic', 'archived'
  )),
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'archived'
  )),
  version             int NOT NULL DEFAULT 1 CHECK (version >= 1),
  locale              text NOT NULL DEFAULT 'en' CHECK (char_length(locale) BETWEEN 2 AND 12),
  is_shared           boolean NOT NULL DEFAULT false,
  source_template_id  uuid REFERENCES public.care_plan_templates(id) ON DELETE SET NULL,
  usage_count         int NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, slug)
);

DO $fk_tpl$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'care_plan_templates_clinic_id_fkey'
      AND conrelid = 'public.care_plan_templates'::regclass
  ) THEN
    ALTER TABLE public.care_plan_templates
      ADD CONSTRAINT care_plan_templates_clinic_id_fkey
      FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL;
END $fk_tpl$;

CREATE INDEX IF NOT EXISTS idx_care_plan_templates_clinic_list
  ON public.care_plan_templates (
    clinic_id, status, primary_category, updated_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_care_plan_templates_tags
  ON public.care_plan_templates USING gin (disease_tags);

CREATE INDEX IF NOT EXISTS idx_care_plan_templates_symptom_tags
  ON public.care_plan_templates USING gin (symptom_tags);

-- ── Modular content blocks ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.care_plan_blocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES public.care_plan_templates(id) ON DELETE CASCADE,
  block_type    text NOT NULL CHECK (block_type IN (
    'diet', 'allowed_foods', 'restricted_foods', 'routines', 'lifestyle', 'exercise',
    'meditation', 'sleep', 'hydration', 'precautions', 'faqs', 'educational_content',
    'awareness_notes', 'followup_guidance', 'symptom_tracking', 'wellness_tasks',
    'medication_guidance', 'custom_blocks'
  )),
  title         text NOT NULL DEFAULT '' CHECK (char_length(title) <= 200),
  sort_order    int NOT NULL DEFAULT 0,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_plan_blocks_template
  ON public.care_plan_blocks (template_id, sort_order ASC);

-- ── Template ↔ media junction ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.care_plan_template_media (
  template_id   uuid NOT NULL REFERENCES public.care_plan_templates(id) ON DELETE CASCADE,
  media_id      uuid NOT NULL REFERENCES public.care_plan_media(id) ON DELETE CASCADE,
  block_id      uuid REFERENCES public.care_plan_blocks(id) ON DELETE SET NULL,
  sort_order    int NOT NULL DEFAULT 0,
  caption       text CHECK (char_length(caption) <= 500),
  PRIMARY KEY (template_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_care_plan_template_media_block
  ON public.care_plan_template_media (template_id, block_id, sort_order);

-- ── Doctor favorites & recent usage ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.care_plan_favorites (
  doctor_id     uuid NOT NULL,
  template_id   uuid NOT NULL REFERENCES public.care_plan_templates(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (doctor_id, template_id)
);

CREATE TABLE IF NOT EXISTS public.care_plan_recent_usage (
  doctor_id     uuid NOT NULL,
  template_id   uuid NOT NULL REFERENCES public.care_plan_templates(id) ON DELETE CASCADE,
  used_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (doctor_id, template_id)
);

-- ── RLS: care_plan_media ─────────────────────────────────────────────────────
ALTER TABLE public.care_plan_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_plan_media_select" ON public.care_plan_media;
CREATE POLICY "care_plan_media_select" ON public.care_plan_media
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    AND (doctor_id = auth.uid() OR is_shared = true)
  );

DROP POLICY IF EXISTS "care_plan_media_insert" ON public.care_plan_media;
CREATE POLICY "care_plan_media_insert" ON public.care_plan_media
  FOR INSERT WITH CHECK (
    doctor_id = auth.uid()
    AND clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "care_plan_media_update" ON public.care_plan_media;
CREATE POLICY "care_plan_media_update" ON public.care_plan_media
  FOR UPDATE USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "care_plan_media_delete" ON public.care_plan_media;
CREATE POLICY "care_plan_media_delete" ON public.care_plan_media
  FOR DELETE USING (doctor_id = auth.uid());

-- ── RLS: care_plan_templates ─────────────────────────────────────────────────
ALTER TABLE public.care_plan_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_plan_templates_select" ON public.care_plan_templates;
CREATE POLICY "care_plan_templates_select" ON public.care_plan_templates
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    AND (doctor_id = auth.uid() OR is_shared = true OR visibility = 'clinic')
    AND status <> 'archived'
  );

DROP POLICY IF EXISTS "care_plan_templates_insert" ON public.care_plan_templates;
CREATE POLICY "care_plan_templates_insert" ON public.care_plan_templates
  FOR INSERT WITH CHECK (
    doctor_id = auth.uid()
    AND clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "care_plan_templates_update" ON public.care_plan_templates;
CREATE POLICY "care_plan_templates_update" ON public.care_plan_templates
  FOR UPDATE USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "care_plan_templates_delete" ON public.care_plan_templates;
CREATE POLICY "care_plan_templates_delete" ON public.care_plan_templates
  FOR DELETE USING (doctor_id = auth.uid());

-- ── RLS: care_plan_blocks (via template ownership) ─────────────────────────
ALTER TABLE public.care_plan_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_plan_blocks_select" ON public.care_plan_blocks;
CREATE POLICY "care_plan_blocks_select" ON public.care_plan_blocks
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates
      WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
        AND (doctor_id = auth.uid() OR is_shared = true OR visibility = 'clinic')
    )
  );

DROP POLICY IF EXISTS "care_plan_blocks_insert" ON public.care_plan_blocks;
CREATE POLICY "care_plan_blocks_insert" ON public.care_plan_blocks
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM public.care_plan_templates WHERE doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "care_plan_blocks_update" ON public.care_plan_blocks;
CREATE POLICY "care_plan_blocks_update" ON public.care_plan_blocks
  FOR UPDATE USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates WHERE doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "care_plan_blocks_delete" ON public.care_plan_blocks;
CREATE POLICY "care_plan_blocks_delete" ON public.care_plan_blocks
  FOR DELETE USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates WHERE doctor_id = auth.uid()
    )
  );

-- ── RLS: junction & favorites ────────────────────────────────────────────────
ALTER TABLE public.care_plan_template_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_recent_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_plan_template_media_all" ON public.care_plan_template_media;
CREATE POLICY "care_plan_template_media_all" ON public.care_plan_template_media
  FOR ALL USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates
      WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
        AND (doctor_id = auth.uid() OR is_shared = true)
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.care_plan_templates WHERE doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "care_plan_favorites_all" ON public.care_plan_favorites;
CREATE POLICY "care_plan_favorites_all" ON public.care_plan_favorites
  FOR ALL USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

DROP POLICY IF EXISTS "care_plan_recent_usage_all" ON public.care_plan_recent_usage;
CREATE POLICY "care_plan_recent_usage_all" ON public.care_plan_recent_usage
  FOR ALL USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());
