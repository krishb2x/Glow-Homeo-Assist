/**
 * One-time (or idempotent) bootstrap: Supabase Auth user + `profiles` row (`super_admin`, `clinic_id` null).
 *
 * Env (never commit): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
 * Optional: SUPER_ADMIN_FULL_NAME
 *
 * Run: npm run bootstrap:super-admin -w @homeoassist/api
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

{
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", "..", ".env"),
    path.join(process.cwd(), "apps", "api", ".env")
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) {
    config({ path: found });
  }
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
const fullName = (process.env.SUPER_ADMIN_FULL_NAME ?? "Platform Super Admin").trim();

if (!url || !serviceKey || !email || !password) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function findUserIdByEmail(target: string): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users;
    const hit = users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (hit) return hit.id;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function main(): Promise<void> {
  let userId: string | null = await findUserIdByEmail(email);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error("createUser failed:", error.message);
      process.exit(1);
    }
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    // eslint-disable-next-line no-console
    console.error("Could not determine user id");
    process.exit(1);
  }

  const { error: upErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      role: "super_admin",
      clinic_id: null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (upErr) {
    // eslint-disable-next-line no-console
    console.error("profiles upsert failed:", upErr.message);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, userId, email, role: "super_admin" }, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
