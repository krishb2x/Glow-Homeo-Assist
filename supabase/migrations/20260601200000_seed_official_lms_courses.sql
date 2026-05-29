-- Seed official GlowHomeo LMS Courses (Content Library)
-- Links the courses to the official care plan templates.

DO $seed$ 
DECLARE
  v_system_clinic_id uuid := '00000000-0000-0000-0000-000000000000';
  v_system_doctor_id uuid := '00000000-0000-0000-0000-000000000001';
  
  -- Course & Module UUIDs
  v_course_hair uuid;
  v_mod_hair_1 uuid;
  v_mod_hair_2 uuid;
  v_mod_hair_3 uuid;
  
  -- Target Care Plan Template UUID
  v_tpl_hair uuid;
BEGIN
  -- 1. Find the target Care Plan Template (seeded in the previous migration)
  SELECT id INTO v_tpl_hair 
  FROM public.care_plan_templates 
  WHERE slug = 'official-hair-fall-recovery' AND clinic_id = v_system_clinic_id
  LIMIT 1;

  -- Clear existing official courses for the system clinic (idempotency)
  DELETE FROM public.content_courses WHERE clinic_id = v_system_clinic_id;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- COURSE: Holistic Hair Fall Recovery Program
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.content_courses (
    id, clinic_id, doctor_id, title, description, thumbnail_url, status, is_official
  ) VALUES (
    gen_random_uuid(), v_system_clinic_id, v_system_doctor_id,
    'Holistic Hair Fall Recovery Program',
    'A comprehensive, patient-friendly course guiding you through homeopathic principles, nutritional support, and stress management for sustainable hair fall recovery.',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800',
    'published', true
  ) RETURNING id INTO v_course_hair;

  -- Link course to the care plan template if it exists
  IF v_tpl_hair IS NOT NULL THEN
    INSERT INTO public.care_plan_template_courses (template_id, course_id, sort_order)
    VALUES (v_tpl_hair, v_course_hair, 0)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── MODULE 1: Understanding Hair Fall ─────────────────────────────────────
  INSERT INTO public.content_modules (id, course_id, title, sort_order)
  VALUES (gen_random_uuid(), v_course_hair, 'Module 1: Understanding Hair Fall', 0)
  RETURNING id INTO v_mod_hair_1;

  INSERT INTO public.content_lessons (module_id, title, content_type, sort_order, is_preview, content_payload)
  VALUES 
  (
    v_mod_hair_1, 'The Root Causes of Hair Fall', 'video', 0, true,
    '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "provider": "youtube", "duration_seconds": 320, "description": "Explore the internal and external factors that contribute to hair loss."}'::jsonb
  ),
  (
    v_mod_hair_1, 'Evaluating Your Hair Health at Home', 'text', 1, false,
    '{"body": "<h2>The Gentle Tug Test</h2><p>Grasp about 60 hairs between your thumb and index finger. Pull firmly but gently as you slide your fingers along the hair. If more than 6 hairs fall out, it might indicate active hair shedding.</p><h2>Scalp Examination</h2><p>Check your scalp for excessive oiliness, dandruff, or visible inflammation. A healthy scalp is the foundation of healthy hair.</p>"}'::jsonb
  );

  -- ── MODULE 2: Homeopathic Approaches ──────────────────────────────────────
  INSERT INTO public.content_modules (id, course_id, title, sort_order)
  VALUES (gen_random_uuid(), v_course_hair, 'Module 2: Homeopathic Approaches', 1)
  RETURNING id INTO v_mod_hair_2;

  INSERT INTO public.content_lessons (module_id, title, content_type, sort_order, is_preview, content_payload)
  VALUES 
  (
    v_mod_hair_2, 'How Homeopathy Helps Hair Growth', 'video', 0, false,
    '{"url": "https://www.youtube.com/watch?v=O19HKd230-o", "provider": "youtube", "duration_seconds": 450, "description": "Learn how homeopathy targets the root cause of hair fall to stimulate natural recovery."}'::jsonb
  ),
  (
    v_mod_hair_2, 'Common Remedies Overview', 'pdf', 1, false,
    '{"url": "https://glowhomeo-public.s3.amazonaws.com/remedies_overview.pdf", "title": "Homeopathic Remedies for Hair Fall", "pages": 2}'::jsonb
  );

  -- ── MODULE 3: Diet & Lifestyle ────────────────────────────────────────────
  INSERT INTO public.content_modules (id, course_id, title, sort_order)
  VALUES (gen_random_uuid(), v_course_hair, 'Module 3: Diet & Lifestyle', 2)
  RETURNING id INTO v_mod_hair_3;

  INSERT INTO public.content_lessons (module_id, title, content_type, sort_order, is_preview, content_payload)
  VALUES 
  (
    v_mod_hair_3, 'Nutrition for Strong Hair', 'video', 0, false,
    '{"url": "https://www.youtube.com/watch?v=F0ZzbQO6WJ8", "provider": "youtube", "duration_seconds": 510, "description": "Discover the essential vitamins, minerals, and superfoods necessary for robust hair growth."}'::jsonb
  ),
  (
    v_mod_hair_3, 'Stress Management Techniques', 'text', 1, false,
    '{"body": "<h2>The Mind-Body Connection</h2><p>Stress is a primary trigger for Telogen Effluvium, a condition where hair prematurely enters the resting phase and falls out.</p><h2>Daily Practices</h2><ul><li><b>Meditation:</b> 10 minutes of mindfulness daily.</li><li><b>Yoga:</b> Try the Balasana (Child''s Pose) and Adho Mukha Svanasana (Downward Dog) to increase scalp blood circulation.</li></ul>"}'::jsonb
  );

  -- ── MODULE 4: Assessments & Practical Activities ──────────────────────────
  DECLARE
    v_mod_hair_4 uuid;
  BEGIN
    INSERT INTO public.content_modules (id, course_id, title, sort_order)
    VALUES (gen_random_uuid(), v_course_hair, 'Module 4: Assessments & Practical Activities', 3)
    RETURNING id INTO v_mod_hair_4;

    INSERT INTO public.content_lessons (module_id, title, content_type, sort_order, is_preview, content_payload)
    VALUES 
    (
      v_mod_hair_4, 'Hair Health Knowledge Quiz', 'quiz', 0, false,
      '{"questions": [{"question": "What is the primary cause of Telogen Effluvium?", "options": ["Genetics", "Stress", "Dandruff", "Shampoo"], "correct_index": 1}, {"question": "Which homeopathic remedy is often used for hair fall with dandruff?", "options": ["Silicea", "Thuja", "Phosphorus", "Arnica"], "correct_index": 2}]}'::jsonb
    ),
    (
      v_mod_hair_4, 'Guided Stress Relief Meditation', 'audio', 1, false,
      '{"url": "https://glowhomeo-public.s3.amazonaws.com/guided_meditation.mp3", "duration_seconds": 600, "title": "10-Minute Calming Meditation"}'::jsonb
    ),
    (
      v_mod_hair_4, 'Weekly Diet & Habit Tracker', 'assignment', 2, false,
      '{"description": "Download the attached PDF, track your meals and stress levels for one week, and upload your completed tracker.", "attachment_url": "https://glowhomeo-public.s3.amazonaws.com/diet_tracker_template.pdf"}'::jsonb
    ),
    (
      v_mod_hair_4, 'Program Completion Certificate', 'certification', 3, false,
      '{"badge_image_url": "https://glowhomeo-public.s3.amazonaws.com/badges/hair_recovery_certified.png", "title": "Hair Fall Recovery Champion"}'::jsonb
    );
  END;

END $seed$;

-- ── Update RLS Policies to allow reading Official Courses ──────────────────

-- Courses
DROP POLICY IF EXISTS "content_courses_select" ON public.content_courses;
CREATE POLICY "content_courses_select" ON public.content_courses
  FOR SELECT USING (
    (is_official = true AND status = 'published')
    OR (
      clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
      AND status <> 'archived'
    )
  );

-- Modules
DROP POLICY IF EXISTS "content_modules_select" ON public.content_modules;
CREATE POLICY "content_modules_select" ON public.content_modules
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM public.content_courses
      WHERE
        (is_official = true AND status = 'published')
        OR (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
    )
  );

-- Lessons
DROP POLICY IF EXISTS "content_lessons_select" ON public.content_lessons;
CREATE POLICY "content_lessons_select" ON public.content_lessons
  FOR SELECT USING (
    module_id IN (
      SELECT id FROM public.content_modules
      WHERE course_id IN (
        SELECT id FROM public.content_courses
        WHERE
          (is_official = true AND status = 'published')
          OR (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
      )
    )
  );
