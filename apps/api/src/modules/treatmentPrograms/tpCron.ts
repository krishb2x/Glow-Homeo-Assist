import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

/**
 * Runs daily (or on a configured interval) to increment the current_day_offset 
 * for all active treatment program assignments.
 */
export async function processDailyProgramUpdates(admin: SupabaseClient) {
  try {
    // In a production environment, this would be an RPC call or executed 
    // carefully to only update rows that haven't been updated in the last 24h.
    // For V1, we will do a simple bulk increment of active assignments.

    // Using Supabase RPC is the safest way to do a bulk atomic increment:
    // await admin.rpc('increment_tp_assignments');
    
    // For safety in Node context without a custom RPC deployed yet:
    const { data: assignments, error: fetchErr } = await admin
      .from("tp_assignments")
      .select("id, current_day_offset")
      .eq("status", "active");

    if (fetchErr || !assignments) {
      throw fetchErr || new Error("No active assignments found");
    }

    let updatedCount = 0;
    
    // Batch updates
    for (const assignment of assignments) {
      const { error: updateErr } = await admin
        .from("tp_assignments")
        .update({ current_day_offset: (assignment.current_day_offset || 0) + 1 })
        .eq("id", assignment.id);
        
      if (!updateErr) updatedCount++;
    }

    if (updatedCount > 0) {
      logger.info("tp_daily_cron_success", { incremented: updatedCount });
    }

    return updatedCount;
  } catch (error) {
    logger.error("tp_daily_cron_failed", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
