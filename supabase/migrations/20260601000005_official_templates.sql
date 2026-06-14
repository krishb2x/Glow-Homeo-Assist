-- Dual-template system: Official GlowHomeo + Personal Doctor templates
-- Adds template_type, published_at, is_official flags, system clinic, updated RLS

-- ── System clinic for official content ────────────────────────────────────
INSERT INTO public.clinics (id, name, slug, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'GlowHomeo Official',
  'glowhomeo-official',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── Schema changes to care_plan_templates ─────────────────────────────────
ALTER TABLE public.care_plan_templates
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'custom'
    CHECK (template_type IN ('official', 'custom'));

ALTER TABLE public.care_plan_templates
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- ── is_official flag on content tables ────────────────────────────────────
ALTER TABLE public.content_courses
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

ALTER TABLE public.care_plan_media
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

-- ── Index for official template queries ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_care_plan_templates_official
  ON public.care_plan_templates (template_type, status, updated_at DESC)
  WHERE template_type = 'official';

-- ── Update RLS: care_plan_templates SELECT ────────────────────────────────
-- Allow ALL authenticated users to read official published templates
DROP POLICY IF EXISTS "care_plan_templates_select" ON public.care_plan_templates;
CREATE POLICY "care_plan_templates_select" ON public.care_plan_templates
  FOR SELECT USING (
    -- Official published templates are visible to everyone
    (template_type = 'official' AND status = 'published')
    OR
    -- Custom templates: existing clinic-scoped logic
    (
      clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
      AND (doctor_id = auth.uid() OR is_shared = true OR visibility = 'clinic')
      AND status <> 'archived'
    )
  );

-- ── Update RLS: care_plan_blocks SELECT ───────────────────────────────────
-- Allow reading blocks of official templates
DROP POLICY IF EXISTS "care_plan_blocks_select" ON public.care_plan_blocks;
CREATE POLICY "care_plan_blocks_select" ON public.care_plan_blocks
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates
      WHERE
        (template_type = 'official' AND status = 'published')
        OR (
          clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
          AND (doctor_id = auth.uid() OR is_shared = true OR visibility = 'clinic')
        )
    )
  );

-- ── Update RLS: care_plan_template_media SELECT ───────────────────────────
DROP POLICY IF EXISTS "care_plan_template_media_all" ON public.care_plan_template_media;
CREATE POLICY "care_plan_template_media_all" ON public.care_plan_template_media
  FOR ALL USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates
      WHERE
        (template_type = 'official' AND status = 'published')
        OR (
          clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
          AND (doctor_id = auth.uid() OR is_shared = true)
        )
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.care_plan_templates WHERE doctor_id = auth.uid()
    )
  );

-- ── Update RLS: care_plan_template_courses SELECT ─────────────────────────
DROP POLICY IF EXISTS "care_plan_template_courses_all" ON public.care_plan_template_courses;
CREATE POLICY "care_plan_template_courses_all" ON public.care_plan_template_courses
  FOR ALL USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates
      WHERE
        (template_type = 'official' AND status = 'published')
        OR (
          clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
        )
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.care_plan_templates WHERE doctor_id = auth.uid()
    )
  );
