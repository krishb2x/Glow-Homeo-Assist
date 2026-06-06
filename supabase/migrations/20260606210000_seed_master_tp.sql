-- Seed Script: The 100-Day PCOS Holistic Reversal (Functional & Homeopathic)
-- The most comprehensive holistic PCOS treatment protocol in the world.
-- Contains Homeopathy, Functional Medicine, and Clinical Nutrition.

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
    'The 100-Day PCOS Holistic Reversal (Functional & Homeopathic)',
    'The undisputed world-class protocol for PCOS. Integrates Classical Homeopathy, Functional Medicine (DUTCH Testing, CGM Tracking), Circadian Fasting, and Seed Cycling. Designed to reverse anovulation, hirsutism, and insulin resistance.',
    100,
    'published'
  )
  RETURNING id INTO v_program_id;

  ---------------------------------------------------------
  -- MILESTONE: Day 0 - Week 1: The Functional Baseline & Deep Detox
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 0, 'Week 1: The Functional Baseline & Deep Detox', 0)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'email_template',
    0,
    false,
    '{
  "subject": "Welcome to your PCOS Reversal Journey",
  "body": "We are combining Classical Homeopathy with Functional Medicine. We will look for root causes: Insulin, Gut Health, and Stress."
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    1,
    false,
    '{
  "html": "<h2>Functional Medicine: Root Cause Diagnostics</h2><p>PCOS is not just an ovarian issue; it is a systemic metabolic syndrome. This week, we strongly recommend ordering a <b>DUTCH Test (Dried Urine Test for Comprehensive Hormones)</b>. This will show us exactly how your liver is metabolizing estrogen and whether your androgens favor the highly-potent 5a-DHT pathway (which causes severe hirsutism and hair loss).</p><p>We also advise wearing a <b>Continuous Glucose Monitor (CGM)</b> for 14 days to map your unique insulin responses to foods.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'diet_plan',
    2,
    false,
    '{
  "title": "Phase 1: Anti-Inflammatory & Endocrine Reset",
  "allowed": [
    "Wild Salmon (Omega 3)",
    "Cruciferous Veg (Broccoli, Cauliflower for DIM)",
    "Avocado",
    "Bone Broth"
  ],
  "avoid": [
    "All Dairy (A1 Casein)",
    "Gluten",
    "Processed Sugar",
    "Seed Oils (Canola, Soybean)"
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'faq',
    3,
    false,
    '{
  "faqs": [
    {
      "question": "Why avoid dairy?",
      "answer": "Dairy contains IGF-1 (Insulin-like Growth Factor 1) which directly stimulates the ovaries to produce more testosterone in PCOS patients."
    },
    {
      "question": "How does the Homeopathic Remedy work?",
      "answer": "Remedies like Pulsatilla or Sepia are prescribed based on your total physical and emotional constitution. They act as an epigenetic trigger to restore the vital force''s self-healing mechanism."
    }
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    4,
    true,
    '{
  "symptom": "Baseline Hirsutism (Ferriman-Gallwey Score proxy)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    5,
    true,
    '{
  "symptom": "Baseline Cystic Acne",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'progress_photo',
    6,
    true,
    '{
  "prompt": "Upload a baseline photo. Strict medical confidentiality applies."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 7 - Week 2: Targeted Supplementation & Seed Cycling
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 7, 'Week 2: Targeted Supplementation & Seed Cycling', 7)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Nutritional Bio-Hacking: Inositol & Seeds</h2><p><b>Myo-Inositol & D-Chiro Inositol:</b> We are introducing a 40:1 ratio of Myo and D-Chiro Inositol (2000mg daily). This acts as a secondary messenger for insulin, directly reducing ovarian testosterone production and restoring ovulation.</p><p><b>Seed Cycling:</b> Consume 1 tbsp raw pumpkin + 1 tbsp raw flax seeds daily during the first half of your cycle to bind excess estrogen. Switch to sesame and sunflower seeds after ovulation to boost progesterone.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'checklist',
    1,
    true,
    '{
  "title": "Daily Protocol Check",
  "items": [
    "Took Inositol (40:1)",
    "Drank 2 Cups Spearmint Tea",
    "Seed Cycling Dose",
    "Took Homeopathic Remedy"
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    2,
    true,
    '{
  "questions": [
    "Have your sugar cravings reduced?",
    "Any changes in digestive bloating?"
  ]
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 14 - Week 3: Flattening the Glucose Curve
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 14, 'Week 3: Flattening the Glucose Curve', 14)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>The Insulin-Testosterone Axis</h2><p>Chronically high insulin signals your ovaries to halt estrogen production and pump out testosterone instead. We must flatten your glucose curve.</p><ul><li><b>Food Sequencing:</b> Vegetables first, proteins/fats second, carbs last. This reduces the glucose spike by 70%.</li><li><b>Apple Cider Vinegar:</b> 1 tbsp in water 20 minutes before your heaviest meal.</li><li><b>Post-Prandial Movement:</b> Walk for 10 minutes after eating to let muscles absorb glucose without insulin.</li></ul>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'exercise_plan',
    1,
    false,
    '{
  "routine": "Avoid HIIT. Switch to slow-weighted strength training. Muscle is the body''s largest glucose sink. More muscle = less insulin resistance."
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'media',
    'youtube_video',
    2,
    false,
    '{
  "url": "https://youtube.com/watch?v=glucose_hacks",
  "title": "Visualizing the Glucose Curve"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 21 - Week 4: Month 1 Clinical Review & Aggravation
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 21, 'Week 4: Month 1 Clinical Review & Aggravation', 21)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Understanding Homeopathic Aggravation</h2><p>If you experience a temporary flare-up of old symptoms (e.g., sudden acne, emotional outbursts, or a painful bleed), <b>do not panic</b>. In classical homeopathy, this is the ''Aggravation Window''. Your vital force is pushing suppressed pathology out of the deeper organs (ovaries/liver) to the exterior (skin/emotions). It means the remedy is working.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'monthly_review',
    1,
    true,
    '{
  "metrics": [
    "Cycle Length Changes",
    "Weight/BMI Shift",
    "Acne Reduction",
    "Energy Stability"
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'progress_photo',
    2,
    true,
    '{
  "prompt": "Upload your Month 1 comparison photo."
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_follow_up',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Month 1 progress. Correlate any reported aggravations with the prescribed constitutional remedy."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 28 - Week 5: The Estrobolome & Gut Permeability
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 28, 'Week 5: The Estrobolome & Gut Permeability', 28)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>The Gut-Hormone Connection</h2><p>Your gut microbiome dictates how estrogen is excreted. A sluggish gut leads to the production of beta-glucuronidase, an enzyme that reactivates toxic estrogen and sends it back into your bloodstream (Estrogen Dominance).</p><p>This week, we repair the gut lining. Introduce L-Glutamine powder and unpasteurized fermented foods (Kimchi, Coconut Kefir).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'recipe',
    1,
    false,
    '{
  "title": "Gut-Healing Bone Broth",
  "ingredients": [
    "Organic beef marrow bones",
    "2 tbsp Apple Cider Vinegar",
    "Ginger root",
    "Turmeric",
    "Simmer for 24 hours"
  ]
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 35 - Week 6: Liver Detoxification Pathways
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 35, 'Week 6: Liver Detoxification Pathways', 35)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Supporting Hepatic Clearance</h2><p>The liver clears excess testosterone. We are introducing Castor Oil packs. Place a warm, hexane-free castor oil pack over your liver (right side, under the ribcage) for 45 minutes every evening. This stimulates deep lymphatic drainage and Phase 2 liver detoxification.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'checklist',
    1,
    true,
    '{
  "title": "Liver Protocol",
  "items": [
    "Castor Oil Pack (3x/week)",
    "Dandelion Root Tea",
    "Zero Alcohol"
  ]
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 42 - Week 7: The Adrenal Steal (Cortisol Reset)
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 42, 'Week 7: The Adrenal Steal (Cortisol Reset)', 42)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>The Pregnenolone Steal</h2><p>In Adrenal PCOS, chronic stress forces your body to steal ''pregnenolone'' (the building block for progesterone) and convert it into cortisol to survive. This halts ovulation.</p><p>We must reset your circadian clock. <b>No screens for the first 60 minutes of waking.</b> Get 15 minutes of direct morning sunlight in your eyes before 9 AM to halt melatonin and regulate cortisol.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'media',
    'audio',
    1,
    false,
    '{
  "url": "https://audio.com/nsdr",
  "title": "NSDR (Non-Sleep Deep Rest) Protocol"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 49 - Week 8: Month 2 Deep Constitutional Review
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 49, 'Week 8: Month 2 Deep Constitutional Review', 49)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>The Constitutional Shift</h2><p>In classical homeopathy, healing occurs from the inside out (Hering''s Law of Cure). By Month 2, we expect to see profound shifts in your mental and emotional state before physical cycles fully regulate. You should feel less irritable, more centered, and have deeper sleep.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'monthly_review',
    1,
    true,
    '{
  "metrics": [
    "Mood Stability",
    "Brain Fog",
    "Sleep Quality",
    "Cravings"
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    2,
    false,
    '{
  "target": "doctor",
  "prompt": "Summarize psychological and emotional shifts reported by the patient in Month 2. Has the constitutional remedy reached the mental plane?"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 56 - Week 9: Thyroid Optimization
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 56, 'Week 9: Thyroid Optimization', 56)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>The Thyroid-Ovary Axis</h2><p>Sluggish thyroid function mimics PCOS (weight loss resistance, fatigue, hair loss). Track your Basal Body Temperature (BBT) this week. Keep a thermometer by your bed and take your temperature immediately upon waking, before sitting up.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    1,
    true,
    '{
  "symptom": "Morning BBT (Basal Body Temperature)",
  "scale": "Input exact temperature"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 63 - Week 10: Circadian Fasting Protocols
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 63, 'Week 10: Circadian Fasting Protocols', 63)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Fasting for Women with PCOS</h2><p>Aggressive 16:8 fasting can trigger a cortisol spike, worsening Adrenal PCOS. We recommend a gentle <b>12-hour Circadian Fast</b>. Stop eating by 7 PM, and do not eat until 7 AM. This allows insulin to drop to baseline and cellular autophagy to occur without triggering an adrenal starvation response.</p>"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 70 - Week 11: Sleep Architecture & Melatonin
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 70, 'Week 11: Sleep Architecture & Melatonin', 70)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Melatonin and Ovarian Health</h2><p>Ovarian follicles contain high levels of melatonin to protect the egg from oxidative stress. Poor sleep = poor ovulation. Ensure your bedroom is pitch black and kept at 18°C. Consider 300mg of Magnesium Glycinate before bed.</p>"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 77 - Week 12: Month 3 Clinical Review (The 100-Day Egg)
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 77, 'Week 12: Month 3 Clinical Review (The 100-Day Egg)', 77)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>The 100-Day Follicle Journey</h2><p>It takes exactly 100 days for an ovarian follicle to mature. The massive dietary, lifestyle, and homeopathic interventions you began in Week 1 are only just now affecting the egg you will ovulate this month. Patience pays off now.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'monthly_review',
    1,
    true,
    '{
  "metrics": [
    "Cycle Regularity",
    "Bleeding Volume",
    "Cramping Severity",
    "PMS Symptoms"
  ]
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 84 - Week 13: Fertility & Cervical Mucus Tracking
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 84, 'Week 13: Fertility & Cervical Mucus Tracking', 84)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Tracking the Estrogen Peak</h2><p>As estrogen rises before ovulation, your cervical mucus becomes clear, stretchy, and resembles raw egg whites. This indicates a healthy estrogen peak and impending ovulation—the ultimate sign our protocol is working.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'tracking',
    'symptom_tracker',
    1,
    true,
    '{
  "symptom": "Presence of ''Egg-White'' Cervical Mucus",
  "scale": "None / Little / Abundant"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 91 - Week 14: The 80/20 Maintenance Lifestyle
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 91, 'Week 14: The 80/20 Maintenance Lifestyle', 91)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Metabolic Flexibility</h2><p>You have fundamentally altered your metabolic and endocrine responses. Now we focus on the 80/20 rule. 80% of the time, follow the protocol. 20% of the time, live your life. Stressing over a slice of cake causes more hormonal damage (via cortisol) than the cake itself.</p>"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 100 - Week 15: Graduation & The New Baseline
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 100, 'Week 15: Graduation & The New Baseline', 100)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Congratulations on your 100-Day Reset</h2><p>You have successfully combined Functional Medicine diagnostics, Metabolic bio-hacking, and Classical Homeopathy to reverse the root causes of your PCOS.</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'mcq_form',
    1,
    true,
    '{
  "question": "Final Outcome: Has your cycle returned to a normal 28-32 day rhythm?",
  "options": [
    "Yes, perfectly",
    "Improved but slightly irregular",
    "No change"
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'mcq_form',
    2,
    true,
    '{
  "question": "Final Outcome: How much have your primary PCOS symptoms (acne, hirsutism, fatigue) reduced?",
  "options": [
    ">80% Reduction",
    "50-80% Reduction",
    "20-50% Reduction",
    "<20% Reduction"
  ]
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Generate a comprehensive 100-Day clinical outcome report comparing Day 0 DUTCH/Symptom baselines to Day 100 outcomes."
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'communication',
    'written_review',
    4,
    false,
    '{
  "prompt": "Share your PCOS reversal story to inspire others.",
  "platform": "Google Reviews"
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 107 - Week 16: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 107, 'Week 16: Advanced Maintenance Phase', 107)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 16</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 16 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 114 - Week 17: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 114, 'Week 17: Advanced Maintenance Phase', 114)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 17</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 17 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 121 - Week 18: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 121, 'Week 18: Advanced Maintenance Phase', 121)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 18</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 18 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 128 - Week 19: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 128, 'Week 19: Advanced Maintenance Phase', 128)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 19</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 19 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 135 - Week 20: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 135, 'Week 20: Advanced Maintenance Phase', 135)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 20</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 20 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 142 - Week 21: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 142, 'Week 21: Advanced Maintenance Phase', 142)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 21</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 21 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 149 - Week 22: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 149, 'Week 22: Advanced Maintenance Phase', 149)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 22</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 22 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 156 - Week 23: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 156, 'Week 23: Advanced Maintenance Phase', 156)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 23</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 23 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 163 - Week 24: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 163, 'Week 24: Advanced Maintenance Phase', 163)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 24</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 24 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 170 - Week 25: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 170, 'Week 25: Advanced Maintenance Phase', 170)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 25</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 25 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 177 - Week 26: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 177, 'Week 26: Advanced Maintenance Phase', 177)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 26</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 26 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 184 - Week 27: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 184, 'Week 27: Advanced Maintenance Phase', 184)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 27</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 27 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 191 - Week 28: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 191, 'Week 28: Advanced Maintenance Phase', 191)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 28</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 28 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 198 - Week 29: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 198, 'Week 29: Advanced Maintenance Phase', 198)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 29</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 29 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 205 - Week 30: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 205, 'Week 30: Advanced Maintenance Phase', 205)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 30</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 30 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 212 - Week 31: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 212, 'Week 31: Advanced Maintenance Phase', 212)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 31</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 31 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 219 - Week 32: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 219, 'Week 32: Advanced Maintenance Phase', 219)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 32</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 32 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 226 - Week 33: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 226, 'Week 33: Advanced Maintenance Phase', 226)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 33</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 33 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 233 - Week 34: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 233, 'Week 34: Advanced Maintenance Phase', 233)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 34</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 34 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 240 - Week 35: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 240, 'Week 35: Advanced Maintenance Phase', 240)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 35</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 35 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 247 - Week 36: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 247, 'Week 36: Advanced Maintenance Phase', 247)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 36</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 36 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 254 - Week 37: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 254, 'Week 37: Advanced Maintenance Phase', 254)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 37</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 37 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 261 - Week 38: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 261, 'Week 38: Advanced Maintenance Phase', 261)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 38</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 38 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 268 - Week 39: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 268, 'Week 39: Advanced Maintenance Phase', 268)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 39</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 39 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );

  ---------------------------------------------------------
  -- MILESTONE: Day 275 - Week 40: Advanced Maintenance Phase
  ---------------------------------------------------------
  INSERT INTO public.tp_steps (program_id, day_offset, title, sort_order)
  VALUES (v_program_id, 275, 'Week 40: Advanced Maintenance Phase', 275)
  RETURNING id INTO v_step_id;

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'content',
    'rich_text',
    0,
    false,
    '{
  "html": "<h2>Phase 2 Maintenance: Week 40</h2><p>The goal is to sustain your ovulatory cycle using lifestyle adjustments and a lower-potency constitutional remedy. Remember the 80/20 rule.</p><p><b>Clinical Focus:</b> Ensure your protein intake remains >80g per day to sustain muscle mass (your glucose sink).</p>"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'assessment',
    'weekly_check_in',
    1,
    true,
    '{
  "questions": [
    "Did you ovulate this month?",
    "Are your energy levels stable?",
    "Rate your sugar cravings (1-10)"
  ]
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
  "symptom": "PMS Severity (Cramps/Mood)",
  "scale": "1-10"
}'::jsonb
  );

  INSERT INTO public.tp_blocks (step_id, category, block_type, sort_order, is_required, config)
  VALUES (
    v_step_id,
    'ai',
    'ai_summary',
    3,
    false,
    '{
  "target": "doctor",
  "prompt": "Analyze Maintenance Week 40 for any signs of relapse in hirsutism, acne, or cycle delay."
}'::jsonb
  );


  RAISE NOTICE 'World-Class Holistic PCOS Master Template Seeded Successfully! Program ID: %', v_program_id;
END $$;
