import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { writeConsultationEvent, loadVideoSessionByRoom } from "./consultationEventsService";
import { ingestConsultationRecording } from "./recordingService";
import { sendConsultationReadyNotification } from "./consultationNotifyService";

export function verifyDailyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.DAILY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

type DailyWebhookPayload = {
  type?: string;
  event?: string;
  payload?: Record<string, unknown>;
  room?: string;
  room_name?: string;
};

function eventType(payload: DailyWebhookPayload): string {
  return String(payload.type ?? payload.event ?? "").toLowerCase();
}

function roomName(payload: DailyWebhookPayload): string | null {
  const p = payload.payload ?? payload;
  const name =
    (p.room as string) ??
    (p.room_name as string) ??
    payload.room ??
    payload.room_name ??
    null;
  return name ? String(name) : null;
}

function participantRole(p: Record<string, unknown>): "doctor" | "patient" {
  if (p.owner === true || p.is_owner === true) return "doctor";
  return "patient";
}

export async function handleDailyWebhook(
  admin: SupabaseClient,
  body: DailyWebhookPayload
): Promise<{ handled: boolean; event: string }> {
  const type = eventType(body);
  const room = roomName(body);
  if (!room) {
    logger.warn("daily_webhook_no_room", { type });
    return { handled: false, event: type };
  }

  const session = await loadVideoSessionByRoom(admin, room);
  if (!session) {
    logger.info("daily_webhook_no_session", { type, room });
    return { handled: true, event: type };
  }

  const p = (body.payload ?? body) as Record<string, unknown>;
  const now = new Date().toISOString();

  if (type.includes("participant.joined") || type === "participant-joined") {
    const role = participantRole(p);
    const updates: Record<string, unknown> = { status: "LIVE" };
    if (role === "doctor") {
      updates.doctor_joined_at = now;
      if (!session.status || session.status === "PROVISIONED") {
        updates.started_at = now;
      }
    } else {
      updates.patient_joined_at = now;
      updates.patient_waiting_since = null;
    }
    await admin.from("video_sessions").update(updates).eq("id", session.id);
    await writeConsultationEvent(admin, {
      clinicId: session.clinic_id,
      consultationId: session.consultation_id,
      videoSessionId: session.id,
      eventType: role === "doctor" ? "doctor_joined" : "patient_joined",
      actorRole: role,
      payload: { participantId: p.id, userName: p.user_name ?? p.userName }
    });

    if (role === "doctor") {
      void sendConsultationReadyNotification({
        admin,
        clinicId: session.clinic_id,
        consultationId: session.consultation_id
      }).catch(() => undefined);
    }
    return { handled: true, event: type };
  }

  if (type.includes("participant.left") || type === "participant-left") {
    const role = participantRole(p);
    await writeConsultationEvent(admin, {
      clinicId: session.clinic_id,
      consultationId: session.consultation_id,
      videoSessionId: session.id,
      eventType: role === "doctor" ? "call_ended" : "patient_left",
      actorRole: role,
      payload: { left: true, participantId: p.id }
    });
    return { handled: true, event: type };
  }

  if (type.includes("knocking") || p.knocking === true) {
    await admin
      .from("video_sessions")
      .update({ patient_waiting_since: now })
      .eq("id", session.id)
      .is("patient_waiting_since", null);
    await writeConsultationEvent(admin, {
      clinicId: session.clinic_id,
      consultationId: session.consultation_id,
      videoSessionId: session.id,
      eventType: "patient_waiting",
      actorRole: "patient",
      payload: { participantId: p.id }
    });
    return { handled: true, event: type };
  }

  if (type.includes("meeting.ended") || type === "meeting-ended") {
    // Do not mark ENDED — doctor may still chart after the call disconnects.
    await writeConsultationEvent(admin, {
      clinicId: session.clinic_id,
      consultationId: session.consultation_id,
      videoSessionId: session.id,
      eventType: "call_ended",
      actorRole: "system",
      payload: { meetingEnded: true, chartingMayContinue: true }
    });
    return { handled: true, event: type };
  }

  if (type.includes("recording.ready") || type === "recording-ready-to-download") {
    const downloadUrl = (p.download_link as string) ?? (p.recording_url as string);
    if (downloadUrl) {
      try {
        await ingestConsultationRecording({
          admin,
          consultationId: session.consultation_id,
          videoSessionId: session.id,
          sourceUrl: downloadUrl,
          contentType: "video/mp4"
        });
        await writeConsultationEvent(admin, {
          clinicId: session.clinic_id,
          consultationId: session.consultation_id,
          videoSessionId: session.id,
          eventType: "recording_ready",
          actorRole: "system",
          payload: {}
        });
      } catch (e) {
        logger.warn("daily_recording_ingest_failed", {
          message: e instanceof Error ? e.message : String(e)
        });
      }
    }
    return { handled: true, event: type };
  }

  logger.info("daily_webhook_unhandled", { type, room });
  return { handled: false, event: type };
}
