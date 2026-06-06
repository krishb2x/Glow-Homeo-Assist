const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from("mt_consultation_fees")
    .select("*")
    .eq("clinic_id", "595cd444-e89c-4d1f-b31f-27f76f59e0d7");
    
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
