import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatientContext, PatientPushPlatform } from "./types";

export async function upsertPatientPushToken(
  admin: SupabaseClient,
  ctx: PatientContext,
  body: { platform: PatientPushPlatform; token: string; appVersion?: string; locale?: string }
): Promise<void> {
  const { error } = await admin.from("patient_push_tokens").upsert(
    {
      patient_id: ctx.patientId,
      platform: body.platform,
      token: body.token,
      app_version: body.appVersion ?? null,
      locale: body.locale ?? null,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: "token" }
  );

  if (error) throw error;
}

export async function deletePatientPushTokensForUser(
  admin: SupabaseClient,
  patientId: string,
  token?: string
): Promise<void> {
  let q = admin.from("patient_push_tokens").delete().eq("patient_id", patientId);
  if (token) q = q.eq("token", token);
  await q;
}
