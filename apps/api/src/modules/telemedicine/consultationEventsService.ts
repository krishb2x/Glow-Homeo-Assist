import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

export type ConsultationEventType =
  | "doctor_joined"
  | "patient_joined"
  | "patient_left"
  | "patient_waiting"
  | "patient_admitted"
  | "call_ended"
  | "recording_ready"
  | "missed"
  | "room_provisioned";

export async function writeConsultationEvent(
  admin: SupabaseClient,
  args: {
    clinicId: string;
    consultationId: string;
    videoSessionId?: string | null;
    eventType: ConsultationEventType;
    actorRole?: "doctor" | "patient" | "system";
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await admin.from("consultation_events").insert({
    clinic_id: args.clinicId,
    consultation_id: args.consultationId,
    video_session_id: args.videoSessionId ?? null,
    event_type: args.eventType,
    actor_role: args.actorRole ?? "system",
    payload: args.payload ?? {}
  });
  if (error) {
    logger.warn("consultation_event_write_failed", {
      eventType: args.eventType,
      message: error.message
    });
  }
}

export async function loadVideoSessionByRoom(
  admin: SupabaseClient,
  roomName: string
): Promise<{
  id: string;
  clinic_id: string;
  consultation_id: string;
  status: string;
  room_id: string;
} | null> {
  const { data } = await admin
    .from("video_sessions")
    .select("id,clinic_id,consultation_id,status,room_id")
    .eq("room_id", roomName)
    .not("status", "eq", "ENDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as {
    id: string;
    clinic_id: string;
    consultation_id: string;
    status: string;
    room_id: string;
  } | null;
}

export async function loadVideoSessionForConsultation(
  client: SupabaseClient,
  consultationId: string,
  clinicId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await client
    .from("video_sessions")
    .select(
      "id,room_id,room_url,status,provider,started_at,ended_at,doctor_joined_at,patient_joined_at,patient_waiting_since,recording_object_key,room_expires_at"
    )
    .eq("consultation_id", consultationId)
    .eq("clinic_id", clinicId)
    .not("status", "eq", "ENDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}
