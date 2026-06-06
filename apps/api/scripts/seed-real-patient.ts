import { supabaseAdmin } from "../src/supabase";
import { allocatePatientCode } from "../src/lib/healthcareIds";

async function run() {
  console.log("=== Seeding Real Patient Journey ===");

  // 1. Get Doctor
  // 1. Get Doctor Profile
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("id, clinic_id")
    .eq("full_name", "Nagendra Pandey")
    .single();

  if (profErr || !profile) throw profErr || new Error("Doctor profile not found");

  const clinicId = profile.clinic_id;
  const doctorId = profile.id;
  console.log(`✅ Found Doctor: ${doctorId} (Clinic: ${clinicId})`);

  // 2. Create Patient
  const patientCode = await allocatePatientCode(supabaseAdmin, clinicId);
  const { data: patient, error: patientErr } = await supabaseAdmin
    .from("patients")
    .insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      name: "Sarah Connor",
      phone: "+15550123456",
      email: "sarah.connor@example.com",
      gender: "FEMALE",
      age: 38,
      blood_group: "O+",
      initial_chief_complaint: "Chronic migraine and fatigue. Needs comprehensive holistic care.",
      patient_code: patientCode
    })
    .select("id")
    .single();
  
  if (patientErr) throw patientErr;
  const patientId = patient.id;
  console.log(`✅ Created Patient: Sarah Connor`);
  console.log(`🔑 Patient Code: ${patientCode}`);

  // 3. Assign a Care Plan
  const { data: carePlans } = await supabaseAdmin
    .from("care_plan_templates")
    .select("id, title")
    .eq("clinic_id", clinicId)
    .limit(1);

  if (carePlans && carePlans.length > 0) {
    console.log(`✅ Assigning Care Plan: ${carePlans[0].title}`);
    // Simulate assigning it (Normally merged into a consultation note, we'll create a dummy consultation)
    const { data: consult, error: consultErr } = await supabaseAdmin
      .from("consultations")
      .insert({
        id: crypto.randomUUID(),
        clinic_id: clinicId,
        patient_id: patientId,
        attending_user_id: doctorId,
        type: "INITIAL",
        consultation_mode: "IN_CLINIC",
        lifecycle_status: "ACTIVE",
        started_at: new Date().toISOString(),
        advice: { diet: "Follow the assigned care plan rigorously.", lifestyle: "" },
        follow_up_recommended_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select("id")
      .single();
    if (consultErr) throw consultErr;

    // Attach care plan to timeline as an event
    await supabaseAdmin.from("patient_timeline").insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: patientId,
      type: "CARE_PLAN_ASSIGNED",
      title: `Care Plan: ${carePlans[0].title}`,
      description: "Assigned comprehensive care plan.",
      metadata: { carePlanId: carePlans[0].id, consultationId: consult.id }
    });
    
    // Store consult ID for prescription
    (global as any).consultId = consult.id;
  } else {
    console.log("⚠️ No Care Plan Templates found to assign.");
  }

  // 4. Assign an LMS Course
  const { data: courses } = await supabaseAdmin
    .from("content_courses")
    .select("id, title")
    .eq("clinic_id", clinicId)
    .limit(1);

  if (courses && courses.length > 0) {
    const courseId = courses[0].id;
    console.log(`✅ Assigning LMS Course: ${courses[0].title}`);
    await supabaseAdmin.from("patient_course_enrollments").insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: patientId,
      course_id: courseId,
      enrolled_by: doctorId,
      status: "IN_PROGRESS"
    });

    await supabaseAdmin.from("patient_timeline").insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: patientId,
      type: "CONTENT_ASSIGNED",
      title: `Course Enrolled: ${courses[0].title}`,
      description: "Learn about managing your condition naturally.",
      metadata: { courseId }
    });
  } else {
    console.log("⚠️ No LMS Courses found to assign.");
  }

  // 5. Prescribe Medications
  console.log(`✅ Prescribing Medications (Natrum Mur 200c & Arnica 30c)`);
  const { data: rx, error: rxErr } = await supabaseAdmin
    .from("prescriptions")
    .insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: patientId,
      consultation_id: (global as any).consultId || null,
      items: [
        {
          id: "item-1",
          remedy: "Natrum Mur 200c",
          potency: "200c",
          scale: "C",
          dosage: "4 pills",
          frequency: "Twice daily",
          duration: "14 days",
          instructions: "Take 30 mins away from food",
          type: "CONSTITUTIONAL",
          status: "ACTIVE"
        },
        {
          id: "item-2",
          remedy: "Arnica 30c",
          potency: "30c",
          scale: "C",
          dosage: "2 pills",
          frequency: "SOS",
          duration: "As needed",
          instructions: "Take only when experiencing acute fatigue",
          type: "ACUTE",
          status: "ACTIVE"
        }
      ]
    })
    .select("id")
    .single();

  if (rxErr) throw rxErr;

  await supabaseAdmin.from("patient_timeline").insert({
    id: crypto.randomUUID(),
    clinic_id: clinicId,
    patient_id: patientId,
    type: "PRESCRIPTION_ISSUED",
    title: "New Prescription",
    description: "Natrum Mur 200c, Arnica 30c",
    metadata: { prescriptionId: rx.id }
  });

  // 6. Schedule Follow-up Appointment
  console.log(`✅ Scheduling Follow-up Appointment`);
  const followUpDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: apt, error: aptErr } = await supabaseAdmin
    .from("appointments")
    .insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_for: followUpDate,
      duration_minutes: 30,
      consultation_mode: "IN_CLINIC",
      status: "CONFIRMED",
      reason: "Initial Follow-up"
    })
    .select("id")
    .single();

  if (aptErr) throw aptErr;
  await supabaseAdmin.from("patient_timeline").insert({
    id: crypto.randomUUID(),
    clinic_id: clinicId,
    patient_id: patientId,
    type: "APPOINTMENT_SCHEDULED",
    title: "Follow-up Appointment Confirmed",
    description: `Scheduled for ${followUpDate.split('T')[0]} (Online)`,
    metadata: { appointmentId: apt.id }
  });

  // 7. Seed Initial Message
  console.log(`✅ Sending Onboarding Message`);
  const { data: thread, error: threadErr } = await supabaseAdmin
    .from("conversations")
    .insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: patientId,
      context_type: "GENERAL"
    })
    .select("id")
    .single();
  
  if (!threadErr) {
    await supabaseAdmin.from("messages").insert({
      id: crypto.randomUUID(),
      clinic_id: clinicId,
      conversation_id: thread.id,
      sender_type: "CLINIC",
      sender_id: doctorId,
      body: "Hi Sarah, welcome to GlowHomeo! I have assigned your initial care plan, your medication schedule, and a foundational course to help you understand your healing journey. Please review them in your app and let me know if you have any questions.",
      status: "DELIVERED"
    });
  }

  console.log("\n🚀 SETUP COMPLETE! 🚀");
  console.log("=========================================");
  console.log(`Patient Name: Sarah Connor`);
  console.log(`Patient Code: ${patientCode}`);
  console.log("=========================================");
  console.log(`You can now log into the mobile app using this code!`);
}

run().catch(e => {
  console.error("❌ Fatal Error:", e);
  process.exit(1);
});
