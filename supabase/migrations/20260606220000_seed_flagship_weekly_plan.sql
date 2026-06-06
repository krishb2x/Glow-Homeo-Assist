-- Migration: 20260606220000_seed_flagship_weekly_plan.sql
-- Description: 52-Week massive homeopathic and functional care plan. Over 1500 lines of seeding data.

DO $$
DECLARE
  v_clinic_id uuid;
  v_program_id uuid;
  v_step_id uuid;
BEGIN
  SELECT id INTO v_clinic_id FROM public.clinics LIMIT 1;
  IF v_clinic_id IS NULL THEN
    v_clinic_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  INSERT INTO public.tp_programs (clinic_id, title, description, duration_days, status)
  VALUES (
    v_clinic_id,
    'The 52-Week Ultimate Homeopathic Chronic Care Mastery Protocol',
    'A world-class, 1-year comprehensive functional and classical homeopathic care plan. Designed to address complex chronic diseases (Autoimmune, Endocrine, Neurological) through deep miasmatic prescribing, epigenetic nutrition, weekly symptom tracking, and continuous clinical engagement.',
    364,
    'published'
  )
  RETURNING id INTO v_program_id;

  ---------------------------------------------------------
  -- MILESTONE: Week 1 - Day 0
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 0, 'Week 1: Deep Detox & Drainage Mastery', 0)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 1: Deep Detox & Drainage</h2><p>Welcome to Week 1 of your holistic healing journey. This week, our clinical focus shifts towards <b>Deep Detox & Drainage</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Deep Detox & Drainage Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 1)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 1",
  "body": "Dear Patient, this week we focus on Deep Detox & Drainage. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 2 - Day 7
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 7, 'Week 2: Gut Microbiome Reset Mastery', 7)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 2: Gut Microbiome Reset</h2><p>Welcome to Week 2 of your holistic healing journey. This week, our clinical focus shifts towards <b>Gut Microbiome Reset</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Gut Microbiome Reset Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 2)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 2",
  "body": "Dear Patient, this week we focus on Gut Microbiome Reset. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 3 - Day 14
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 14, 'Week 3: Insulin Sensitivity Mastery', 14)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 3: Insulin Sensitivity</h2><p>Welcome to Week 3 of your holistic healing journey. This week, our clinical focus shifts towards <b>Insulin Sensitivity</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Insulin Sensitivity Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 3)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 3",
  "body": "Dear Patient, this week we focus on Insulin Sensitivity. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 4 - Day 21
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 21, 'Week 4: Adrenal Support Mastery', 21)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 4: Adrenal Support</h2><p>Welcome to Week 4 of your holistic healing journey. This week, our clinical focus shifts towards <b>Adrenal Support</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Adrenal Support Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Pain / Inflammation Score Score (Week 4)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 4",
  "body": "Dear Patient, this week we focus on Adrenal Support. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 5 - Day 28
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 28, 'Week 5: Thyroid Axis Mastery', 28)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 5: Thyroid Axis</h2><p>Welcome to Week 5 of your holistic healing journey. This week, our clinical focus shifts towards <b>Thyroid Axis</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Thyroid Axis Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Mood & Anxiety Score (Week 5)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 5",
  "body": "Dear Patient, this week we focus on Thyroid Axis. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 6 - Day 35
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 35, 'Week 6: Hormonal Harmony Mastery', 35)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 6: Hormonal Harmony</h2><p>Welcome to Week 6 of your holistic healing journey. This week, our clinical focus shifts towards <b>Hormonal Harmony</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Hormonal Harmony Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Skin Clarity Score (Week 6)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 6",
  "body": "Dear Patient, this week we focus on Hormonal Harmony. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 7 - Day 42
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 42, 'Week 7: Immune Modulation Mastery', 42)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 7: Immune Modulation</h2><p>Welcome to Week 7 of your holistic healing journey. This week, our clinical focus shifts towards <b>Immune Modulation</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Immune Modulation Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Focus & Brain Fog Score (Week 7)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 7",
  "body": "Dear Patient, this week we focus on Immune Modulation. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 8 - Day 49
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 49, 'Week 8: Neuro-plasticity & Sleep Mastery', 49)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 8: Neuro-plasticity & Sleep</h2><p>Welcome to Week 8 of your holistic healing journey. This week, our clinical focus shifts towards <b>Neuro-plasticity & Sleep</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Neuro-plasticity & Sleep Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 8)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 8",
  "body": "Dear Patient, this week we focus on Neuro-plasticity & Sleep. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 9 - Day 56
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 56, 'Week 9: Emotional Release Mastery', 56)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 9: Emotional Release</h2><p>Welcome to Week 9 of your holistic healing journey. This week, our clinical focus shifts towards <b>Emotional Release</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Emotional Release Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 9)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 9",
  "body": "Dear Patient, this week we focus on Emotional Release. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 10 - Day 63
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 63, 'Week 10: Miasmatic Cleansing Mastery', 63)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 10: Miasmatic Cleansing</h2><p>Welcome to Week 10 of your holistic healing journey. This week, our clinical focus shifts towards <b>Miasmatic Cleansing</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Miasmatic Cleansing Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 10)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 10",
  "body": "Dear Patient, this week we focus on Miasmatic Cleansing. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 11 - Day 70
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 70, 'Week 11: Cellular Hydration Mastery', 70)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 11: Cellular Hydration</h2><p>Welcome to Week 11 of your holistic healing journey. This week, our clinical focus shifts towards <b>Cellular Hydration</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Cellular Hydration Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Pain / Inflammation Score Score (Week 11)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 11",
  "body": "Dear Patient, this week we focus on Cellular Hydration. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 12 - Day 77
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 77, 'Week 12: Mitochondrial Rescue Mastery', 77)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 12: Mitochondrial Rescue</h2><p>Welcome to Week 12 of your holistic healing journey. This week, our clinical focus shifts towards <b>Mitochondrial Rescue</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Mitochondrial Rescue Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Mood & Anxiety Score (Week 12)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 12",
  "body": "Dear Patient, this week we focus on Mitochondrial Rescue. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 13 - Day 84
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 84, 'Week 13: Deep Detox & Drainage Mastery', 84)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 13: Deep Detox & Drainage</h2><p>Welcome to Week 13 of your holistic healing journey. This week, our clinical focus shifts towards <b>Deep Detox & Drainage</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Deep Detox & Drainage Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Skin Clarity Score (Week 13)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 13",
  "body": "Dear Patient, this week we focus on Deep Detox & Drainage. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 14 - Day 91
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 91, 'Week 14: Gut Microbiome Reset Mastery', 91)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 14: Gut Microbiome Reset</h2><p>Welcome to Week 14 of your holistic healing journey. This week, our clinical focus shifts towards <b>Gut Microbiome Reset</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Gut Microbiome Reset Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Focus & Brain Fog Score (Week 14)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 14",
  "body": "Dear Patient, this week we focus on Gut Microbiome Reset. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 15 - Day 98
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 98, 'Week 15: Insulin Sensitivity Mastery', 98)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 15: Insulin Sensitivity</h2><p>Welcome to Week 15 of your holistic healing journey. This week, our clinical focus shifts towards <b>Insulin Sensitivity</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Insulin Sensitivity Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 15)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 15",
  "body": "Dear Patient, this week we focus on Insulin Sensitivity. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 16 - Day 105
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 105, 'Week 16: Adrenal Support Mastery', 105)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 16: Adrenal Support</h2><p>Welcome to Week 16 of your holistic healing journey. This week, our clinical focus shifts towards <b>Adrenal Support</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Adrenal Support Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 16)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 16",
  "body": "Dear Patient, this week we focus on Adrenal Support. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 17 - Day 112
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 112, 'Week 17: Thyroid Axis Mastery', 112)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 17: Thyroid Axis</h2><p>Welcome to Week 17 of your holistic healing journey. This week, our clinical focus shifts towards <b>Thyroid Axis</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Thyroid Axis Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 17)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 17",
  "body": "Dear Patient, this week we focus on Thyroid Axis. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 18 - Day 119
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 119, 'Week 18: Hormonal Harmony Mastery', 119)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 18: Hormonal Harmony</h2><p>Welcome to Week 18 of your holistic healing journey. This week, our clinical focus shifts towards <b>Hormonal Harmony</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Hormonal Harmony Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Pain / Inflammation Score Score (Week 18)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 18",
  "body": "Dear Patient, this week we focus on Hormonal Harmony. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 19 - Day 126
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 126, 'Week 19: Immune Modulation Mastery', 126)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 19: Immune Modulation</h2><p>Welcome to Week 19 of your holistic healing journey. This week, our clinical focus shifts towards <b>Immune Modulation</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Immune Modulation Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Mood & Anxiety Score (Week 19)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 19",
  "body": "Dear Patient, this week we focus on Immune Modulation. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 20 - Day 133
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 133, 'Week 20: Neuro-plasticity & Sleep Mastery', 133)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 20: Neuro-plasticity & Sleep</h2><p>Welcome to Week 20 of your holistic healing journey. This week, our clinical focus shifts towards <b>Neuro-plasticity & Sleep</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Neuro-plasticity & Sleep Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Skin Clarity Score (Week 20)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 20",
  "body": "Dear Patient, this week we focus on Neuro-plasticity & Sleep. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 21 - Day 140
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 140, 'Week 21: Emotional Release Mastery', 140)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 21: Emotional Release</h2><p>Welcome to Week 21 of your holistic healing journey. This week, our clinical focus shifts towards <b>Emotional Release</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Emotional Release Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Focus & Brain Fog Score (Week 21)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 21",
  "body": "Dear Patient, this week we focus on Emotional Release. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 22 - Day 147
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 147, 'Week 22: Miasmatic Cleansing Mastery', 147)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 22: Miasmatic Cleansing</h2><p>Welcome to Week 22 of your holistic healing journey. This week, our clinical focus shifts towards <b>Miasmatic Cleansing</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Miasmatic Cleansing Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 22)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 22",
  "body": "Dear Patient, this week we focus on Miasmatic Cleansing. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 23 - Day 154
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 154, 'Week 23: Cellular Hydration Mastery', 154)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 23: Cellular Hydration</h2><p>Welcome to Week 23 of your holistic healing journey. This week, our clinical focus shifts towards <b>Cellular Hydration</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Cellular Hydration Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 23)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 23",
  "body": "Dear Patient, this week we focus on Cellular Hydration. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 24 - Day 161
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 161, 'Week 24: Mitochondrial Rescue Mastery', 161)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 24: Mitochondrial Rescue</h2><p>Welcome to Week 24 of your holistic healing journey. This week, our clinical focus shifts towards <b>Mitochondrial Rescue</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Mitochondrial Rescue Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 24)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 24",
  "body": "Dear Patient, this week we focus on Mitochondrial Rescue. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 25 - Day 168
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 168, 'Week 25: Deep Detox & Drainage Mastery', 168)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 25: Deep Detox & Drainage</h2><p>Welcome to Week 25 of your holistic healing journey. This week, our clinical focus shifts towards <b>Deep Detox & Drainage</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Deep Detox & Drainage Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Pain / Inflammation Score Score (Week 25)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 25",
  "body": "Dear Patient, this week we focus on Deep Detox & Drainage. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 26 - Day 175
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 175, 'Week 26: Gut Microbiome Reset Mastery', 175)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 26: Gut Microbiome Reset</h2><p>Welcome to Week 26 of your holistic healing journey. This week, our clinical focus shifts towards <b>Gut Microbiome Reset</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Gut Microbiome Reset Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Mood & Anxiety Score (Week 26)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 26",
  "body": "Dear Patient, this week we focus on Gut Microbiome Reset. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 27 - Day 182
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 182, 'Week 27: Insulin Sensitivity Mastery', 182)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 27: Insulin Sensitivity</h2><p>Welcome to Week 27 of your holistic healing journey. This week, our clinical focus shifts towards <b>Insulin Sensitivity</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Insulin Sensitivity Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Skin Clarity Score (Week 27)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 27",
  "body": "Dear Patient, this week we focus on Insulin Sensitivity. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 28 - Day 189
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 189, 'Week 28: Adrenal Support Mastery', 189)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 28: Adrenal Support</h2><p>Welcome to Week 28 of your holistic healing journey. This week, our clinical focus shifts towards <b>Adrenal Support</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Adrenal Support Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Focus & Brain Fog Score (Week 28)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 28",
  "body": "Dear Patient, this week we focus on Adrenal Support. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 29 - Day 196
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 196, 'Week 29: Thyroid Axis Mastery', 196)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 29: Thyroid Axis</h2><p>Welcome to Week 29 of your holistic healing journey. This week, our clinical focus shifts towards <b>Thyroid Axis</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Thyroid Axis Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 29)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 29",
  "body": "Dear Patient, this week we focus on Thyroid Axis. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 30 - Day 203
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 203, 'Week 30: Hormonal Harmony Mastery', 203)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 30: Hormonal Harmony</h2><p>Welcome to Week 30 of your holistic healing journey. This week, our clinical focus shifts towards <b>Hormonal Harmony</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Hormonal Harmony Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 30)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 30",
  "body": "Dear Patient, this week we focus on Hormonal Harmony. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 31 - Day 210
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 210, 'Week 31: Immune Modulation Mastery', 210)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 31: Immune Modulation</h2><p>Welcome to Week 31 of your holistic healing journey. This week, our clinical focus shifts towards <b>Immune Modulation</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Immune Modulation Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 31)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 31",
  "body": "Dear Patient, this week we focus on Immune Modulation. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 32 - Day 217
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 217, 'Week 32: Neuro-plasticity & Sleep Mastery', 217)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 32: Neuro-plasticity & Sleep</h2><p>Welcome to Week 32 of your holistic healing journey. This week, our clinical focus shifts towards <b>Neuro-plasticity & Sleep</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Neuro-plasticity & Sleep Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Pain / Inflammation Score Score (Week 32)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 32",
  "body": "Dear Patient, this week we focus on Neuro-plasticity & Sleep. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 33 - Day 224
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 224, 'Week 33: Emotional Release Mastery', 224)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 33: Emotional Release</h2><p>Welcome to Week 33 of your holistic healing journey. This week, our clinical focus shifts towards <b>Emotional Release</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Emotional Release Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Mood & Anxiety Score (Week 33)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 33",
  "body": "Dear Patient, this week we focus on Emotional Release. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 34 - Day 231
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 231, 'Week 34: Miasmatic Cleansing Mastery', 231)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 34: Miasmatic Cleansing</h2><p>Welcome to Week 34 of your holistic healing journey. This week, our clinical focus shifts towards <b>Miasmatic Cleansing</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Miasmatic Cleansing Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Skin Clarity Score (Week 34)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 34",
  "body": "Dear Patient, this week we focus on Miasmatic Cleansing. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 35 - Day 238
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 238, 'Week 35: Cellular Hydration Mastery', 238)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 35: Cellular Hydration</h2><p>Welcome to Week 35 of your holistic healing journey. This week, our clinical focus shifts towards <b>Cellular Hydration</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Cellular Hydration Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Focus & Brain Fog Score (Week 35)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 35",
  "body": "Dear Patient, this week we focus on Cellular Hydration. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 36 - Day 245
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 245, 'Week 36: Mitochondrial Rescue Mastery', 245)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 36: Mitochondrial Rescue</h2><p>Welcome to Week 36 of your holistic healing journey. This week, our clinical focus shifts towards <b>Mitochondrial Rescue</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Mitochondrial Rescue Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 36)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 36",
  "body": "Dear Patient, this week we focus on Mitochondrial Rescue. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 37 - Day 252
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 252, 'Week 37: Deep Detox & Drainage Mastery', 252)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 37: Deep Detox & Drainage</h2><p>Welcome to Week 37 of your holistic healing journey. This week, our clinical focus shifts towards <b>Deep Detox & Drainage</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Deep Detox & Drainage Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 37)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 37",
  "body": "Dear Patient, this week we focus on Deep Detox & Drainage. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 38 - Day 259
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 259, 'Week 38: Gut Microbiome Reset Mastery', 259)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 38: Gut Microbiome Reset</h2><p>Welcome to Week 38 of your holistic healing journey. This week, our clinical focus shifts towards <b>Gut Microbiome Reset</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Gut Microbiome Reset Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 38)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 38",
  "body": "Dear Patient, this week we focus on Gut Microbiome Reset. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 39 - Day 266
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 266, 'Week 39: Insulin Sensitivity Mastery', 266)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 39: Insulin Sensitivity</h2><p>Welcome to Week 39 of your holistic healing journey. This week, our clinical focus shifts towards <b>Insulin Sensitivity</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Insulin Sensitivity Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Pain / Inflammation Score Score (Week 39)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 39",
  "body": "Dear Patient, this week we focus on Insulin Sensitivity. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 40 - Day 273
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 273, 'Week 40: Adrenal Support Mastery', 273)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 40: Adrenal Support</h2><p>Welcome to Week 40 of your holistic healing journey. This week, our clinical focus shifts towards <b>Adrenal Support</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Adrenal Support Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Mood & Anxiety Score (Week 40)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 40",
  "body": "Dear Patient, this week we focus on Adrenal Support. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 41 - Day 280
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 280, 'Week 41: Thyroid Axis Mastery', 280)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 41: Thyroid Axis</h2><p>Welcome to Week 41 of your holistic healing journey. This week, our clinical focus shifts towards <b>Thyroid Axis</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Thyroid Axis Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Skin Clarity Score (Week 41)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 41",
  "body": "Dear Patient, this week we focus on Thyroid Axis. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 42 - Day 287
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 287, 'Week 42: Hormonal Harmony Mastery', 287)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 42: Hormonal Harmony</h2><p>Welcome to Week 42 of your holistic healing journey. This week, our clinical focus shifts towards <b>Hormonal Harmony</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Hormonal Harmony Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Focus & Brain Fog Score (Week 42)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 42",
  "body": "Dear Patient, this week we focus on Hormonal Harmony. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 43 - Day 294
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 294, 'Week 43: Immune Modulation Mastery', 294)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 43: Immune Modulation</h2><p>Welcome to Week 43 of your holistic healing journey. This week, our clinical focus shifts towards <b>Immune Modulation</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Immune Modulation Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 43)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 43",
  "body": "Dear Patient, this week we focus on Immune Modulation. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 44 - Day 301
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 301, 'Week 44: Neuro-plasticity & Sleep Mastery', 301)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 44: Neuro-plasticity & Sleep</h2><p>Welcome to Week 44 of your holistic healing journey. This week, our clinical focus shifts towards <b>Neuro-plasticity & Sleep</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Neuro-plasticity & Sleep Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 44)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 44",
  "body": "Dear Patient, this week we focus on Neuro-plasticity & Sleep. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 45 - Day 308
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 308, 'Week 45: Emotional Release Mastery', 308)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 45: Emotional Release</h2><p>Welcome to Week 45 of your holistic healing journey. This week, our clinical focus shifts towards <b>Emotional Release</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Emotional Release Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 45)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 45",
  "body": "Dear Patient, this week we focus on Emotional Release. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 46 - Day 315
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 315, 'Week 46: Miasmatic Cleansing Mastery', 315)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 46: Miasmatic Cleansing</h2><p>Welcome to Week 46 of your holistic healing journey. This week, our clinical focus shifts towards <b>Miasmatic Cleansing</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Miasmatic Cleansing Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Pain / Inflammation Score Score (Week 46)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 46",
  "body": "Dear Patient, this week we focus on Miasmatic Cleansing. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 47 - Day 322
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 322, 'Week 47: Cellular Hydration Mastery', 322)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 47: Cellular Hydration</h2><p>Welcome to Week 47 of your holistic healing journey. This week, our clinical focus shifts towards <b>Cellular Hydration</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Cellular Hydration Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Mood & Anxiety Score (Week 47)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 47",
  "body": "Dear Patient, this week we focus on Cellular Hydration. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 48 - Day 329
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 329, 'Week 48: Mitochondrial Rescue Mastery', 329)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 48: Mitochondrial Rescue</h2><p>Welcome to Week 48 of your holistic healing journey. This week, our clinical focus shifts towards <b>Mitochondrial Rescue</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Mitochondrial Rescue Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Skin Clarity Score (Week 48)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 48",
  "body": "Dear Patient, this week we focus on Mitochondrial Rescue. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 49 - Day 336
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 336, 'Week 49: Deep Detox & Drainage Mastery', 336)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 49: Deep Detox & Drainage</h2><p>Welcome to Week 49 of your holistic healing journey. This week, our clinical focus shifts towards <b>Deep Detox & Drainage</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Deep Detox & Drainage Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Focus & Brain Fog Score (Week 49)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 49",
  "body": "Dear Patient, this week we focus on Deep Detox & Drainage. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 50 - Day 343
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 343, 'Week 50: Gut Microbiome Reset Mastery', 343)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 50: Gut Microbiome Reset</h2><p>Welcome to Week 50 of your holistic healing journey. This week, our clinical focus shifts towards <b>Gut Microbiome Reset</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Gut Microbiome Reset Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Energy Levels Score (Week 50)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 50",
  "body": "Dear Patient, this week we focus on Gut Microbiome Reset. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 51 - Day 350
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 350, 'Week 51: Insulin Sensitivity Mastery', 350)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 51: Insulin Sensitivity</h2><p>Welcome to Week 51 of your holistic healing journey. This week, our clinical focus shifts towards <b>Insulin Sensitivity</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Insulin Sensitivity Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Sleep Quality Score (Week 51)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 51",
  "body": "Dear Patient, this week we focus on Insulin Sensitivity. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Week 52 - Day 357
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 357, 'Week 52: Adrenal Support Mastery', 357)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week 52: Adrenal Support</h2><p>Welcome to Week 52 of your holistic healing journey. This week, our clinical focus shifts towards <b>Adrenal Support</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "Adrenal Support Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "Digestive Function Score (Week 52)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    3,
    true,
    '{
  "questions": [
    "Did you experience any homeopathic aggravations this week?",
    "How closely did you follow the nutritional guidelines?",
    "List top 3 changes in your body since last week."
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week 52",
  "body": "Dear Patient, this week we focus on Adrenal Support. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

END $$;
