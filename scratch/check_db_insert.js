const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function check() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const testCode = `TEST_${Date.now()}`.substring(0, 15);
  const { data, error } = await supabase
    .from("mt_referral_codes")
    .insert({
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
      partner_id: "0c1988de-b11e-431e-950b-a0e56868cbeb", // some partner ID
      code: testCode,
      discount_type: "percentage",
      discount_value: 10,
      is_active: true,
      max_uses: 5,
      current_uses: 0,
      valid_from: new Date().toISOString(),
      valid_until: new Date().toISOString()
    })
    .select();

  console.log("Insert data:", data);
  console.log("Insert error:", error);
}

check();
