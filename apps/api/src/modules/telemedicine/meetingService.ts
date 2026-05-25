import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { logger } from "../../lib/logger";
import { createPatientAccessToken, joinUrl } from "./patientAccess";
import { isJitsiJwtEnabled, signJitsiRoomToken } from "./jitsiAuth";

function jitsiBase(): string {
  return (process.env.JITSI_BASE_URL?.trim() || "https://meet.jit.si").replace(/\/$/, "");
}

export type JitsiJoinConfig = {
  roomId: string;
  roomUrl: string;
  jwt: string | null;
};

/** Industry-standard embed: Jitsi Meet (JWT when self-hosted token auth is enabled). */
export function buildJitsiJoinConfig(
  roomId: string,
  displayName?: string,
  opts?: { moderator?: boolean }
): JitsiJoinConfig {
  const room = encodeURIComponent(roomId);
  const base = `${jitsiBase()}/${room}`;
  const name = displayName?.trim() || "Guest";
  const token = signJitsiRoomToken({
    roomId,
    displayName: name,
    moderator: opts?.moderator,
    expiresInSec: 7200
  });

  if (token) {
    return { roomId, jwt: token, roomUrl: `${base}?jwt=${encodeURIComponent(token)}` };
  }

  const hash = `#userInfo.displayName=${encodeURIComponent(name)}`;
  return { roomId, jwt: null, roomUrl: `${base}${hash}` };
}

/** @deprecated Prefer buildJitsiJoinConfig — kept for callers expecting a plain URL string. */
export function buildJitsiRoomUrl(roomId: string, displayName?: string, opts?: { moderator?: boolean }): string {
  return buildJitsiJoinConfig(roomId, displayName, opts).roomUrl;
}

export function roomIdForConsultation(consultationId: string): string {
  const prefix = process.env.JITSI_ROOM_PREFIX?.trim() || "GlowHomeo";
  return `${prefix}-${consultationId.replace(/-/g, "").slice(0, 20)}`;
}

export async function provisionVideoSession(args: {
  client: SupabaseClient;
  admin: SupabaseClient;
  clinicId: string;
  consultationId: string;
  patientId: string;
  doctorDisplayName?: string;
  recordingEnabled?: boolean;
}): Promise<{
  roomId: string;
  doctorJoinUrl: string;
  doctorJwt: string | null;
  patientJoinUrl: string;
  videoSessionId: string;
}> {
  const roomId = roomIdForConsultation(args.consultationId);
  const doctorJoin = buildJitsiJoinConfig(roomId, args.doctorDisplayName ?? "Doctor", { moderator: true });
  const doctorJoinUrl = doctorJoin.roomUrl;

  const patientToken = await createPatientAccessToken({
    admin: args.admin,
    clinicId: args.clinicId,
    patientId: args.patientId,
    consultationId: args.consultationId,
    purpose: "join_consultation",
    expiresInHours: 48
  });

  const videoSessionId = uuid();
  const { error } = await args.client.from("video_sessions").insert({
    id: videoSessionId,
    clinic_id: args.clinicId,
    consultation_id: args.consultationId,
    provider: "jitsi",
    room_id: roomId,
    status: "PROVISIONED",
    recording_object_key: args.recordingEnabled ? null : null
  });

  if (error) {
    logger.warn("video_session_insert_failed", { message: error.message });
  }

  await args.client
    .from("consultations")
    .update({ recording_enabled: args.recordingEnabled ?? false })
    .eq("id", args.consultationId);

  return {
    roomId,
    doctorJoinUrl,
    doctorJwt: doctorJoin.jwt,
    patientJoinUrl: patientToken.url,
    videoSessionId
  };
}

export async function getConsultationMeeting(
  client: SupabaseClient,
  consultationId: string,
  clinicId: string,
  doctorName?: string
): Promise<{ doctorJoinUrl: string | null; roomId: string | null; doctorJwt: string | null }> {
  const { data } = await client
    .from("video_sessions")
    .select("room_id,status")
    .eq("consultation_id", consultationId)
    .eq("clinic_id", clinicId)
    .not("status", "eq", "ENDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { doctorJoinUrl: null, roomId: null, doctorJwt: null };
  const roomId = (data as { room_id: string }).room_id;
  const join = buildJitsiJoinConfig(roomId, doctorName ?? "Doctor", { moderator: true });
  return {
    roomId,
    doctorJoinUrl: join.roomUrl,
    doctorJwt: join.jwt
  };
}

export function meetingUrlFromAppointment(meetingUrl: string | null, joinToken: string | null): string | null {
  if (joinToken) return joinUrl(joinToken);
  return meetingUrl;
}
