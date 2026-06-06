import { apiFetchJson, haProxyPath } from "./doctor-api";

export type TpBlock = {
  id?: string;
  step_id?: string;
  category: string;
  block_type: string;
  config: Record<string, unknown>;
  sort_order: number;
  is_required: boolean;
};

export type TpStep = {
  id?: string;
  program_id?: string;
  day_offset: number;
  title: string;
  sort_order: number;
  blocks: TpBlock[];
};

export type TpProgram = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  title: string;
  description: string | null;
  duration_days: number | null;
  status: "draft" | "published" | "archived";
  steps?: TpStep[];
  created_at?: string;
  updated_at?: string;
};

export type TpAssignment = {
  id: string;
  patient_id: string;
  program_id: string;
  started_at: string;
  current_day_offset: number;
  status: "active" | "paused" | "completed" | "cancelled";
  completed_at?: string | null;
};

export type TpResponseData = {
  id: string;
  assignment_id: string;
  block_id: string;
  response_data: Record<string, unknown>;
  score?: number | null;
  submitted_at: string;
};

export type PatientJourney = {
  assignment: TpAssignment;
  blueprint: TpProgram;
  responses: TpResponseData[];
};

export async function createProgram(body: {
  title: string;
  description?: string;
  duration_days?: number;
  status?: "draft" | "published" | "archived";
  steps?: TpStep[];
}): Promise<{ program: TpProgram }> {
  return apiFetchJson<{ program: TpProgram }>(haProxyPath("tp/programs"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function getProgramBlueprint(programId: string): Promise<{ program: TpProgram }> {
  return apiFetchJson<{ program: TpProgram }>(haProxyPath(`tp/programs/${programId}/blueprint`));
}

export async function assignPatientToProgram(patientId: string, programId: string): Promise<{ assignment: TpAssignment }> {
  return apiFetchJson<{ assignment: TpAssignment }>(haProxyPath("tp/assignments"), {
    method: "POST",
    body: JSON.stringify({ patientId, programId })
  });
}

export async function getPatientJourney(assignmentId: string): Promise<{ journey: PatientJourney }> {
  return apiFetchJson<{ journey: PatientJourney }>(haProxyPath(`tp/assignments/${assignmentId}/journey`));
}
