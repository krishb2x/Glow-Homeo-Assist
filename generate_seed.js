const fs = require('fs');
const path = require('path');

const programTitle = 'The 52-Week Ultimate Homeopathic Chronic Care Mastery Protocol';
const programDesc = 'A world-class, 1-year comprehensive functional and classical homeopathic care plan. Designed to address complex chronic diseases (Autoimmune, Endocrine, Neurological) through deep miasmatic prescribing, epigenetic nutrition, weekly symptom tracking, and continuous clinical engagement.';

let sql = `-- Migration: 20260606220000_seed_flagship_weekly_plan.sql
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
    '${programTitle}',
    '${programDesc.replace(/'/g, "''")}',
    364,
    'published'
  )
  RETURNING id INTO v_program_id;

`;

const topics = [
  "Deep Detox & Drainage", "Gut Microbiome Reset", "Insulin Sensitivity", "Adrenal Support", "Thyroid Axis",
  "Hormonal Harmony", "Immune Modulation", "Neuro-plasticity & Sleep", "Emotional Release", "Miasmatic Cleansing",
  "Cellular Hydration", "Mitochondrial Rescue"
];

const trackingTypes = ["Energy Levels", "Sleep Quality", "Digestive Function", "Pain / Inflammation Score", "Mood & Anxiety", "Skin Clarity", "Focus & Brain Fog"];

for (let week = 1; week <= 52; week++) {
  const dayOffset = (week - 1) * 7;
  const topic = topics[(week - 1) % topics.length];
  
  sql += `  ---------------------------------------------------------
  -- MILESTONE: Week ${week} - Day ${dayOffset}
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, ${dayOffset}, 'Week ${week}: ${topic} Mastery', ${dayOffset})
  RETURNING id INTO v_step_id;

`;

  // Block 1: Rich Text Content (Educational)
  sql += `  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Week ${week}: ${topic}</h2><p>Welcome to Week ${week} of your holistic healing journey. This week, our clinical focus shifts towards <b>${topic}</b>.</p><p>In classical homeopathy, true healing follows Hering''s Law of Cure: from above downwards, from within outwards, and in reverse order of appearance.</p><p><b>Action Items:</b> Keep taking your prescribed constitutional remedy as directed. Observe any return of old symptoms, which is a positive sign of deep healing.</p>"
}'::jsonb
  );

`;

  // Block 2: Dietary / Functional Action
  sql += `  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    1,
    false,
    '{
  "title": "${topic} Nutritional Protocol",
  "allowed": ["Organic Bone Broth", "Cruciferous Vegetables", "Wild Caught Fish", "Sprouted Seeds"],
  "avoid": ["Refined Sugars", "Ultra-Processed Foods", "Artificial Sweeteners", "Gluten"]
}'::jsonb
  );

`;

  // Block 3: Tracking Form
  const tracker = trackingTypes[(week - 1) % trackingTypes.length];
  sql += `  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    2,
    true,
    '{
  "symptom": "${tracker} Score (Week ${week})",
  "scale": "1-10"
}'::jsonb
  );

`;

  // Block 4: Check-in / Assessment
  sql += `  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
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

`;

  // Block 5: Email Communication
  sql += `  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    4,
    false,
    '{
  "subject": "Your Clinical Focus for Week ${week}",
  "body": "Dear Patient, this week we focus on ${topic}. Ensure you log your symptoms in the app. Consistency is key to unlocking your body''s innate healing potential."
}'::jsonb
  );

`;
}

sql += `END $$;
`;

const outputPath = path.join(__dirname, 'supabase', 'migrations', '20260606220000_seed_flagship_weekly_plan.sql');
fs.writeFileSync(outputPath, sql);
console.log('Successfully generated SQL file with ' + sql.split('\\n').length + ' lines.');
