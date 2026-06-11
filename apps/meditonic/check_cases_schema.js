const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCasesSchema() {
  console.log("Querying mt_cases...");
  const { data, error } = await supabase
    .from('mt_cases')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching mt_cases:", error);
  } else {
    console.log("Success!");
    console.log("Columns of mt_cases:", data.length > 0 ? Object.keys(data[0]) : "No records found");
    if (data.length > 0) {
      console.log("First case data:", JSON.stringify(data[0], null, 2));
    }
  }
}

checkCasesSchema();
