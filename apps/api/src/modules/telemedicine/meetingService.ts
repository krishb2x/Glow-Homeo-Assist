import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { logger } from "../../lib/logger";
import { AppError } from "../../lib/errors";
import { createPatientAccessToken, joinUrl } from "./patientAccess";
import {
  admitKnockingParticipants,
  createDailyMeetingToken,
  createDailyRoom,
  deleteDailyRoom,
  extendDailyRoomExpiry,
  roomUrlFromName,
  startCloudRecording
} from "./daily/dailyClient";
import { isDailyConfigured, meetingTokenTtlSec, roomWindowUnix } from "./daily/dailyRoomConfig";
import { writeConsultationEvent } from "./consultationEventsService";

export function roomIdForConsultation(consultationId: string): string {
  const prefix = process.env.DAILY_ROOM_PREFIX?.trim() || "GlowHomeo";
  return `${prefix}-${consultationId.replace(/-/g, "").slice(0, 20)}`;
}

export type DailyJoinConfig = {
  roomName: string;
  roomUrl: string;
  meetingToken: string;
};

export async function buildDailyDoctorJoin(args: {
  roomName: string;
  displayName?: string;
}): Promise<DailyJoinConfig> {
  const roomUrl = roomUrlFromName(args.roomName);
  const exp = Math.floor(Date.now() / 1000) + meetingTokenTtlSec();
  const meetingToken = await createDailyMeetingToken({
    roomName: args.roomName,
    userName: args.displayName?.trim() || "Doctor",
    isOwner: true,
    enableKnocking: false,
    exp
  });
  return { roomName: args.roomName, roomUrl, meetingToken };
}

export async function buildDailyPatientJoin(args: {
  roomName: string;
  displayName?: string;
}): Promise<DailyJoinConfig> {
  const roomUrl = roomUrlFromName(args.roomName);
  const exp = Math.floor(Date.now() / 1000) + meetingTokenTtlSec();
  const meetingToken = await createDailyMeetingToken({
    roomName: args.roomName,
    userName: args.displayName?.trim() || "Patient",
    isOwner: false,
    enableKnocking: true,
    exp
  });
  return { roomName: args.roomName, roomUrl, meetingToken };
}

