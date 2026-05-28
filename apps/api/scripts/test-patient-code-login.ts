/**
 * Quick E2E check: patient_code login against your .env Supabase.
 * Run from repo: npx tsx apps/api/scripts/test-patient-code-login.ts [PATIENT_CODE]
 */
import "../src/lib/loadMonorepoEnv";
import { supabaseAdmin } from "../src/supabase";
import { findPatientByCode, loginPatientWithCode, normalizePatientCode } from "../src/modules/patient/patientCodeAuth";

async function main(): Promise<void> {
  const argCode = process.argv[2]?.trim();

  if (argCode) {
    const normalized = normalizePatientCode(argCode);
    console.log("Lookup code:", argCode, "→", normalized);
    const row = await findPatientByCode(supabaseAdmin, argCode);
    console.log("findPatientByCode:", row ? { id: row.id, name: row.name, code: row.patient_code } : "NOT FOUND");
    if (!row) process.exit(2);
  }

  const { data: sample, error: sampleErr } = await supabaseAdmin
    .from("patients")
    .select("patient_code,name")
    .not("patient_code", "is", null)
    .limit(3);

  if (sampleErr) {
    console.error("DB error (is patient_code migration applied?):", sampleErr.message, sampleErr.code);
    process.exit(1);
  }
  console.log("Sample codes in DB:", sample);

  const code = argCode ?? (sample?.[0] as { patient_code: string } | undefined)?.patient_code;
  if (!code) {
    console.error("No patient with patient_code in database. Create a patient in the web app first.");
    process.exit(2);
  }

  console.log("\nLogin test with:", code);
  const result = await loginPatientWithCode(code);
  console.log("OK — patient:", result.patient.name, "clinic:", result.clinic.name);
  console.log("Token length:", result.session.access_token.length);
}

main().catch((e: unknown) => {
  const err = e as { message?: string; code?: string };
  console.error("FAILED:", err.code ?? "", err.message ?? e);
  process.exit(1);
});
