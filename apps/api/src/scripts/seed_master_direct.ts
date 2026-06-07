// @ts-nocheck
import { supabaseAdmin } from "../supabase";

const programTitle = "The 100-Day PCOS Holistic Reversal (Functional & Homeopathic)";
const programDescription = "The undisputed world-class protocol for PCOS. Integrates Classical Homeopathy, Functional Medicine (DUTCH Testing, CGM Tracking), Circadian Fasting, and Seed Cycling. Designed to reverse anovulation, hirsutism, and insulin resistance.";

async function run() {
  console.log("Seeding massive PCOS program directly into Supabase...");
  
  const { data: clinics } = await supabaseAdmin.from("clinics").select("id").limit(1);
  const clinicId = clinics?.[0]?.id || "00000000-0000-0000-0000-000000000000";

  const { data: program, error: progErr } = await supabaseAdmin
    .from("tp_programs")
    .insert({
      clinic_id: clinicId,
      title: programTitle,
      description: programDescription,
      duration_days: 100,
      status: "published"
    })
    .select("id")
    .single();

  if (progErr || !program) throw progErr;
  const programId = program.id;

  async function addStep(dayOffset: number, title: string, blocks: any[]) {
    const { data: step, error: stepErr } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: dayOffset, title, sort_order: dayOffset })
      .select("id")
      .single();
      
    if (stepErr) throw stepErr;
    
    if (blocks.length > 0) {
      const inserts = blocks.map((b, i) => ({
        step_id: step.id,
        category: b.category,
        block_type: b.blockType,
        sort_order: i,
        is_required: b.required,
        config: b.config
      }));
      const { error: blockErr } = await supabaseAdmin.from("tp_blocks").insert(inserts);
      if (blockErr) throw blockErr;
    }
  }

  // Same massive data as before
  const weeklyMilestones = [
    {
      day: 0,
      title: "Week 1: The Functional Baseline & Deep Detox",
      blocks: [
        { category: "communication", blockType: "email_template", required: false, config: { subject: "Welcome to your PCOS Reversal Journey", body: "We are combining Classical Homeopathy with Functional Medicine." } },
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Functional Medicine: Root Cause Diagnostics</h2><p>PCOS is not just an ovarian issue; it is a systemic metabolic syndrome. This week, we strongly recommend ordering a <b>DUTCH Test (Dried Urine Test for Comprehensive Hormones)</b>.</p><p>We also advise wearing a <b>Continuous Glucose Monitor (CGM)</b> for 14 days.</p>" } },
        { category: "content", blockType: "diet_plan", required: false, config: { title: "Phase 1: Anti-Inflammatory & Endocrine Reset", allowed: ["Wild Salmon (Omega 3)", "Cruciferous Veg", "Avocado", "Bone Broth"], avoid: ["All Dairy", "Gluten", "Processed Sugar", "Seed Oils"] } },
        { category: "content", blockType: "faq", required: false, config: { faqs: [{ question: "Why avoid dairy?", answer: "Dairy contains IGF-1 which stimulates ovaries." }, { question: "How does the Homeopathic Remedy work?", answer: "Remedies are prescribed based on your total physical constitution." }]}},
        { category: "tracking", blockType: "symptom_tracker", required: true, config: { symptom: "Baseline Hirsutism", scale: "1-10" } },
        { category: "tracking", blockType: "symptom_tracker", required: true, config: { symptom: "Baseline Cystic Acne", scale: "1-10" } },
        { category: "tracking", blockType: "progress_photo", required: true, config: { prompt: "Upload a baseline photo." } }
      ]
    },
    {
      day: 7,
      title: "Week 2: Targeted Supplementation & Seed Cycling",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Nutritional Bio-Hacking: Inositol & Seeds</h2><p><b>Myo-Inositol & D-Chiro Inositol:</b> 40:1 ratio. <b>Seed Cycling:</b> Consume 1 tbsp raw pumpkin + 1 tbsp raw flax seeds daily.</p>" } },
        { category: "tracking", blockType: "checklist", required: true, config: { title: "Daily Protocol Check", items: ["Took Inositol", "Spearmint Tea", "Seed Cycling Dose", "Took Remedy"] } },
        { category: "assessment", blockType: "weekly_check_in", required: true, config: { questions: ["Have your sugar cravings reduced?", "Any changes in digestive bloating?"] } }
      ]
    },
    {
      day: 14,
      title: "Week 3: Flattening the Glucose Curve",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>The Insulin-Testosterone Axis</h2><ul><li><b>Food Sequencing:</b> Vegetables first, proteins second, carbs last.</li><li><b>Apple Cider Vinegar:</b> 1 tbsp before meals.</li><li><b>Post-Prandial Movement:</b> Walk for 10 minutes after eating.</li></ul>" } },
        { category: "content", blockType: "exercise_plan", required: false, config: { routine: "Avoid HIIT. Switch to slow-weighted strength training." } },
        { category: "media", blockType: "youtube_video", required: false, config: { url: "https://youtube.com/watch?v=glucose_hacks", title: "Visualizing the Glucose Curve" } }
      ]
    },
    {
      day: 21,
      title: "Week 4: Month 1 Clinical Review & Aggravation",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Understanding Homeopathic Aggravation</h2><p>If you experience a temporary flare-up of old symptoms, <b>do not panic</b>. This is the 'Aggravation Window'.</p>" } },
        { category: "assessment", blockType: "monthly_review", required: true, config: { metrics: ["Cycle Length Changes", "Weight/BMI Shift", "Acne Reduction"] } },
        { category: "tracking", blockType: "progress_photo", required: true, config: { prompt: "Upload your Month 1 comparison photo." } },
        { category: "ai", blockType: "ai_follow_up", required: false, config: { target: "doctor", prompt: "Analyze Month 1 progress." } }
      ]
    },
    {
      day: 28,
      title: "Week 5: The Estrobolome & Gut Permeability",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>The Gut-Hormone Connection</h2><p>A sluggish gut leads to beta-glucuronidase production. Introduce L-Glutamine powder and Kimchi.</p>" } },
        { category: "content", blockType: "recipe", required: false, config: { title: "Gut-Healing Bone Broth", ingredients: ["Bones", "ACV", "Ginger", "Turmeric"] } }
      ]
    },
    {
      day: 35,
      title: "Week 6: Liver Detoxification Pathways",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Supporting Hepatic Clearance</h2><p>Place a warm castor oil pack over your liver for 45 minutes every evening.</p>" } },
        { category: "tracking", blockType: "checklist", required: true, config: { title: "Liver Protocol", items: ["Castor Oil Pack", "Dandelion Root Tea", "Zero Alcohol"] } }
      ]
    },
    {
      day: 42,
      title: "Week 7: The Adrenal Steal (Cortisol Reset)",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>The Pregnenolone Steal</h2><p><b>No screens for the first 60 minutes of waking.</b> Get 15 minutes of direct morning sunlight.</p>" } },
        { category: "media", blockType: "audio", required: false, config: { url: "https://audio.com/nsdr", title: "NSDR Protocol" } }
      ]
    },
    {
      day: 49,
      title: "Week 8: Month 2 Deep Constitutional Review",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>The Constitutional Shift</h2><p>In classical homeopathy, healing occurs from the inside out (Hering's Law of Cure).</p>" } },
        { category: "assessment", blockType: "monthly_review", required: true, config: { metrics: ["Mood Stability", "Brain Fog", "Sleep Quality"] } },
        { category: "ai", blockType: "ai_summary", required: false, config: { target: "doctor", prompt: "Summarize psychological shifts." } }
      ]
    },
    {
      day: 56,
      title: "Week 9: Thyroid Optimization",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>The Thyroid-Ovary Axis</h2><p>Track your Basal Body Temperature (BBT) this week.</p>" } },
        { category: "tracking", blockType: "symptom_tracker", required: true, config: { symptom: "Morning BBT", scale: "Exact temperature" } }
      ]
    },
    {
      day: 63,
      title: "Week 10: Circadian Fasting Protocols",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Fasting for Women with PCOS</h2><p>We recommend a gentle <b>12-hour Circadian Fast</b> (7 PM to 7 AM).</p>" } }
      ]
    },
    {
      day: 70,
      title: "Week 11: Sleep Architecture & Melatonin",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Melatonin and Ovarian Health</h2><p>Ensure your bedroom is pitch black and kept at 18°C. Consider 300mg of Magnesium Glycinate.</p>" } }
      ]
    },
    {
      day: 77,
      title: "Week 12: Month 3 Clinical Review",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>The 100-Day Follicle Journey</h2><p>It takes exactly 100 days for an ovarian follicle to mature. Patience pays off now.</p>" } },
        { category: "assessment", blockType: "monthly_review", required: true, config: { metrics: ["Cycle Regularity", "Bleeding Volume"] } }
      ]
    },
    {
      day: 84,
      title: "Week 13: Fertility & Cervical Mucus Tracking",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Tracking the Estrogen Peak</h2><p>Track cervical mucus. Egg-white consistency indicates a healthy estrogen peak.</p>" } },
        { category: "tracking", blockType: "symptom_tracker", required: true, config: { symptom: "Presence of 'Egg-White' Mucus", scale: "None / Little / Abundant" } }
      ]
    },
    {
      day: 91,
      title: "Week 14: The 80/20 Maintenance Lifestyle",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Metabolic Flexibility</h2><p>80% of the time, follow the protocol. 20% of the time, live your life.</p>" } }
      ]
    },
    {
      day: 100,
      title: "Week 15: Graduation & The New Baseline",
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: "<h2>Congratulations on your 100-Day Reset</h2><p>You have successfully reversed the root causes of your PCOS.</p>" } },
        { category: "assessment", blockType: "mcq_form", required: true, config: { question: "Final Outcome: Has your cycle returned to a normal 28-32 day rhythm?", options: ["Yes", "Improved", "No"] } },
        { category: "assessment", blockType: "mcq_form", required: true, config: { question: "Final Outcome: Symptoms reduced?", options: [">80%", "50-80%", "<50%"] } }
      ]
    }
  ];

  for (let i = 107; i <= 280; i += 7) {
    const weekNum = Math.floor(i/7) + 1;
    weeklyMilestones.push({
      day: i,
      title: `Week ${weekNum}: Advanced Maintenance Phase`,
      blocks: [
        { category: "content", blockType: "rich_text", required: false, config: { html: `<h2>Phase 2 Maintenance: Week ${weekNum}</h2><p>Ensure protein intake remains >80g per day to sustain muscle mass.</p>` } },
        { category: "assessment", blockType: "weekly_check_in", required: true, config: { questions: ["Did you ovulate this month?", "Energy stable?"] } },
        { category: "tracking", blockType: "symptom_tracker", required: true, config: { symptom: "PMS Severity", scale: "1-10" } },
        { category: "ai", blockType: "ai_summary", required: false, config: { target: "doctor", prompt: `Analyze Maintenance Week ${weekNum}.` } }
      ]
    });
  }

  for (const milestone of weeklyMilestones) {
    await addStep(milestone.day, milestone.title, milestone.blocks);
  }

  console.log(`World-Class Holistic PCOS Master Template Seeded Successfully! Program ID: ${programId}`);
  process.exit(0);
}

void run();
