-- Seed official GlowHomeo care plan templates with realistic homeopathic content.
-- These are visible to ALL doctors across all clinics.

-- Use a deterministic system doctor UUID for the author
DO $seed$ 
DECLARE
  v_system_clinic_id uuid := '00000000-0000-0000-0000-000000000000';
  v_system_doctor_id uuid := '00000000-0000-0000-0000-000000000001';
  v_tpl_hair uuid;
  v_tpl_pcod uuid;
  v_tpl_acne uuid;
  v_tpl_pigmentation uuid;
  v_tpl_weight uuid;
BEGIN
  -- Ensure system doctor exists in auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  )
  VALUES (
    v_system_doctor_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@glowhomeo.com',
    'crypt_dummy',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Ensure system doctor profile exists (idempotent)
  INSERT INTO public.profiles (id, full_name, role, clinic_id)
  VALUES (v_system_doctor_id, 'GlowHomeo Admin', 'doctor', v_system_clinic_id)
  ON CONFLICT (id) DO NOTHING;

  -- Clear existing official templates to ensure idempotent execution
  DELETE FROM public.care_plan_templates WHERE clinic_id = v_system_clinic_id;
  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1. Hair Fall Recovery Program
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.care_plan_templates (
    id, clinic_id, doctor_id, title, slug, summary, primary_category,
    disease_tags, symptom_tags, template_type, status, published_at,
    visibility, is_shared, version
  ) VALUES (
    gen_random_uuid(), v_system_clinic_id, v_system_doctor_id,
    'Hair Fall Recovery Program',
    'official-hair-fall-recovery',
    'A comprehensive homeopathic care plan for managing hair fall through constitutional remedies, nutritional support, stress management, and scalp health protocols.',
    'recovery_journey',
    ARRAY['alopecia', 'hair_fall', 'thinning_hair'],
    ARRAY['hair_loss', 'brittle_hair', 'scalp_dryness', 'dandruff'],
    'official', 'published', now(),
    'clinic', true, 1
  ) RETURNING id INTO v_tpl_hair;

  INSERT INTO public.care_plan_blocks (template_id, block_type, title, sort_order, payload) VALUES
  (v_tpl_hair, 'diet', 'Nutritional Support for Hair Health', 0, '{
    "intro": "A nutrient-rich diet is foundational for healthy hair growth. Focus on biotin, iron, zinc, and protein-rich foods that support keratin production and follicle strength.",
    "items": [
      {"id": "h1", "text": "Include iron-rich foods: spinach, beetroot, dates, pomegranate, and jaggery daily", "priority": "high"},
      {"id": "h2", "text": "Consume biotin-rich foods: eggs, almonds, walnuts, sweet potatoes, and oats", "priority": "high"},
      {"id": "h3", "text": "Add zinc sources: pumpkin seeds, sesame seeds, chickpeas, and lentils", "priority": "normal"},
      {"id": "h4", "text": "Include omega-3 fatty acids: flaxseeds, chia seeds, and walnuts", "priority": "normal"},
      {"id": "h5", "text": "Drink fresh amla juice (20ml) or eat 1 fresh amla daily for Vitamin C", "priority": "normal"},
      {"id": "h6", "text": "Ensure adequate protein: dal, paneer, sprouts, or eggs at every meal", "priority": "high"}
    ]
  }'::jsonb),
  (v_tpl_hair, 'restricted_foods', 'Foods to Avoid', 1, '{
    "intro": "Certain foods can aggravate hair fall by increasing pitta, disrupting hormonal balance, or depleting nutrients.",
    "items": [
      {"id": "hr1", "text": "Reduce excessive tea and coffee — they impair iron absorption", "priority": "high"},
      {"id": "hr2", "text": "Avoid deep-fried and processed foods — they increase oxidative stress", "priority": "normal"},
      {"id": "hr3", "text": "Limit refined sugar — it depletes biotin and B-vitamins", "priority": "normal"},
      {"id": "hr4", "text": "Reduce excess salt — it can lead to dehydration of hair follicles", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_hair, 'lifestyle', 'Scalp Care & Lifestyle', 2, '{
    "intro": "Healthy hair begins with a healthy scalp and balanced lifestyle habits.",
    "items": [
      {"id": "hl1", "text": "Oil your scalp with coconut or bhringraj oil 2–3 times per week, leave for 1 hour before washing", "priority": "high"},
      {"id": "hl2", "text": "Use a mild, sulphate-free shampoo — avoid daily washing", "priority": "normal"},
      {"id": "hl3", "text": "Sleep 7–8 hours nightly — growth hormone release peaks during deep sleep", "priority": "high"},
      {"id": "hl4", "text": "Practice 10 minutes of pranayama (Anulom Vilom) daily for stress reduction", "priority": "normal"},
      {"id": "hl5", "text": "Avoid tight hairstyles, excessive heat styling, and chemical treatments", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_hair, 'faqs', 'Frequently Asked Questions', 3, '{
    "faqs": [
      {"id": "hf1", "question": "How long before I see improvement in hair fall?", "answer": "Homeopathic treatment typically shows visible improvement in 6–12 weeks. Hair growth cycles are 3–4 months, so patience is essential. Early signs include reduced fall during washing and new baby hair growth."},
      {"id": "hf2", "question": "Can I use minoxidil alongside homeopathic treatment?", "answer": "It is best to discuss with your doctor. Homeopathy works on a constitutional level and external chemical treatments may be reduced gradually as internal healing progresses."},
      {"id": "hf3", "question": "Is hair fall during seasonal changes normal?", "answer": "Mild seasonal shedding (especially autumn) is normal. If it exceeds 100 strands/day or persists beyond 6 weeks, consult your homeopath for a constitutional review."},
      {"id": "hf4", "question": "Should I take any supplements?", "answer": "Your homeopath may recommend specific supplements based on blood work. Common supportive supplements include iron, biotin, and Vitamin D3, but these should be guided by test results."}
    ]
  }'::jsonb),
  (v_tpl_hair, 'symptom_tracking', 'Track Your Progress', 4, '{
    "intro": "Monitor these indicators weekly to help your doctor assess treatment response.",
    "items": [
      {"id": "ht1", "text": "Count approximate hair strands lost during washing (normal: <80)", "priority": "high"},
      {"id": "ht2", "text": "Note any new baby hair growth along the hairline", "priority": "normal"},
      {"id": "ht3", "text": "Track scalp condition: itching, dryness, oiliness, or dandruff changes", "priority": "normal"},
      {"id": "ht4", "text": "Record stress levels and sleep quality (1–10 scale)", "priority": "normal"},
      {"id": "ht5", "text": "Photograph the same area of scalp monthly for comparison", "priority": "high"}
    ]
  }'::jsonb);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. PCOD Management Program
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.care_plan_templates (
    id, clinic_id, doctor_id, title, slug, summary, primary_category,
    disease_tags, symptom_tags, template_type, status, published_at,
    visibility, is_shared, version
  ) VALUES (
    gen_random_uuid(), v_system_clinic_id, v_system_doctor_id,
    'PCOD Management Program',
    'official-pcod-management',
    'Holistic homeopathic management of Polycystic Ovarian Disease through hormonal balance, anti-inflammatory nutrition, regular exercise, and stress management.',
    'disease_protocol',
    ARRAY['pcod', 'pcos', 'hormonal_imbalance'],
    ARRAY['irregular_periods', 'weight_gain', 'acne', 'hirsutism', 'mood_swings'],
    'official', 'published', now(),
    'clinic', true, 1
  ) RETURNING id INTO v_tpl_pcod;

  INSERT INTO public.care_plan_blocks (template_id, block_type, title, sort_order, payload) VALUES
  (v_tpl_pcod, 'diet', 'Anti-Inflammatory PCOD Diet', 0, '{
    "intro": "An anti-inflammatory, low-glycemic diet helps regulate insulin resistance — the root driver of PCOD. Focus on whole foods, healthy fats, and fiber.",
    "items": [
      {"id": "p1", "text": "Start morning with warm water + 1 tsp fenugreek (methi) seeds soaked overnight", "priority": "high"},
      {"id": "p2", "text": "Include chromium-rich foods: broccoli, green beans, whole grains", "priority": "normal"},
      {"id": "p3", "text": "Eat complex carbs only: brown rice, quinoa, millets — avoid white rice and maida", "priority": "high"},
      {"id": "p4", "text": "Add cinnamon (1/2 tsp daily) to meals — it improves insulin sensitivity", "priority": "normal"},
      {"id": "p5", "text": "Include anti-inflammatory spices: turmeric, ginger, and fenugreek in cooking", "priority": "normal"},
      {"id": "p6", "text": "Eat 2 servings of leafy greens daily for folate and magnesium", "priority": "high"}
    ]
  }'::jsonb),
  (v_tpl_pcod, 'exercise', 'Movement & Exercise Protocol', 1, '{
    "intro": "Regular physical activity is critical for PCOD management. It improves insulin sensitivity, reduces androgens, and supports weight management.",
    "items": [
      {"id": "pe1", "text": "Walk briskly for 30–45 minutes daily, preferably in the morning", "priority": "high"},
      {"id": "pe2", "text": "Include strength training 2–3 times/week to improve insulin sensitivity", "priority": "high"},
      {"id": "pe3", "text": "Practice yoga: Suryanamaskar (5 rounds), Baddha Konasana, and Supta Baddha Konasana", "priority": "normal"},
      {"id": "pe4", "text": "Avoid extreme exercise — moderate, consistent activity is more beneficial", "priority": "normal"},
      {"id": "pe5", "text": "Track daily steps — aim for 8,000–10,000 steps", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_pcod, 'precautions', 'Important Precautions', 2, '{
    "intro": "These precautions help prevent symptom flare-ups and support long-term hormonal recovery.",
    "items": [
      {"id": "pp1", "text": "Maintain consistent meal timings — erratic eating worsens insulin spikes", "priority": "high"},
      {"id": "pp2", "text": "Avoid plastic containers for food storage — BPA mimics estrogen", "priority": "normal"},
      {"id": "pp3", "text": "Limit screen time before bed — blue light disrupts melatonin and cortisol cycles", "priority": "normal"},
      {"id": "pp4", "text": "Do not skip meals, especially breakfast — it triggers cortisol elevation", "priority": "high"},
      {"id": "pp5", "text": "Report any changes in menstrual cycle immediately to your doctor", "priority": "high"}
    ]
  }'::jsonb),
  (v_tpl_pcod, 'faqs', 'Frequently Asked Questions', 3, '{
    "faqs": [
      {"id": "pf1", "question": "Can PCOD be cured with homeopathy?", "answer": "Homeopathy aims to restore hormonal balance and address the root cause. Many patients see significant improvement in cycle regularity, weight, and symptoms within 4–6 months of consistent treatment."},
      {"id": "pf2", "question": "Do I need to follow this diet strictly?", "answer": "Aim for 80% adherence. Occasional deviations are fine, but consistency in diet and exercise is what drives lasting improvement in PCOD."},
      {"id": "pf3", "question": "Will I need this plan forever?", "answer": "As hormonal balance improves, the plan can be gradually relaxed. Most patients transition to a maintenance lifestyle within 6–12 months."},
      {"id": "pf4", "question": "Can I conceive with PCOD?", "answer": "Yes. PCOD is one of the most treatable causes of fertility challenges. Homeopathic treatment combined with lifestyle changes can significantly improve ovulation and fertility."}
    ]
  }'::jsonb),
  (v_tpl_pcod, 'wellness_tasks', 'Daily Wellness Checklist', 4, '{
    "tasks": [
      {"id": "pt1", "title": "Morning methi water", "description": "Drink fenugreek-soaked water on an empty stomach", "frequency": "daily", "timeOfDay": "morning"},
      {"id": "pt2", "title": "30-min walk or yoga", "description": "Brisk walk or structured yoga session", "frequency": "daily", "timeOfDay": "morning"},
      {"id": "pt3", "title": "Track menstrual symptoms", "description": "Log flow, pain level, mood in your diary", "frequency": "daily", "timeOfDay": "evening"},
      {"id": "pt4", "title": "8 glasses of water", "description": "Track hydration through the day", "frequency": "daily", "timeOfDay": "throughout"},
      {"id": "pt5", "title": "Lights out by 10:30 PM", "description": "Consistent sleep schedule for cortisol regulation", "frequency": "daily", "timeOfDay": "night"}
    ]
  }'::jsonb);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3. Acne Management Program
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.care_plan_templates (
    id, clinic_id, doctor_id, title, slug, summary, primary_category,
    disease_tags, symptom_tags, template_type, status, published_at,
    visibility, is_shared, version
  ) VALUES (
    gen_random_uuid(), v_system_clinic_id, v_system_doctor_id,
    'Acne Management Program',
    'official-acne-management',
    'A structured homeopathic care plan for acne targeting skin health from within — addressing digestion, hormonal triggers, skincare routines, and dietary modifications.',
    'disease_protocol',
    ARRAY['acne', 'acne_vulgaris', 'cystic_acne'],
    ARRAY['pimples', 'oily_skin', 'blackheads', 'scarring', 'inflammation'],
    'official', 'published', now(),
    'clinic', true, 1
  ) RETURNING id INTO v_tpl_acne;

  INSERT INTO public.care_plan_blocks (template_id, block_type, title, sort_order, payload) VALUES
  (v_tpl_acne, 'diet', 'Skin-Healing Nutrition', 0, '{
    "intro": "What you eat directly impacts skin health. An anti-inflammatory, gut-friendly diet reduces acne triggers and supports skin repair.",
    "items": [
      {"id": "a1", "text": "Eat zinc-rich foods daily: pumpkin seeds, chickpeas, spinach, mushrooms", "priority": "high"},
      {"id": "a2", "text": "Include vitamin A sources: carrots, sweet potato, papaya, mango", "priority": "normal"},
      {"id": "a3", "text": "Consume probiotics: fresh curd, buttermilk, or fermented vegetables", "priority": "high"},
      {"id": "a4", "text": "Drink 8–10 glasses of water daily — hydration is essential for skin detox", "priority": "high"},
      {"id": "a5", "text": "Include vitamin E sources: almonds, sunflower seeds, avocado", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_acne, 'restricted_foods', 'Acne Trigger Foods', 1, '{
    "intro": "These foods are clinically associated with acne flare-ups through glycemic spikes, hormonal disruption, or inflammatory pathways.",
    "items": [
      {"id": "ar1", "text": "Avoid dairy milk — it contains IGF-1 which stimulates sebum production", "priority": "high"},
      {"id": "ar2", "text": "Eliminate refined sugar and white flour products", "priority": "high"},
      {"id": "ar3", "text": "Reduce fried, oily, and processed snacks", "priority": "normal"},
      {"id": "ar4", "text": "Limit whey protein supplements — they spike insulin and androgens", "priority": "normal"},
      {"id": "ar5", "text": "Reduce chocolate consumption during active breakouts", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_acne, 'lifestyle', 'Skincare Routine', 2, '{
    "intro": "A simple, consistent skincare routine prevents new breakouts while supporting homeopathic treatment.",
    "items": [
      {"id": "al1", "text": "Wash face twice daily with a gentle, non-comedogenic cleanser", "priority": "high"},
      {"id": "al2", "text": "Use a lightweight, oil-free moisturizer even on oily skin", "priority": "normal"},
      {"id": "al3", "text": "Apply sunscreen SPF 30+ daily — sun exposure worsens post-acne marks", "priority": "high"},
      {"id": "al4", "text": "Never pop or squeeze pimples — it causes scarring and infection", "priority": "high"},
      {"id": "al5", "text": "Change pillowcase every 2–3 days, and keep phone screen clean", "priority": "normal"},
      {"id": "al6", "text": "Avoid touching your face throughout the day", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_acne, 'sleep', 'Sleep & Stress Management', 3, '{
    "intro": "Poor sleep and chronic stress directly increase cortisol, which triggers sebum overproduction and inflammation.",
    "items": [
      {"id": "as1", "text": "Sleep 7–8 hours nightly — skin repair happens during deep sleep (10 PM–2 AM)", "priority": "high"},
      {"id": "as2", "text": "Practice 5–10 minutes of deep breathing before bed", "priority": "normal"},
      {"id": "as3", "text": "Avoid screens 30 minutes before sleep", "priority": "normal"},
      {"id": "as4", "text": "Journal or practice gratitude to reduce stress-driven cortisol spikes", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_acne, 'faqs', 'Frequently Asked Questions', 4, '{
    "faqs": [
      {"id": "af1", "question": "How long does homeopathic acne treatment take?", "answer": "Mild acne shows improvement in 4–6 weeks. Moderate to severe acne may take 3–6 months. The goal is lasting cure, not temporary suppression."},
      {"id": "af2", "question": "Will my acne get worse before it gets better?", "answer": "Some patients experience a brief initial aggravation (1–2 weeks) as the body''s healing response activates. This is a positive sign and usually settles quickly."},
      {"id": "af3", "question": "Can I use topical creams alongside homeopathy?", "answer": "Mild non-medicated cleansers and sunscreen are fine. Discuss any prescription topicals (retinoids, antibiotics) with your homeopath to ensure compatibility."}
    ]
  }'::jsonb);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4. Pigmentation Care Program
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.care_plan_templates (
    id, clinic_id, doctor_id, title, slug, summary, primary_category,
    disease_tags, symptom_tags, template_type, status, published_at,
    visibility, is_shared, version
  ) VALUES (
    gen_random_uuid(), v_system_clinic_id, v_system_doctor_id,
    'Pigmentation Care Program',
    'official-pigmentation-care',
    'A holistic approach to managing melasma and hyperpigmentation through antioxidant nutrition, sun protection, internal detoxification, and constitutional homeopathic treatment.',
    'recovery_journey',
    ARRAY['melasma', 'hyperpigmentation', 'dark_spots'],
    ARRAY['uneven_skin_tone', 'dark_patches', 'sun_damage', 'post_inflammatory_marks'],
    'official', 'published', now(),
    'clinic', true, 1
  ) RETURNING id INTO v_tpl_pigmentation;

  INSERT INTO public.care_plan_blocks (template_id, block_type, title, sort_order, payload) VALUES
  (v_tpl_pigmentation, 'diet', 'Antioxidant-Rich Nutrition', 0, '{
    "intro": "Antioxidants neutralize free radicals that trigger melanin overproduction. A diet rich in vitamins C, E, and glutathione precursors supports even skin tone.",
    "items": [
      {"id": "pg1", "text": "Eat vitamin C-rich fruits daily: amla, guava, kiwi, oranges, bell peppers", "priority": "high"},
      {"id": "pg2", "text": "Include glutathione-boosting foods: avocado, asparagus, turmeric, garlic", "priority": "normal"},
      {"id": "pg3", "text": "Consume berries (blueberries, strawberries) for anthocyanin antioxidants", "priority": "normal"},
      {"id": "pg4", "text": "Add tomatoes and watermelon for lycopene — a powerful skin protectant", "priority": "normal"},
      {"id": "pg5", "text": "Drink green tea (2 cups daily) — rich in epigallocatechin gallate (EGCG)", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_pigmentation, 'hydration', 'Hydration Protocol', 1, '{
    "intro": "Adequate hydration supports skin cell turnover and toxin elimination, both critical for reducing pigmentation.",
    "items": [
      {"id": "ph1", "text": "Drink 2.5–3 liters of water daily", "priority": "high"},
      {"id": "ph2", "text": "Start day with warm lemon water (vitamin C boost + liver support)", "priority": "normal"},
      {"id": "ph3", "text": "Include coconut water and fresh vegetable juices", "priority": "normal"},
      {"id": "ph4", "text": "Reduce caffeine — it can dehydrate skin and worsen pigmentation", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_pigmentation, 'precautions', 'Sun Protection & Skincare', 2, '{
    "intro": "Sun exposure is the #1 aggravator of pigmentation. Strict sun protection is non-negotiable during treatment.",
    "items": [
      {"id": "ppr1", "text": "Apply broad-spectrum SPF 50 sunscreen every 2–3 hours when outdoors", "priority": "high"},
      {"id": "ppr2", "text": "Wear a wide-brimmed hat and sunglasses when in direct sunlight", "priority": "high"},
      {"id": "ppr3", "text": "Avoid sun exposure between 10 AM and 4 PM whenever possible", "priority": "normal"},
      {"id": "ppr4", "text": "Do not use lemon juice directly on skin — it causes photosensitivity", "priority": "normal"},
      {"id": "ppr5", "text": "Avoid harsh chemical peels during homeopathic treatment", "priority": "high"}
    ]
  }'::jsonb),
  (v_tpl_pigmentation, 'awareness_notes', 'Understanding Pigmentation', 3, '{
    "intro": "Knowledge about your condition empowers you to make better daily choices and maintain realistic expectations.",
    "items": [
      {"id": "pa1", "text": "Pigmentation is driven by melanocytes deep in the skin — surface treatments alone are insufficient", "priority": "normal"},
      {"id": "pa2", "text": "Hormonal changes (pregnancy, contraceptives, thyroid) can trigger or worsen melasma", "priority": "normal"},
      {"id": "pa3", "text": "Homeopathy addresses the internal hormonal and metabolic triggers, not just the visible patches", "priority": "high"},
      {"id": "pa4", "text": "Improvement is gradual — expect 3–6 months for noticeable lightening", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_pigmentation, 'faqs', 'Frequently Asked Questions', 4, '{
    "faqs": [
      {"id": "pgf1", "question": "Will pigmentation come back after treatment?", "answer": "Homeopathic treatment addresses root causes. If sun protection and lifestyle are maintained, recurrence is minimal. However, hormonal triggers (like pregnancy) may cause temporary flare-ups."},
      {"id": "pgf2", "question": "Can I use skin lightening creams?", "answer": "Avoid hydroquinone and steroid-based creams — they cause thinning and rebound darkening. Your homeopath may recommend safe, supportive topicals if needed."},
      {"id": "pgf3", "question": "Is pigmentation related to liver health?", "answer": "Yes. In holistic medicine, liver congestion is closely linked to skin pigmentation. Your homeopathic treatment likely includes liver support remedies."}
    ]
  }'::jsonb);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 5. Weight Management Program
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.care_plan_templates (
    id, clinic_id, doctor_id, title, slug, summary, primary_category,
    disease_tags, symptom_tags, template_type, status, published_at,
    visibility, is_shared, version
  ) VALUES (
    gen_random_uuid(), v_system_clinic_id, v_system_doctor_id,
    'Weight Management Program',
    'official-weight-management',
    'A sustainable, metabolism-focused weight management plan combining homeopathic constitutional treatment with balanced nutrition, daily movement, and behavioral habit formation.',
    'lifestyle_plan',
    ARRAY['obesity', 'overweight', 'metabolic_syndrome'],
    ARRAY['weight_gain', 'slow_metabolism', 'cravings', 'fatigue', 'bloating'],
    'official', 'published', now(),
    'clinic', true, 1
  ) RETURNING id INTO v_tpl_weight;

  INSERT INTO public.care_plan_blocks (template_id, block_type, title, sort_order, payload) VALUES
  (v_tpl_weight, 'diet', 'Balanced Nutrition Plan', 0, '{
    "intro": "Sustainable weight loss comes from nourishing your body, not starving it. Focus on nutrient-dense, metabolism-boosting foods.",
    "items": [
      {"id": "w1", "text": "Eat 5 small meals instead of 3 large ones — keeps metabolism active", "priority": "high"},
      {"id": "w2", "text": "Start lunch and dinner with a bowl of salad or vegetable soup", "priority": "normal"},
      {"id": "w3", "text": "Include protein at every meal: dal, paneer, eggs, sprouts, or legumes", "priority": "high"},
      {"id": "w4", "text": "Use millets (ragi, jowar, bajra) instead of wheat/rice for 2 meals daily", "priority": "normal"},
      {"id": "w5", "text": "Eat dinner by 7:30 PM — allow 2.5 hours before sleep", "priority": "high"},
      {"id": "w6", "text": "Drink warm water with lemon and honey first thing in the morning", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_weight, 'allowed_foods', 'Recommended Foods', 1, '{
    "intro": "These foods actively support fat metabolism, reduce inflammation, and provide sustained energy without insulin spikes.",
    "items": [
      {"id": "wa1", "text": "Green leafy vegetables: unlimited quantity — very low calorie, high nutrient", "priority": "high"},
      {"id": "wa2", "text": "Healthy fats: coconut oil (1 tbsp), ghee (1 tsp), nuts (a small handful)", "priority": "normal"},
      {"id": "wa3", "text": "High-fiber fruits: guava, apple with skin, papaya, berries", "priority": "normal"},
      {"id": "wa4", "text": "Spices that boost metabolism: black pepper, cinnamon, ginger, cumin", "priority": "normal"},
      {"id": "wa5", "text": "Fermented foods: idli, dosa, curd, kanji — support gut health", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_weight, 'restricted_foods', 'Foods to Minimize', 2, '{
    "intro": "These foods contribute to fat storage, insulin resistance, and inflammatory weight gain.",
    "items": [
      {"id": "wr1", "text": "Refined carbohydrates: white bread, maida, instant noodles, pastries", "priority": "high"},
      {"id": "wr2", "text": "Sugary beverages: packaged juices, sodas, sweetened chai/coffee", "priority": "high"},
      {"id": "wr3", "text": "Deep-fried foods: samosas, pakoras, chips — high in trans fats", "priority": "normal"},
      {"id": "wr4", "text": "Alcohol: adds empty calories and impairs fat metabolism", "priority": "normal"},
      {"id": "wr5", "text": "Late-night snacking — any food after 8 PM", "priority": "high"}
    ]
  }'::jsonb),
  (v_tpl_weight, 'exercise', 'Movement Plan', 3, '{
    "intro": "Exercise is essential not just for calorie burn, but for improving insulin sensitivity, mood, and metabolic rate.",
    "items": [
      {"id": "we1", "text": "Walk 10,000 steps daily — use a pedometer or phone tracker", "priority": "high"},
      {"id": "we2", "text": "Include 20 minutes of strength training 3x/week (bodyweight exercises are fine)", "priority": "high"},
      {"id": "we3", "text": "Practice Suryanamaskar (Sun Salutation) — 10 rounds daily", "priority": "normal"},
      {"id": "we4", "text": "Take stairs instead of elevators whenever possible", "priority": "normal"},
      {"id": "we5", "text": "Stretch for 5 minutes after waking up and before bed", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_weight, 'routines', 'Daily Routine Template', 4, '{
    "intro": "A structured daily routine stabilizes cortisol, improves digestion, and prevents impulsive eating.",
    "items": [
      {"id": "wrt1", "text": "6:30 AM — Wake up, warm lemon water, 10-min walk or stretching", "priority": "normal"},
      {"id": "wrt2", "text": "7:30 AM — Breakfast: protein + fiber (e.g., sprout chaat, oats upma)", "priority": "normal"},
      {"id": "wrt3", "text": "10:30 AM — Mid-morning snack: 1 fruit or handful of nuts", "priority": "normal"},
      {"id": "wrt4", "text": "1:00 PM — Lunch: salad first, then dal/sabji/roti (millet preferred)", "priority": "normal"},
      {"id": "wrt5", "text": "4:00 PM — Green tea + roasted chana or makhana", "priority": "normal"},
      {"id": "wrt6", "text": "7:00 PM — Light dinner: soup + grilled paneer/vegetables or khichdi", "priority": "normal"},
      {"id": "wrt7", "text": "10:00 PM — Bedtime: no screens 30 min before, gratitude journaling", "priority": "normal"}
    ]
  }'::jsonb),
  (v_tpl_weight, 'faqs', 'Frequently Asked Questions', 5, '{
    "faqs": [
      {"id": "wf1", "question": "How much weight can I expect to lose?", "answer": "Healthy, sustainable weight loss is 0.5–1 kg per week. Rapid weight loss often leads to muscle loss and rebound gain. Focus on body composition rather than just the scale."},
      {"id": "wf2", "question": "Do homeopathic medicines cause weight gain?", "answer": "No. Homeopathic medicines are in ultra-diluted doses and have no caloric content. They work by correcting metabolic and hormonal imbalances that contribute to weight issues."},
      {"id": "wf3", "question": "Can I follow a keto or intermittent fasting diet?", "answer": "Discuss specific diets with your homeopath. Extreme diets may interfere with constitutional treatment. This plan provides a balanced approach that works well with homeopathic remedies."},
      {"id": "wf4", "question": "What if I plateau after initial weight loss?", "answer": "Plateaus are normal. Your body is adjusting to a new set point. Your doctor may adjust remedies and suggest exercise modifications. Consistency is key — do not give up."}
    ]
  }'::jsonb);

END $seed$;
