import { supabaseAdmin } from "../supabase";
import { logger } from "../lib/logger";

async function run() {
  logger.info("seed_flagship_program_started");

  try {
    // 1. Grab a clinic id
    const { data: clinics, error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .limit(1);

    if (clinicErr || !clinics || clinics.length === 0) {
      throw new Error("No clinics found in the system to attach the template to.");
    }
    const clinicId = clinics[0].id;

    // 2. Create the Flagship Program
    const { data: program, error: progErr } = await supabaseAdmin
      .from("tp_programs")
      .insert({
        clinic_id: clinicId,
        title: "The 100-Day Vitality Reset",
        description: "A comprehensive, 15-week constitutional treatment journey blending homeopathic prescription with deep lifestyle, dietary, and psychological tracking. Designed for chronic conditions.",
        duration_days: 100,
        status: "published"
      })
      .select("id")
      .single();

    if (progErr || !program) throw progErr;
    const programId = program.id;

    // --- DAY 0: The Baseline ---
    const { data: step0, error: err0 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 0, title: "Day 0: The Baseline", sort_order: 0 })
      .select("id").single();
    if (err0) throw err0;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step0.id, category: "media", block_type: "youtube_video", sort_order: 0, is_required: false, config: { url: "https://www.youtube.com/watch?v=1sOWceAZPEU" } },
      { step_id: step0.id, category: "assessment", block_type: "mcq_form", sort_order: 1, is_required: true, config: { question: "The Comprehensive Baseline Survey: How would you rate your primary symptom today?", options: ["Severe", "Moderate", "Mild", "None"] } },
      { step_id: step0.id, category: "content", block_type: "diet_plan", sort_order: 2, is_required: false, config: { title: "The 30-Day Anti-Inflammatory Protocol", allowed: ["Bone broth", "Cooked veg"], avoid: ["Dairy", "Gluten", "Sugar"] } }
    ]);

    // --- DAY 3: Early Check ---
    const { data: step3, error: err3 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 3, title: "Day 3: Early Check", sort_order: 1 })
      .select("id").single();
    if (err3) throw err3;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step3.id, category: "tracking", block_type: "checklist", sort_order: 0, is_required: true, config: { title: "Remedy Compliance", items: ["Took morning dose", "Took evening dose"] } },
      { step_id: step3.id, category: "content", block_type: "faq_accordion", sort_order: 1, is_required: false, config: { faqs: [{ question: "Why do I feel tired?", answer: "Your body is beginning to heal and shift energy inward." }] } },
      { step_id: step3.id, category: "content", block_type: "course", sort_order: 2, is_required: false, config: { course_id: "example-course-uuid-1234", title: "Fundamentals of Homeopathy", description: "Learn how the remedies work with your body's vital force." } }
    ]);

    // --- DAY 7: Week 1 Check-In ---
    const { data: step7, error: err7 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 7, title: "Day 7: Week 1 Check-In", sort_order: 2 })
      .select("id").single();
    if (err7) throw err7;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step7.id, category: "communication", block_type: "whatsapp_message", sort_order: 0, is_required: false, config: { template_id: "wa_checkin_1", fallback_text: "Time for your Week 1 Check-in! Please open your app." } },
      { step_id: step7.id, category: "assessment", block_type: "mcq_form", sort_order: 1, is_required: true, config: { question: "Compared to last week, my energy is:", options: ["Worse", "Same", "Better", "Much Better"] } }
    ]);

    // --- DAY 14: The Aggravation Window ---
    const { data: step14, error: err14 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 14, title: "Day 14: The Aggravation Window", sort_order: 3 })
      .select("id").single();
    if (err14) throw err14;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step14.id, category: "content", block_type: "rich_text", sort_order: 0, is_required: false, config: { html: "<h3>Understanding Homeopathic Aggravation</h3><p>It is normal for old symptoms to briefly flare up during week 2.</p>" } },
      { step_id: step14.id, category: "tracking", block_type: "symptom_tracker", sort_order: 1, is_required: true, config: { symptom: "Primary Pain", scale: "1-10 slider" } }
    ]);

    // --- DAY 30: End of Month 1 ---
    const { data: step30, error: err30 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 30, title: "Day 30: End of Month 1", sort_order: 4 })
      .select("id").single();
    if (err30) throw err30;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step30.id, category: "tracking", block_type: "progress_photo", sort_order: 0, is_required: true, config: { prompt: "Upload your Month 1 progress photo." } },
      { step_id: step30.id, category: "communication", block_type: "booking_link", sort_order: 1, is_required: false, config: { url: "https://cal.com/glowhomeo/followup", title: "Schedule Month 1 Tele-consultation" } }
    ]);

    // --- DAY 45: Reintroduction ---
    const { data: step45, error: err45 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 45, title: "Day 45: Reintroduction", sort_order: 5 })
      .select("id").single();
    if (err45) throw err45;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step45.id, category: "content", block_type: "diet_plan", sort_order: 0, is_required: false, config: { title: "Reintroduction Phase Guidelines", allowed: ["Dairy (if fermented)"], avoid: ["Gluten", "Sugar"] } }
    ]);

    // --- DAY 60: Month 2 Review ---
    const { data: step60, error: err60 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 60, title: "Day 60: Month 2 Review", sort_order: 6 })
      .select("id").single();
    if (err60) throw err60;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step60.id, category: "assessment", block_type: "mcq_form", sort_order: 0, is_required: true, config: { question: "Deep Constitutional Survey: How is your mood and mental clarity?", options: ["Excellent", "Good", "Fair", "Poor"] } },
      { step_id: step60.id, category: "media", block_type: "audio_clip", sort_order: 1, is_required: false, config: { title: "10-Minute Stress Reduction Meditation", url: "https://example.com/meditation.mp3" } }
    ]);

    // --- DAY 90: The Final Stretch ---
    const { data: step90, error: err90 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 90, title: "Day 90: The Final Stretch", sort_order: 7 })
      .select("id").single();
    if (err90) throw err90;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step90.id, category: "communication", block_type: "whatsapp_message", sort_order: 0, is_required: false, config: { template_id: "wa_nudge_90", fallback_text: "You are almost at the finish line! Stay strong." } },
      { step_id: step90.id, category: "tracking", block_type: "checklist", sort_order: 1, is_required: true, config: { title: "Maintenance Habits", items: ["Hydration", "Sleep", "Remedy"] } }
    ]);

    // --- DAY 100: The Outcome & Graduation ---
    const { data: step100, error: err100 } = await supabaseAdmin
      .from("tp_steps")
      .insert({ program_id: programId, day_offset: 100, title: "Day 100: Outcome & Graduation", sort_order: 8 })
      .select("id").single();
    if (err100) throw err100;

    await supabaseAdmin.from("tp_blocks").insert([
      { step_id: step100.id, category: "assessment", block_type: "mcq_form", sort_order: 0, is_required: true, config: { question: "The Final Baseline Comparison: Compared to Day 0, how is your overall health now?", options: ["Completely Resolved", "Significantly Better", "Slightly Better", "No Change", "Worse"] } },
      { step_id: step100.id, category: "communication", block_type: "review_request", sort_order: 1, is_required: false, config: { prompt: "Share your healing story with us!", link: "https://g.page/review/glowhomeo" } },
      { step_id: step100.id, category: "communication", block_type: "booking_link", sort_order: 2, is_required: false, config: { url: "https://cal.com/glowhomeo/maintenance", title: "Book your Maintenance Phase evaluation" } }
    ]);

    logger.info("seed_flagship_program_success", { programId });
    console.log(`\n✅ Successfully Seeded Flagship Master Template: "The 100-Day Vitality Reset"`);
    console.log(`Program ID: ${programId}\n`);
    process.exit(0);
  } catch (error) {
    logger.error("seed_flagship_program_failed", { error: error instanceof Error ? error.message : String(error) });
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
}

void run();
