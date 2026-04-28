import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const REQUIRED_TABLES = ["clinics", "profiles", "consultations", "patients"] as const;

/**
 * Service-role head query per table. Missing RLS/permission on service role is acceptable;
 * a missing *relation* fails startup in production.
 */
export async function assertRequiredTablesExist(admin: SupabaseClient): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  for (const table of REQUIRED_TABLES) {
    const { error } = await admin.from(table).select("id", { count: "exact", head: true }).limit(0);
    if (error) {
      const code = (error as { code?: string }).code;
      const msg = error.message ?? String(error);
      logger.error("db_schema_check_failed", { table, code, message: msg });
      if (isProd) {
        throw new Error(
          `Database schema not ready: table "${table}" is missing or not accessible. Apply migrations and restart.`
        );
      }
      logger.warn("db_schema_check_nonfatal", { table, hint: "dev mode continues" });
    }
  }
  const { error: mErr } = await admin
    .from("patient_inbox_messages")
    .select("id", { count: "exact", head: true })
    .limit(0);
  if (mErr) {
    logger.warn("optional_table_missing", { table: "patient_inbox_messages", message: mErr.message });
  }
}
