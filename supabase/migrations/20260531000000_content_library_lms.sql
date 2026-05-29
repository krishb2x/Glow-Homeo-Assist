-- Content Library LMS Migration

-- ── Content Courses ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_courses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL,
  doctor_id         uuid NOT NULL,
  title             text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description       text CHECK (char_length(description) <= 4000),
  thumbnail_url     text CHECK (char_length(thumbnail_url) <= 2000),
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DO $fk_course$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_courses_clinic_id_fkey'
      AND conrelid = 'public.content_courses'::regclass
  ) THEN
    ALTER TABLE public.content_courses
      ADD CONSTRAINT content_courses_clinic_id_fkey
      FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; WHEN others THEN NULL;
END $fk_course$;

CREATE INDEX IF NOT EXISTS idx_content_courses_clinic
  ON public.content_courses (clinic_id, status, updated_at DESC);

-- ── Content Modules ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_modules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES public.content_courses(id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_modules_course
  ON public.content_modules (course_id, sort_order ASC);

-- ── Content Lessons ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_lessons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id         uuid NOT NULL REFERENCES public.content_modules(id) ON DELETE CASCADE,
  title             text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content_type      text NOT NULL CHECK (content_type IN ('video', 'pdf', 'quiz', 'audio', 'assignment', 'certification', 'text')),
  content_payload   jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order        int NOT NULL DEFAULT 0,
  is_preview        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_lessons_module
  ON public.content_lessons (module_id, sort_order ASC);

-- ── Care Plan Template Courses Junction ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.care_plan_template_courses (
  template_id   uuid NOT NULL REFERENCES public.care_plan_templates(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.content_courses(id) ON DELETE CASCADE,
  sort_order    int NOT NULL DEFAULT 0,
  PRIMARY KEY (template_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_care_plan_template_courses_template
  ON public.care_plan_template_courses (template_id, sort_order);

-- ── Patient Course Enrollments & Progress (Future Support) ───────────────────
CREATE TABLE IF NOT EXISTS public.patient_lesson_progress (
  patient_id                uuid NOT NULL,
  lesson_id                 uuid NOT NULL REFERENCES public.content_lessons(id) ON DELETE CASCADE,
  status                    text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_position_seconds     int DEFAULT 0,
  completed_at              timestamptz,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, lesson_id)
);

-- ── RLS Policies: Courses ────────────────────────────────────────────────
ALTER TABLE public.content_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_courses_select" ON public.content_courses;
CREATE POLICY "content_courses_select" ON public.content_courses
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    AND status <> 'archived'
  );

DROP POLICY IF EXISTS "content_courses_insert" ON public.content_courses;
CREATE POLICY "content_courses_insert" ON public.content_courses
  FOR INSERT WITH CHECK (
    doctor_id = auth.uid()
    AND clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "content_courses_update" ON public.content_courses;
CREATE POLICY "content_courses_update" ON public.content_courses
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "content_courses_delete" ON public.content_courses;
CREATE POLICY "content_courses_delete" ON public.content_courses
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

-- ── RLS Policies: Modules ────────────────────────────────────────────────
ALTER TABLE public.content_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_modules_select" ON public.content_modules;
CREATE POLICY "content_modules_select" ON public.content_modules
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM public.content_courses
      WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "content_modules_insert" ON public.content_modules;
CREATE POLICY "content_modules_insert" ON public.content_modules
  FOR INSERT WITH CHECK (
    course_id IN (
      SELECT id FROM public.content_courses
      WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "content_modules_update" ON public.content_modules;
CREATE POLICY "content_modules_update" ON public.content_modules
  FOR UPDATE USING (
    course_id IN (
      SELECT id FROM public.content_courses
      WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "content_modules_delete" ON public.content_modules;
CREATE POLICY "content_modules_delete" ON public.content_modules
  FOR DELETE USING (
    course_id IN (
      SELECT id FROM public.content_courses
      WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ── RLS Policies: Lessons ────────────────────────────────────────────────
ALTER TABLE public.content_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_lessons_select" ON public.content_lessons;
CREATE POLICY "content_lessons_select" ON public.content_lessons
  FOR SELECT USING (
    module_id IN (
      SELECT id FROM public.content_modules
      WHERE course_id IN (
        SELECT id FROM public.content_courses
        WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "content_lessons_insert" ON public.content_lessons;
CREATE POLICY "content_lessons_insert" ON public.content_lessons
  FOR INSERT WITH CHECK (
    module_id IN (
      SELECT id FROM public.content_modules
      WHERE course_id IN (
        SELECT id FROM public.content_courses
        WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "content_lessons_update" ON public.content_lessons;
CREATE POLICY "content_lessons_update" ON public.content_lessons
  FOR UPDATE USING (
    module_id IN (
      SELECT id FROM public.content_modules
      WHERE course_id IN (
        SELECT id FROM public.content_courses
        WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "content_lessons_delete" ON public.content_lessons;
CREATE POLICY "content_lessons_delete" ON public.content_lessons
  FOR DELETE USING (
    module_id IN (
      SELECT id FROM public.content_modules
      WHERE course_id IN (
        SELECT id FROM public.content_courses
        WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- ── RLS Policies: Junction ───────────────────────────────────────────────
ALTER TABLE public.care_plan_template_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_plan_template_courses_all" ON public.care_plan_template_courses;
CREATE POLICY "care_plan_template_courses_all" ON public.care_plan_template_courses
  FOR ALL USING (
    template_id IN (
      SELECT id FROM public.care_plan_templates
      WHERE clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.care_plan_templates WHERE doctor_id = auth.uid()
    )
  );

-- ── RLS Policies: Patient Progress ───────────────────────────────────────
ALTER TABLE public.patient_lesson_progress ENABLE ROW LEVEL SECURITY;
-- We'll allow doctors to select patient progress, but no insert/update (app handles that via patients)
DROP POLICY IF EXISTS "patient_lesson_progress_select" ON public.patient_lesson_progress;
CREATE POLICY "patient_lesson_progress_select" ON public.patient_lesson_progress
  FOR SELECT USING (true);