export async function provisionVideoSession(args: {
  client: SupabaseClient;
  admin: SupabaseClient;
  clinicId: string;
  consultationId: string;
  patientId: string;
  doctorDisplayName?: string;
  recordingEnabled?: boolean;
  scheduledFor?: string | null;
}): Promise<{
  roomId: string;
  roomUrl: string;
  doctorJoinUrl: string;
  doctorMeetingToken: string;
  patientJoinUrl: string;
  videoSessionId: string;
  status: string;
}> {
  if (!isDailyConfigured()) {
    throw new Error("Daily.co is not configured. Set DAILY_API_KEY and DAILY_DOMAIN.");
  }

  const { data: existing } = await args.client
    .from("video_sessions")
    .select("id,room_id,room_url,status")
    .eq("consultation_id", args.consultationId)
    .eq("clinic_id", args.clinicId)
    .not("status", "eq", "ENDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; room_id: string; room_url: string | null; status: string };
    const doctorJoin = await buildDailyDoctorJoin({
      roomName: row.room_id,
      displayName: args.doctorDisplayName ?? "Doctor"
    });
    const { data: tok } = await args.admin
      .from("patient_access_tokens")
      .select("token")
      .eq("consultation_id", args.consultationId)
      .eq("purpose", "join_consultation")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const patientJoinUrl = tok ? joinUrl((tok as { token: string }).token) : null;
    if (!patientJoinUrl) {
      const patientToken = await createPatientAccessToken({
        admin: args.admin,
        clinicId: args.clinicId,
        patientId: args.patientId,
        consultationId: args.consultationId,
        purpose: "join_consultation",
        expiresInHours: 48
      });
      return {
        roomId: row.room_id,
        roomUrl: row.room_url ?? doctorJoin.roomUrl,
        doctorJoinUrl: doctorJoin.roomUrl,
        doctorMeetingToken: doctorJoin.meetingToken,
        patientJoinUrl: patientToken.url,
        videoSessionId: row.id,
        status: row.status
      };
    }
    return {
      roomId: row.room_id,
      roomUrl: row.room_url ?? doctorJoin.roomUrl,
      doctorJoinUrl: doctorJoin.roomUrl,
      doctorMeetingToken: doctorJoin.meetingToken,
      patientJoinUrl,
      videoSessionId: row.id,
      status: row.status
    };
  }

  const roomId = roomIdForConsultation(args.consultationId);
  const room = await createDailyRoom({
    roomName: roomId,
    recordingEnabled: args.recordingEnabled,
    scheduledFor: args.scheduledFor
  });
  const roomUrl = room.url || roomUrlFromName(roomId);
  const { exp } = roomWindowUnix({ scheduledFor: args.scheduledFor });
  const roomExpiresAt = new Date(exp * 1000).toISOString();

  const doctorJoin = await buildDailyDoctorJoin({
    roomName: roomId,
    displayName: args.doctorDisplayName ?? "Doctor"
  });

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
    provider: "daily",
    room_id: roomId,
    room_url: roomUrl,
    room_expires_at: roomExpiresAt,
    status: "PROVISIONED",
    recording_object_key: null
  });

  if (error) {
    logger.error("video_session_insert_failed", { message: error.message, consultationId: args.consultationId });
    void deleteDailyRoom(roomId).catch(() => undefined);
    throw new AppError("Could not provision video session. Please try again.", {
      code: "VIDEO_SESSION_CONFLICT",
      statusCode: 409,
      kind: "operational"
    });
  }

  await args.client
    .from("consultations")
    .update({ recording_enabled: args.recordingEnabled ?? false })
    .eq("id", args.consultationId);

  void writeConsultationEvent(args.admin, {
    clinicId: args.clinicId,
    consultationId: args.consultationId,
    videoSessionId,
    eventType: "room_provisioned",
    actorRole: "system",
    payload: { roomId, provider: "daily" }
  });

  if (args.recordingEnabled) {
    void startCloudRecording(roomId);
  }

  return {
    roomId,
    roomUrl,
    doctorJoinUrl: doctorJoin.roomUrl,
    doctorMeetingToken: doctorJoin.meetingToken,
    patientJoinUrl: patientToken.url,
    videoSessionId,
    status: "PROVISIONED"
  };
}

export async function getConsultationMeeting(
  client: SupabaseClient,
  consultationId: string,
  clinicId: string,
  doctorName?: string
): Promise<{
  doctorJoinUrl: string | null;
  roomId: string | null;
  roomUrl: string | null;
  meetingToken: string | null;
  status: string | null;
  videoSessionId: string | null;
  patientWaitingSince: string | null;
}> {
  const { data } = await client
    .from("video_sessions")
    .select(
      "id,room_id,room_url,status,patient_waiting_since,room_expires_at"
    )
    .eq("consultation_id", consultationId)
    .eq("clinic_id", clinicId)
    .not("status", "eq", "ENDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      doctorJoinUrl: null,
      roomId: null,
      roomUrl: null,
      meetingToken: null,
      status: null,
      videoSessionId: null,
      patientWaitingSince: null
    };
  }

  const row = data as {
    id: string;
    room_id: string;
    room_url: string | null;
    status: string;
    patient_waiting_since: string | null;
    room_expires_at: string | null;
  };

  if (!isDailyConfigured()) {
    return {
      doctorJoinUrl: row.room_url,
      roomId: row.room_id,
      roomUrl: row.room_url,
      meetingToken: null,
      status: row.status,
      videoSessionId: row.id,
      patientWaitingSince: row.patient_waiting_since
    };
  }

  if (row.room_expires_at) {
    const expiresMs = new Date(row.room_expires_at).getTime();
    const thirtyMin = 30 * 60 * 1000;
    if (expiresMs - Date.now() < thirtyMin) {
      const { exp } = roomWindowUnix({ scheduledFor: null });
      void extendDailyRoomExpiry(row.room_id, exp);
      await client
        .from("video_sessions")
        .update({ room_expires_at: new Date(exp * 1000).toISOString() })
        .eq("id", row.id);
    }
  }

  const join = await buildDailyDoctorJoin({
    roomName: row.room_id,
    displayName: doctorName ?? "Doctor"
  });

  return {
    doctorJoinUrl: join.roomUrl,
    roomId: row.room_id,
    roomUrl: row.room_url ?? join.roomUrl,
    meetingToken: join.meetingToken,
    status: row.status,
    videoSessionId: row.id,
    patientWaitingSince: row.patient_waiting_since
  };
}

