import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingRpc(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message ?? "";
  return err.code === "42883" || msg.includes("allocate_patient_code") || msg.includes("does not exist");
}

/** Allocate GH-{CLINIC}-{#####} via DB function; fallback for dev without migration. */
export async function allocatePatientCode(
  client: SupabaseClient,
  clinicId: string,
  fallbackSeq?: number
): Promise<string | null> {
  const { data, error } = await client.rpc("allocate_patient_code", { p_clinic_id: clinicId });
  if (!error && typeof data === "string" && data.trim()) return data.trim();
  if (isMissingRpc(error) && fallbackSeq != null) {
    return `GH-CLN-${String(fallbackSeq).padStart(5, "0")}`;
  }
  return null;
}

export async function allocateVisitCode(client: SupabaseClient, clinicId: string): Promise<string | null> {
  const { data, error } = await client.rpc("allocate_visit_code", { p_clinic_id: clinicId });
  if (!error && typeof data === "string" && data.trim()) return data.trim();
  if (isMissingRpc(error)) {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    return `GH-CLN-V${ym}-0001`;
  }
  return null;
}

export function parseSymptomsToMonitor(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

export function noteDraftBlock(raw: unknown): {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
} {
  if (!raw || typeof raw !== "object") {
    return { chiefComplaints: "", emotionalState: "", physicalSymptoms: "", modalities: "", timeline: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    chiefComplaints: typeof o.chiefComplaints === "string" ? o.chiefComplaints : "",
    emotionalState: typeof o.emotionalState === "string" ? o.emotionalState : "",
    physicalSymptoms: typeof o.physicalSymptoms === "string" ? o.physicalSymptoms : "",
    modalities: typeof o.modalities === "string" ? o.modalities : "",
    timeline: typeof o.timeline === "string" ? o.timeline : ""
  };
}
