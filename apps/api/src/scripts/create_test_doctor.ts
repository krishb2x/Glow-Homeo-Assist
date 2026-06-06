import { supabaseAdmin } from "../supabase";

async function run() {
  const email = "nagendrapandey1416@gmail.com";
  const password = "nagendrapandey1416";

  console.log(`Checking if user ${email} exists...`);
  
  let userId: string | undefined;

  const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.code === 'email_exists') {
      console.log("User already exists in Auth. Updating password to ensure it matches...");
      // Handle pagination
      let existingUser;
      for (let page = 1; page <= 10; page++) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
        existingUser = listData.users.find(u => u.email === email);
        if (existingUser || listData.users.length < 100) break;
      }

      if (existingUser) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
        console.log("Password updated.");
        userId = existingUser.id;
      }
    } else {
      throw error;
    }
  } else {
    console.log("User created in Auth:", user.user.id);
    userId = user.user.id;
  }
  
  if (!userId) throw new Error("Could not find user ID after creation.");

  // Check if clinic exists
  const { data: clinics } = await supabaseAdmin.from("clinics").select("id").limit(1);
  const clinicId = clinics?.[0]?.id || "00000000-0000-0000-0000-000000000000";

  // Check if staff record exists
  const { data: staff } = await supabaseAdmin.from("clinic_staff").select("id").eq("user_id", userId).single();
  if (!staff) {
    console.log("Creating staff record...");
    await supabaseAdmin.from("clinic_staff").insert({
      id: userId,
      user_id: userId,
      clinic_id: clinicId,
      role: "doctor",
      first_name: "Test",
      last_name: "Doctor"
    });
    console.log("Staff record created.");
  } else {
    console.log("Staff record already exists.");
  }

  console.log("Doctor account fully bootstrapped.");
  process.exit(0);
}

run().catch(console.error);
