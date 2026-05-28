import type { SupabaseClient } from "@supabase/supabase-js";
import { createPatientAccessToken } from "../telemedicine/patientAccess";
import type { PatientContext } from "./types";

const DEFAULT_SETTINGS = {
  locale: "en-IN",
  channels: { push: true, whatsapp: true, sms: false, email: false },
  reminderTimes: { morning: "07:30", afternoon: "13:30", evening: "19:30", night: "22:00" },
  quietHours: { start: "22:30", end: "06:30" }
};

export async function getPatientSettings(
  admin: SupabaseClient,
  ctx: PatientContext
): Promise<Record<string, unknown>> {
  const { data, error } = await admin
    .from("patient_app_settings")
    .select("locale,channels,reminder_times,quiet_hours")
    .eq("patient_id", ctx.patientId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ...DEFAULT_SETTINGS };

  const row = data as {
    locale: string;
    channels: Record<string, boolean>;
    reminder_times: Record<string, string>;
    quiet_hours: Record<string, string>;
  };

  return {
    locale: row.locale,
    channels: row.channels,
    reminderTimes: row.reminder_times,
    quietHours: row.quiet_hours
  };
}

export async function patchPatientSettings(
  admin: SupabaseClient,
  ctx: PatientContext,
  patch: {
    locale?: string;
    channels?: Record<string, boolean>;
    reminderTimes?: Record<string, string>;
    quietHours?: Record<string, string>;
  }
): Promise<Record<string, unknown>> {
  const current = await getPatientSettings(admin, ctx);
  const merged = {
    locale: patch.locale ?? (current.locale as string),
    channels: { ...(current.channels as object), ...patch.channels },
    reminderTimes: { ...(current.reminderTimes as object), ...patch.reminderTimes },
    quietHours: { ...(current.quietHours as object), ...patch.quietHours }
  };

  const { error } = await admin.from("patient_app_settings").upsert(
    {
      patient_id: ctx.patientId,
      locale: merged.locale,
      channels: merged.channels,
      reminder_times: merged.reminderTimes,
      quiet_hours: merged.quietHours,
      updated_at: new Date().toISOString()
    },
    { onConflict: "patient_id" }
  );

  if (error) throw error;
  return merged;
}

export async function createFamilyShareToken(
  admin: SupabaseClient,
  ctx: PatientContext
): Promise<{ token: string; url: string; expiresAt: string }> {
  return createPatientAccessToken({
    admin,
    clinicId: ctx.clinicId,
    patientId: ctx.patientId,
    purpose: "family_view",
    expiresInHours: 168
  });
}
