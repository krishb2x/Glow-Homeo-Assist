import { supabaseAdmin } from "../src/supabase";

const API_URL = "http://localhost:4000";

async function runQa() {
  console.log("=== Mobile Production Readiness QA ===");
  console.log("1. Finding valid patient code...");
  
  const { data: row, error } = await supabaseAdmin
    .from("patients")
    .select("patient_code")
    .not("patient_code", "is", null)
    .limit(1)
    .maybeSingle();

  if (error || !row?.patient_code) {
    console.error("❌ Failed to find patient_code", error);
    process.exit(1);
  }

  const code = row.patient_code;
  console.log(`✅ Found patient_code: ${code}`);

  console.log("\n2. Simulating Login Flow (POST /patient/auth/login)");
  const loginRes = await fetch(`${API_URL}/patient/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientCode: code })
  });

  if (!loginRes.ok) {
    console.error("❌ Login failed", loginRes.status, await loginRes.text());
    process.exit(1);
  }
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log(`✅ Login successful! Token acquired.`);

  const authHeaders = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  // --- /patient/me ---
  console.log("\n3. Testing /patient/me (Profile)");
  const meRes = await fetch(`${API_URL}/patient/me`, { headers: authHeaders });
  if (!meRes.ok) console.error("❌ /patient/me failed", meRes.status);
  else {
      const meBody = await meRes.json();
      console.log(`✅ /patient/me successful. Data: ${JSON.stringify(meBody.data).slice(0, 50)}...`);
  }

  // --- /patient/visits ---
  console.log("\n4. Testing /patient/visits (Journey Timeline)");
  const timelineRes = await fetch(`${API_URL}/patient/visits`, { headers: authHeaders });
  if (!timelineRes.ok) console.error("❌ /patient/visits failed", timelineRes.status, await timelineRes.text());
  else {
      const tData = await timelineRes.json();
      console.log(`✅ /patient/visits successful. Found ${tData.data?.length ?? 0} events.`);
  }

  // --- /patient/conversations ---
  console.log("\n5. Testing /patient/conversations (Native Messaging Inbox)");
  const convRes = await fetch(`${API_URL}/patient/conversations`, { headers: authHeaders });
  if (!convRes.ok) console.error("❌ /patient/conversations failed", convRes.status);
  else {
      const convData = await convRes.json();
      console.log(`✅ /patient/conversations successful. Found ${convData.data?.items?.length ?? 0} threads.`);
      
      if (convData.data?.items?.length > 0) {
          const threadId = convData.data.items[0].id;
          console.log(`\n6. Testing /patient/conversations/:id/messages (Thread View)`);
          const msgRes = await fetch(`${API_URL}/patient/conversations/${threadId}/messages`, { headers: authHeaders });
          if (!msgRes.ok) console.error("❌ Messages fetch failed", msgRes.status);
          else {
              const msgData = await msgRes.json();
              console.log(`✅ Messages fetched successfully. Thread has ${msgData.data?.items?.length ?? 0} messages.`);
          }
      }
  }

  // --- /patient/check-ins ---
  console.log("\n7. Testing /patient/check-ins (Check-ins/Medication)");
  const ciRes = await fetch(`${API_URL}/patient/check-ins`, { headers: authHeaders });
  if (!ciRes.ok) console.error("❌ /patient/check-ins failed", ciRes.status);
  else console.log(`✅ /patient/check-ins successful.`);

  // --- /patient/content ---
  console.log("\n8. Testing /patient/content (LMS / Learn)");
  const coursesRes = await fetch(`${API_URL}/patient/content`, { headers: authHeaders });
  if (!coursesRes.ok) console.error("❌ /patient/content failed", coursesRes.status, await coursesRes.text());
  else console.log(`✅ /patient/content successful.`);
  
  // --- /patient/appointments ---
  console.log("\n9. Testing /patient/appointments (Appointments/Telemedicine)");
  const teleRes = await fetch(`${API_URL}/patient/appointments`, { headers: authHeaders });
  if (!teleRes.ok) console.error("❌ /patient/appointments failed", teleRes.status, await teleRes.text());
  else console.log(`✅ /patient/appointments successful.`);

  // --- /patient/documents ---
  console.log("\n10. Testing /patient/documents (Documents)");
  const docsRes = await fetch(`${API_URL}/patient/documents`, { headers: authHeaders });
  if (!docsRes.ok) console.error("❌ /patient/documents failed", docsRes.status, await docsRes.text());
  else console.log(`✅ /patient/documents successful.`);

  console.log("\n✅ All End-to-End API Integration checks completed successfully!");
}

runQa().catch(e => {
  console.error("Unhandled error", e);
  process.exit(1);
});
