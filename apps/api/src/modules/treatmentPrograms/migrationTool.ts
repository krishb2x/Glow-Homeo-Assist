import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

/**
 * Migration Utility (Phase 5)
 * Port legacy `care_plan_templates` to the new `tp_programs` engine.
 */
export async function migrateLegacyCarePlans(admin: SupabaseClient, clinicId: string) {
  logger.info("tp_migration_started", { clinicId });

  try {
    // 1. Fetch old templates
    const { data: legacyTemplates, error: fetchErr } = await admin
      .from("care_plan_templates")
      .select("*")
      .eq("clinic_id", clinicId)
      .neq("status", "archived");

    if (fetchErr) throw fetchErr;
    if (!legacyTemplates || legacyTemplates.length === 0) {
      return { migrated: 0, message: "No legacy care plans found for clinic" };
    }

    let migratedCount = 0;

    for (const legacy of legacyTemplates) {
      // 2. Fetch blocks for this template
      const { data: blocks } = await admin
        .from("care_plan_blocks")
        .select("*")
        .eq("template_id", legacy.id)
        .order("sort_order", { ascending: true });

      // 3. Create the new V1 Program
      const { data: newProgram, error: progErr } = await admin
        .from("tp_programs")
        .insert({
          clinic_id: legacy.clinic_id,
          doctor_id: legacy.doctor_id,
          title: legacy.title,
          description: legacy.summary || `Migrated from Care Plan (ID: ${legacy.id})`,
          status: legacy.status === "published" ? "published" : "draft",
        })
        .select()
        .single();

      if (progErr || !newProgram) {
        logger.error("tp_migration_program_failed", { legacyId: legacy.id, error: progErr?.message });
        continue;
      }

      // 4. Old care plans have no timeline. Map everything to "Day 0"
      const { data: step, error: stepErr } = await admin
        .from("tp_steps")
        .insert({
          program_id: newProgram.id,
          day_offset: 0,
          title: "Initial Protocol",
          sort_order: 0
        })
        .select()
        .single();

      if (stepErr || !step) continue;

      // 5. Port the blocks
      if (blocks && blocks.length > 0) {
        const tpBlocksToInsert = blocks.map((b: any, index: number) => {
          let category = "content";
          if (b.block_type.includes("tracker") || b.block_type.includes("form")) category = "form";

          return {
            step_id: step.id,
            category,
            block_type: b.block_type,
            config: b.payload || {},
            sort_order: index,
            is_required: false
          };
        });

        await admin.from("tp_blocks").insert(tpBlocksToInsert);
      }

      migratedCount++;
    }

    logger.info("tp_migration_complete", { migratedCount });
    return { migrated: migratedCount, message: "Migration successful" };

  } catch (error) {
    logger.error("tp_migration_failed", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