export async function getVideoSessionState(
  client: SupabaseClient,
  admin: SupabaseClient,
  consultationId: string,
  clinicId: string
): Promise<{
  videoSession: Record<string, unknown> | null;
  patientJoinUrl: string | null;
  appointmentId: string | null;
}> {
  const { data: consult } = await client
    .from("consultations")
    .select("patient_id,appointment_id")
    .eq("id", consultationId)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  const { data: vs } = await client
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

  let patientJoinUrl: string | null = null;
  if (consult) {
    const c = consult as { patient_id: string; appointment_id: string | null };
    const { data: tok } = await admin
      .from("patient_access_tokens")
      .select("token")
      .eq("consultation_id", consultationId)
      .eq("purpose", "join_consultation")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tok) {
      patientJoinUrl = joinUrl((tok as { token: string }).token);
    } else if (c.appointment_id) {
      const { data: aptTok } = await admin
        .from("patient_access_tokens")
        .select("token")
        .eq("appointment_id", c.appointment_id)
        .eq("purpose", "join_consultation")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (aptTok) patientJoinUrl = joinUrl((aptTok as { token: string }).token);
    }
  }

  return {
    videoSession: (vs as Record<string, unknown> | null) ?? null,
    patientJoinUrl,
    appointmentId: (consult as { appointment_id?: string | null } | null)?.appointment_id ?? null
  };
}

export async function admitPatientToRoom(args: {
  admin: SupabaseClient;
  consultationId: string;
  clinicId: string;
}): Promise<{ admitted: number }> {
  const { data: vs } = await args.admin
    .from("video_sessions")
    .select("id,room_id")
    .eq("consultation_id", args.consultationId)
    .eq("clinic_id", args.clinicId)
    .not("status", "eq", "ENDED")
    .limit(1)
    .maybeSingle();

  if (!vs) return { admitted: 0 };
  const row = vs as { id: string; room_id: string };
  const admitted = await admitKnockingParticipants(row.room_id);

  if (admitted > 0) {
    await args.admin
      .from("video_sessions")
      .update({
        patient_waiting_since: null,
        status: "LIVE"
      })
      .eq("id", row.id);

    void writeConsultationEvent(args.admin, {
      clinicId: args.clinicId,
      consultationId: args.consultationId,
      videoSessionId: row.id,
      eventType: "patient_admitted",
      actorRole: "doctor",
      payload: { admitted }
    });
  }

  return { admitted };
}

export function meetingUrlFromAppointment(meetingUrl: string | null, joinToken: string | null): string | null {
  if (joinToken) return joinUrl(joinToken);
  return meetingUrl;
}

/** @deprecated Use buildDailyDoctorJoin — kept for notify service compatibility. */
export function buildDailyRoomUrl(roomId: string): string {
  return roomUrlFromName(roomId);
}

/** End an active video session when consultation is finalized or doctor ends call. */
export async function endVideoSession(args: {
  admin: SupabaseClient;
  consultationId: string;
  clinicId: string;
  reason?: string;
}): Promise<{ ended: boolean }> {
  const { data: vs } = await args.admin
    .from("video_sessions")
    .select("id,room_id,status")
    .eq("consultation_id", args.consultationId)
    .eq("clinic_id", args.clinicId)
    .not("status", "eq", "ENDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!vs) return { ended: false };
  const row = vs as { id: string; room_id: string; status: string };
  const now = new Date().toISOString();

  await args.admin
    .from("video_sessions")
    .update({
      status: "ENDED",
      ended_at: now,
      ended_reason: args.reason ?? "doctor_ended"
    })
    .eq("id", row.id);

  void deleteDailyRoom(row.room_id);

  void writeConsultationEvent(args.admin, {
    clinicId: args.clinicId,
    consultationId: args.consultationId,
    videoSessionId: row.id,
    eventType: "call_ended",
    actorRole: "doctor",
    payload: { reason: args.reason ?? "doctor_ended" }
  });

  return { ended: true };
}
