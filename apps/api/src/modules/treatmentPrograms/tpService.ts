import type { SupabaseClient } from "@supabase/supabase-js";
import { TpProgramSchema, type TpProgram, type TpStep, type TpBlock } from "./tpTypes";
import { logger } from "../../lib/logger";

export async function createProgram(
  client: SupabaseClient,
  clinicId: string,
  doctorId: string,
  payload: unknown
): Promise<TpProgram> {
  const data = TpProgramSchema.parse(payload);
  
  // Create program
  const { data: programRow, error: progErr } = await client
    .from("tp_programs")
    .insert({
      clinic_id: clinicId,
      doctor_id: doctorId,
      title: data.title,
      description: data.description,
      duration_days: data.duration_days,
      status: data.status
    })
    .select()
    .single();

  if (progErr || !programRow) {
    logger.error("tp_create_program_failed", { error: progErr?.message });
    throw new Error("Failed to create treatment program.");
  }

  // Insert steps and blocks if provided (bulk insert)
  // Real implementation will do an upsert or transaction. For V1 MVP, insert iteratively.
  const programId = programRow.id;
  const createdSteps: TpStep[] = [];

  if (data.steps && data.steps.length > 0) {
    for (const step of data.steps) {
      const { data: stepRow, error: stepErr } = await client
        .from("tp_steps")
        .insert({
          program_id: programId,
          day_offset: step.day_offset,
          title: step.title,
          sort_order: step.sort_order
        })
        .select()
        .single();
      
      if (stepErr || !stepRow) continue;

      const createdBlocks: TpBlock[] = [];
      if (step.blocks && step.blocks.length > 0) {
        const blocksToInsert = step.blocks.map(b => ({
          step_id: stepRow.id,
          category: b.category,
          block_type: b.block_type,
          config: b.config,
          sort_order: b.sort_order,
          is_required: b.is_required
        }));

        const { data: blockRows, error: blockErr } = await client
          .from("tp_blocks")
          .insert(blocksToInsert)
          .select();

        if (!blockErr && blockRows) {
          createdBlocks.push(...(blockRows as TpBlock[]));
        }
      }
      
      createdSteps.push({ ...stepRow, blocks: createdBlocks } as unknown as TpStep);
    }
  }

  return { ...programRow, steps: createdSteps } as unknown as TpProgram;
}

export async function getProgramBlueprint(
  client: SupabaseClient,
  programId: string
): Promise<TpProgram | null> {
  const { data: program, error: progErr } = await client
    .from("tp_programs")
    .select("*")
    .eq("id", programId)
    .single();

  if (progErr || !program) return null;

  const { data: steps, error: stepsErr } = await client
    .from("tp_steps")
    .select("*, tp_blocks(*)")
    .eq("program_id", programId)
    .order("day_offset", { ascending: true });

  if (stepsErr) {
    logger.error("tp_fetch_blueprint_failed", { error: stepsErr.message });
  }

  const formattedSteps = (steps || []).map(s => ({
    ...s,
    blocks: s.tp_blocks || []
  }));

  return { ...program, steps: formattedSteps } as unknown as TpProgram;
}

export async function assignPatientToProgram(
  client: SupabaseClient,
  patientId: string,
  programId: string
) {
  const { data, error } = await client
    .from("tp_assignments")
    .insert({
      patient_id: patientId,
      program_id: programId,
      status: "active",
      current_day_offset: 0
    })
    .select()
    .single();

  if (error || !data) {
    logger.error("tp_assign_failed", { error: error?.message });
    throw new Error("Failed to assign patient to program");
  }
  return data;
}

export async function getPatientJourney(
  client: SupabaseClient,
  assignmentId: string
) {
  // 1. Get Assignment
  const { data: assignment, error: assignErr } = await client
    .from("tp_assignments")
    .select("*, tp_programs(*)")
    .eq("id", assignmentId)
    .single();

  if (assignErr || !assignment) return null;

  // 2. Get Program Blueprint
  const blueprint = await getProgramBlueprint(client, assignment.program_id);

  // 3. Get Responses
  const { data: responses } = await client
    .from("tp_responses")
    .select("*")
    .eq("assignment_id", assignmentId);

  return {
    assignment,
    blueprint,
    responses: responses || []
  };
}
