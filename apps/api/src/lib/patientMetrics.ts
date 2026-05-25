import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

/**
 * Recompute denormalized patient metrics via DB function (trigger also runs on consult/rx changes).
 * Call after consultation end/finalize when triggers may not fire from service-role paths.
 */
export async function refreshPatientMetrics(
  client: SupabaseClient,
  patientId: string
): Promise<void> {
  const { error } = await client.rpc("refresh_patient_metrics", { p_patient_id: patientId });
  if (error) {
    logger.warn("refresh_patient_metrics_failed", {
      patientId,
      message: error.message
    });
  }
}
