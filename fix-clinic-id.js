const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function fixClinicId() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch the real clinic ID for MediTonic or Dr. Aman
  // Let's just fetch the first clinic, or search for "Aman"
  let { data: clinics, error } = await supabase.from('clinics').select('id, name');
  
  if (error || !clinics || clinics.length === 0) {
    console.error("Could not fetch clinics or no clinics found:", error);
    return;
  }

  // Find Aman's clinic, or just default to the first one
  let realClinicId = clinics[0].id;
  const amanClinic = clinics.find(c => c.name && c.name.toLowerCase().includes('aman'));
  if (amanClinic) {
    realClinicId = amanClinic.id;
  }
  
  console.log("Found Real Clinic ID:", realClinicId, "for clinic:", amanClinic ? amanClinic.name : clinics[0].name);

  // 1. Update the SQL file
  const sqlPath = 'd:/HomeoAssist/supabase/migrations/20260607000001_meditonic_store_v2.sql';
  let sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const dummyId = '00000000-0000-0000-0000-000000000001';
  
  if (sqlContent.includes(dummyId)) {
    sqlContent = sqlContent.replace(new RegExp(dummyId, 'g'), realClinicId);
    fs.writeFileSync(sqlPath, sqlContent);
    console.log("Updated SQL script with real Clinic ID.");
  } else {
    console.log("Dummy ID not found in SQL script (already updated?).");
  }

  // 2. Update .env file
  const envPath = 'd:/HomeoAssist/.env';
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('MEDITONIC_CLINIC_ID=')) {
    envContent = envContent.replace(/MEDITONIC_CLINIC_ID=.*/, `MEDITONIC_CLINIC_ID=${realClinicId}`);
  } else {
    envContent += `\n# Added by AI Assistant\nMEDITONIC_CLINIC_ID=${realClinicId}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env file with MEDITONIC_CLINIC_ID.");
  
  // 3. Just to be completely safe, let's also update constants.ts if it has hardcoded dummy id
  const constPath = 'd:/HomeoAssist/apps/meditonic/lib/constants.ts';
  let constContent = fs.readFileSync(constPath, 'utf8');
  if (constContent.includes(dummyId)) {
      constContent = constContent.replace(new RegExp(dummyId, 'g'), realClinicId);
      fs.writeFileSync(constPath, constContent);
      console.log("Updated constants.ts with real Clinic ID.");
  }

  console.log("SUCCESS. Now please run the SQL script in Supabase.");
}

fixClinicId();
