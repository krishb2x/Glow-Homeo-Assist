import { WebSocket, type WebSocketServer } from "ws";
import { getDb } from "../db";
import { resolveAuthFromAccessTokenString, type AuthClaims } from "../auth";
import { buildObjectKey, putObjectBuffer } from "../s3";
import { emptyDraft, extractNoteDraftFromTranscript, transcribeAudioChunk, type LiveNoteDraft } from "./geminiPipeline";
import { getClinicFeatures } from "../lib/features";
import {
  createScribeJob,
  endAudioSession,
  startAudioSession,
  updateScribeJob
} from "../modules/encounters/v2EncountersService";
import { z } from "zod";
import { logger } from "../lib/logger";

const startSchema = z.object({
  type: z.literal("start"),
  consultationId: z.string().uuid(),
  saveAudio: z.boolean(),
  mimeType: z.string().optional()
});

const chunkSchema = z.object({
  type: z.literal("chunk"),
  data: z.string().min(1),
  mimeType: z.string().min(1),
  seq: z.number().optional()
});

const stopSchema = z.object({ type: z.literal("stop") });

const MAX_WINDOW_FOR_MODEL = 1_500_000; // keep last ~1.5MB for a single STT call
const MAX_RAM_BYTES = 50 * 1024 * 1024;
const TICK_MS = 4000;
const DB_FLUSH_MS = 8000;

type Session = {
  claims: AuthClaims;
  consultationId: string;
  clinicId: string;
  accessToken: string;
  saveAudio: boolean;
  mimeType: string;
  /** full recording (for optional staging) */
  parts: Buffer[];
  totalBytes: number;
  transcript: string;
  noteDraft: LiveNoteDraft;
  tickInterval: ReturnType<typeof setInterval> | null;
  lastDbFlush: number;
  audioSessionId: string | null;
  scribeJobId: string | null;
  startedAtMs: number;
};

const sessions = new Map<string, Session>();
const connectionByWs = new Map<WebSocket, string>();

function send(ws: WebSocket, obj: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ...obj, t: Date.now() }));
  }
}

