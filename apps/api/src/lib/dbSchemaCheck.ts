import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const REQUIRED_TABLES = ["clinics", "profiles", "consultations", "patients"] as const;

const V2_OPTIONAL_TABLES = [
  "audio_sessions",
  "scribe_jobs",
  "media_objects",
  "notification_jobs",
  "encounter_observations"
] as const;

/** Telemedicine / online appointments — required for production if ONLINE visits are used. */
const TELEMEDICINE_TABLES = ["patient_access_tokens", "appointments"] as const;

const DAILY_VIDEO_TABLES = ["video_sessions", "consultation_events"] as const;

/** Consult workflow columns from 20260528000000_healthcare_references.sql */
const CONSULTATION_REFERENCE_COLUMNS = [
  "symptoms_to_monitor",
  "visit_code"
] as const;

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

  for (const table of V2_OPTIONAL_TABLES) {
    const { error: v2Err } = await admin.from(table).select("id", { count: "exact", head: true }).limit(0);
    if (v2Err) {
      logger.warn("v2_table_missing", {
        table,
        message: v2Err.message,
        hint: "Apply supabase/migrations/20260520000000_v2_consult_workspace.sql via supabase db push"
      });
    }
  }

  for (const table of TELEMEDICINE_TABLES) {
    const probe =
      table === "appointments"
        ? admin.from(table).select("consultation_mode").limit(0)
        : admin.from(table).select("id", { count: "exact", head: true }).limit(0);
    const { error: telErr } = await probe;
    if (telErr) {
      const payload = {
        table,
        message: telErr.message,
        hint: "Apply supabase/migrations/20260524000000_online_consultation.sql — see docs/SUPABASE_MIGRATIONS.md"
      };
      if (isProd) {
        logger.error("telemedicine_schema_check_failed", payload);
        throw new Error(
          `Database schema not ready for telemedicine: "${table}" is missing required objects. ${telErr.message}`
        );
      }
      // Dev: warn only — in-clinic visits work; online appointments need the migration.
      logger.warn("telemedicine_schema_check_failed", payload);
    }
  }

  for (const table of DAILY_VIDEO_TABLES) {
    const { error: dailyErr } = await admin.from(table).select("id", { count: "exact", head: true }).limit(0);
    if (dailyErr) {
      const payload = {
        table,
        message: dailyErr.message,
        hint: "Apply supabase/migrations/20260529000000_daily_video_sessions.sql"
      };
      if (isProd) {
        logger.error("daily_video_schema_check_failed", payload);
        throw new Error(
          `Database schema not ready for Daily video: "${table}" is missing. ${dailyErr.message}`
        );
      }
      logger.warn("daily_video_schema_check_failed", payload);
    }
  }

  const { error: consultColErr } = await admin
    .from("consultations")
    .select(CONSULTATION_REFERENCE_COLUMNS.join(","))
    .limit(0);
  if (consultColErr) {
    const payload = {
      columns: CONSULTATION_REFERENCE_COLUMNS,
      message: consultColErr.message,
      hint: "Apply supabase/migrations/20260528000000_healthcare_references.sql — see docs/SUPABASE_MIGRATIONS.md"
    };
    if (isProd) {
      logger.error("consultation_reference_schema_check_failed", payload);
      throw new Error(
        `Database schema not ready: consultations is missing reference/follow-up columns. ${consultColErr.message}`
      );
    }
    logger.warn("consultation_reference_schema_check_failed", payload);
  }
}
