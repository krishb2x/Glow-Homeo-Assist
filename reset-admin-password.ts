import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = "system-admin@meditonic.com";
  const password = "MeditonicAdmin123!";

  console.log(`Creating fresh admin user ${email}...`);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });
  
  if (error) {
    console.error("Error creating user:", error);
  } else {
    console.log("Success! User created with ID:", data.user.id);
    // Insert into profiles with MEDITONIC_CLINIC_ID
    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      full_name: "MediTonic Admin",
      role: "admin",
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7"
    });
    console.log("Profile updated. You can now login!");
  }
}

main();