async function verifyConsultation(claims: AuthClaims, clinicId: string, consultationId: string): Promise<boolean> {
  const client = getDb(claims);
  const { data, error } = await client
    .from("consultations")
    .select("id")
    .eq("id", consultationId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  return !error && Boolean(data);
}

async function updateConsultationThrottled(consultationId: string, session: Session): Promise<void> {
  const now = Date.now();
  if (now - session.lastDbFlush < DB_FLUSH_MS) return;
  session.lastDbFlush = now;
  const client = getDb(session.claims);
  const { error } = await client
    .from("consultations")
    .update({ transcript_text: session.transcript, note_draft: session.noteDraft })
    .eq("id", consultationId);
  if (error) {
    logger.warn("ws_consultation_flush_failed", { step: "throttled_update" });
  }
}

async function runProcessTick(ws: WebSocket, session: Session): Promise<void> {
  if (session.parts.length === 0) return;
  const all = Buffer.concat(session.parts);
  if (all.length === 0) return;
  const forModel = all.length > MAX_WINDOW_FOR_MODEL ? all.subarray(all.length - MAX_WINDOW_FOR_MODEL) : all;
  const b64 = forModel.toString("base64");
  const { text, usedMock } = await transcribeAudioChunk(b64, session.mimeType);
  if (text) {
    session.transcript = [session.transcript, text].filter(Boolean).join(" ").trim();
    send(ws, { type: "transcript", text: session.transcript, segment: text, usedMock });
  }
  const nextDraft = await extractNoteDraftFromTranscript(session.transcript, session.noteDraft);
  session.noteDraft = nextDraft;
  send(ws, { type: "noteDraft", draft: nextDraft, usedMock });
  if (session.scribeJobId && session.transcript) {
    void updateScribeJob(getDb(session.claims), session.scribeJobId, {
      status: "STREAMING",
      transcriptText: session.transcript,
      draftRecord: nextDraft as unknown as Record<string, unknown>
    });
  }
  void updateConsultationThrottled(session.consultationId, session);
}

function startTick(ws: WebSocket, session: Session): void {
  if (session.tickInterval) return;
  session.tickInterval = setInterval(() => {
    void runProcessTick(ws, session);
  }, TICK_MS);
}

function clearTick(session: Session): void {
  if (session.tickInterval) {
    clearInterval(session.tickInterval);
    session.tickInterval = null;
  }
}

export function attachConsultationWss(wss: WebSocketServer): void {
  wss.on("connection", (ws, req) => {
    const pending: import("ws").RawData[] = [];
    let registered = false;

    ws.on("message", (raw) => {
      if (!registered) {
        pending.push(raw);
        return;
      }
      if (!claimsOnSocket.has(ws)) return;
      void handleMessage(ws, raw, claimsOnSocket.get(ws)!);
    });

    const claimsOnSocket = new Map<WebSocket, AuthClaims>();

    void (async () => {
      const url = new URL(req.url ?? "/ws/consultation", "http://localhost");
      const token = url.searchParams.get("access_token") ?? url.searchParams.get("token");
      if (!token) {
        send(ws, { type: "error", message: "Missing access_token query" });
        ws.close(4001, "unauthorized");
        return;
      }

      const claimsFromProfile = await resolveAuthFromAccessTokenString(token);
      if (!claimsFromProfile) {
        send(ws, { type: "error", message: "Invalid token" });
        ws.close(4001, "unauthorized");
        return;
      }
      if (
        !claimsFromProfile.clinicId ||
        !["DOCTOR", "SUPER_ADMIN"].includes(claimsFromProfile.role)
      ) {
        send(ws, { type: "error", message: "Doctor session with an active clinic is required" });
        ws.close(4003, "forbidden");
        return;
      }

      const claims: AuthClaims = claimsFromProfile;

      claimsOnSocket.set(ws, claims);
      send(ws, { type: "hello", version: 1, privacy: "staged-audio" });
      registered = true;
      for (const p of pending) {
        void handleMessage(ws, p, claims);
      }
      pending.length = 0;

      ws.on("close", () => {
        const conId = connectionByWs.get(ws);
        if (conId) {
          const s = sessions.get(conId);
          if (s) clearTick(s);
          sessions.delete(conId);
        }
        connectionByWs.delete(ws);
        claimsOnSocket.delete(ws);
      });
    })();
  });
}

async function handleMessage(ws: WebSocket, raw: import("ws").RawData, claims: AuthClaims): Promise<void> {
  let msg: unknown;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    send(ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (startSchema.safeParse(msg).success) {
    const m = startSchema.parse(msg);

    // Feature gate — AI Notetaker is a Pro-plan feature
    const feats = await getClinicFeatures(claims.clinicId);
    if (!feats.aiNotetaker) {
      send(ws, {
        type: "error",
        code: "FEATURE_DISABLED",
        message: "AI Notetaker is not enabled for this clinic. Upgrade to the Pro plan or contact your admin."
      });
      ws.close(4003, "feature_disabled");
      return;
    }

    if (!(await verifyConsultation(claims, claims.clinicId!, m.consultationId))) {
      send(ws, { type: "error", message: "Consultation not found" });
      return;
    }
    if (connectionByWs.has(ws)) {
      const prev = connectionByWs.get(ws)!;
      const old = sessions.get(prev);
      if (old) clearTick(old);
      sessions.delete(prev);
    }
    const s: Session = {
      claims,
      consultationId: m.consultationId,
      clinicId: claims.clinicId!,
      accessToken: claims.accessToken,
      saveAudio: m.saveAudio,
      mimeType: m.mimeType || "audio/webm",
      parts: [],
      totalBytes: 0,
      transcript: "",
      noteDraft: emptyDraft(),
      tickInterval: null,
      lastDbFlush: 0,
      audioSessionId: null,
      scribeJobId: null,
      startedAtMs: Date.now()
    };
    connectionByWs.set(ws, m.consultationId);
    sessions.set(m.consultationId, s);
    const client = getDb(claims);
    s.audioSessionId = await startAudioSession(client, {
      clinicId: s.clinicId,
      consultationId: s.consultationId,
      doctorId: claims.userId,
      storeRecording: m.saveAudio,
      consentCaptured: true
    });
    s.scribeJobId = await createScribeJob(client, {
      clinicId: s.clinicId,
      consultationId: s.consultationId,
      doctorId: claims.userId,
      audioSessionId: s.audioSessionId,
      status: "STREAMING"
    });
    const { error } = await client
      .from("consultations")
      .update({ recording_enabled: true })
      .eq("id", m.consultationId)
      .eq("clinic_id", s.clinicId);
    if (error) {
      logger.warn("ws_recording_flag_update_failed", { step: "start" });
    }
    startTick(ws, s);
    send(ws, { type: "ready", consultationId: m.consultationId });
    return;
  }

  const conId = connectionByWs.get(ws);
  if (!conId) {
    send(ws, { type: "error", message: 'Send a start message with type "start" first' });
    return;
  }
  const session = sessions.get(conId);
  if (!session) {
    send(ws, { type: "error", message: "Session lost" });
    return;
  }

  if (chunkSchema.safeParse(msg).success) {
    const c = chunkSchema.parse(msg);
    if (c.mimeType) session.mimeType = c.mimeType;
    const buf = Buffer.from(c.data, "base64");
    session.totalBytes += buf.length;
    if (session.totalBytes > MAX_RAM_BYTES) {
      send(ws, { type: "error", message: "Recording too large. Stop and start a new session." });
      ws.close(1009, "message too big");
      return;
    }
    session.parts.push(buf);
    send(ws, { type: "chunk-ack", seq: c.seq });
    return;
  }

  if (stopSchema.safeParse(msg).success) {
    const s = session;
    clearTick(s);
    if (s.parts.length > 0) {
      await runProcessTick(ws, s);
    }
    let stagingKey: string | null = null;
    if (s.saveAudio && s.parts.length > 0) {
      stagingKey = buildObjectKey(s.clinicId, "audio-staging", `live-${s.consultationId}.webm`);
      const body = Buffer.concat(s.parts);
      try {
        await putObjectBuffer(stagingKey, body, s.mimeType);
        const client = getDb(claims);
        const { error: upErr } = await client
          .from("consultations")
          .update({ audio_staging_object_key: stagingKey })
          .eq("id", s.consultationId)
          .eq("clinic_id", s.clinicId);
        if (upErr) {
          logger.warn("ws_audio_staging_key_update_failed", {
            hint: "run DB migration if audio_staging_object_key is missing on consultations",
            message: upErr.message
          });
        }
        send(ws, { type: "stopped", audioStagingObjectKey: stagingKey, saved: true, bytes: body.length });
      } catch (e) {
        send(ws, { type: "error", message: (e as Error).message });
      }
    } else {
      send(ws, { type: "stopped", audioStagingObjectKey: null, saved: false, bytes: 0 });
    }
    const client = getDb(claims);
    const { error: upErr2 } = await client
      .from("consultations")
      .update({ transcript_text: s.transcript, note_draft: s.noteDraft })
      .eq("id", s.consultationId)
      .eq("clinic_id", s.clinicId);
    if (upErr2) {
      logger.warn("ws_consultation_final_flush_failed", { step: "stop" });
    }
    if (s.audioSessionId) {
      await endAudioSession(client, s.audioSessionId, {
        durationSeconds: Math.max(1, Math.round((Date.now() - s.startedAtMs) / 1000)),
        recordingObjectKey: stagingKey
      });
    }
    if (s.scribeJobId) {
      await updateScribeJob(client, s.scribeJobId, {
        status: "DRAFTED",
        transcriptText: s.transcript,
        draftRecord: s.noteDraft as unknown as Record<string, unknown>,
        ended: true
      });
    }
    s.parts = [];
    return;
  }

  send(ws, { type: "error", message: "Unknown message" });
}
