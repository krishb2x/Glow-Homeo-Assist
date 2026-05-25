/** True when PostgREST reports a missing table, column, or relation. */
export function isMissingDbObjectError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  const code = err.code ?? "";
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

export const SCHEMA_MIGRATION_HINT =
  "Apply pending Supabase migrations (see docs/SUPABASE_MIGRATIONS.md), starting with supabase/migrations/20260524000000_online_consultation.sql.";
