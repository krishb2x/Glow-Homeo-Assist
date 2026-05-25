"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildConsultationWebSocketUrl,
  fetchClinicPrivacyDefaults,
  finalizeConsultationRecording,
  getAccessTokenForClient
} from "../../lib/doctor-api";

export type LiveAudioPhase = "idle" | "recording" | "paused" | "reviewing" | "finalized";

/** WebSocket note draft shape returned by the live pipeline. */
export type NoteShape = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities?: string;
  timeline: string;
  needsReview: boolean;
};

function pickMimeType(): { mime: string; ok: boolean } {
  if (typeof MediaRecorder === "undefined") {
    return { mime: "audio/webm", ok: false };
  }
  // Ordered from "ideal" → "acceptable". Mp4 covers Safari ≥ 14.5.
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm;codecs=vp8,opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) {
      return { mime: c, ok: true };
    }
  }
  return { mime: "", ok: false };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read error"));
    r.onload = () => {
      const d = String(r.result ?? "");
      const i = d.indexOf(",");
      resolve(i >= 0 ? d.slice(i + 1) : "");
    };
    r.readAsDataURL(blob);
  });
}

function whenOpen(ws: WebSocket): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((res, rej) => {
    ws.addEventListener("open", () => res(), { once: true });
    ws.addEventListener("error", () => rej(new Error("WebSocket connection failed")), { once: true });
  });
}

function whenMessageType(
  ws: WebSocket,
  type: string,
  timeoutMs: number
): Promise<Record<string, unknown>> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("Stream handshake timeout")), timeoutMs);
    const h = (ev: MessageEvent): void => {
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(String(ev.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (m.type === type) {
        clearTimeout(t);
        ws.removeEventListener("message", h);
        res(m);
      } else if (m.type === "error") {
        clearTimeout(t);
        ws.removeEventListener("message", h);
        rej(new Error(String((m as { message?: string }).message ?? "Stream error")));
      }
    };
    ws.addEventListener("message", h);
  });
}

/** Format elapsed seconds as MM:SS */
export function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Options = {
  sessionOpen: boolean;
  onTranscript: (text: string) => void;
  onNoteDraft: (draft: NoteShape) => void;
};

/**
 * Real-time audio → WebSocket → (Gemini) transcript + draft.
 * Privacy: staging in S3 until /finalize.
 * Supports pause/resume via MediaRecorder.pause() / resume().
 */
export function useConsultationLiveAudio(consultationId: string, opts: Options) {
  const { sessionOpen, onTranscript, onNoteDraft } = opts;
  const [phase, setPhase] = useState<LiveAudioPhase>("idle");
  const [saveAudioForReview, setSaveAudioForReview] = useState(false);
  const [liveLine, setLiveLine] = useState("");
  const [lastMock, setLastMock] = useState(false);
  const [hasStagingAudio, setHasStagingAudio] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Elapsed time tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedAtPauseRef = useRef(0);

  const wsRef = useRef<WebSocket | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const seqRef = useRef(0);
  const onMsgRef = useRef<(data: string) => void>();

  // ── Privacy defaults ───────────────────────────────────────────────────────
  useEffect(() => {
    let c = true;
    void (async () => {
      try {
        const p = await fetchClinicPrivacyDefaults();
        if (c) setSaveAudioForReview(p.defaultSaveAudio);
      } catch {
        if (c) setSaveAudioForReview(false);
      }
    })();
    return () => { c = false; };
  }, []);

  // ── Timer helpers ──────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedAtPauseRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSeconds(0);
    elapsedAtPauseRef.current = 0;
  }, []);

  // ── Stream cleanup ─────────────────────────────────────────────────────────
  const stopStreams = useCallback((): void => {
    if (recRef.current && recRef.current.state !== "inactive") {
      try { recRef.current.stop(); } catch { /* */ }
    }
    recRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const closeWs = useCallback((): void => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* */ }
    }
    wsRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopStreams();
      closeWs();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [closeWs, stopStreams]);

  // ── WebSocket message handler ──────────────────────────────────────────────
  const onTranscriptD = onTranscript;
  const onNoteDraftD = onNoteDraft;
  useEffect(() => {
    onMsgRef.current = (data: string) => {
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(data) as Record<string, unknown>;
      } catch {
        return;
      }
      if (m.type === "transcript" && typeof m.text === "string") {
        onTranscriptD(m.text);
        setLiveLine(m.text);
        if (typeof m.usedMock === "boolean") setLastMock(m.usedMock);
      } else if (m.type === "noteDraft" && m.draft && typeof m.draft === "object") {
        onNoteDraftD(m.draft as NoteShape);
      } else if (m.type === "stopped" && m.saved === true) {
        setLastMock(false);
      } else if (m.type === "error" && typeof m.message === "string") {
        setErr(m.message);
      }
    };
  }, [onNoteDraftD, onTranscriptD]);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!sessionOpen) {
      setErr("Consultation is not active — recording is disabled.");
      return;
    }
    setErr(null);

    // Guard: if a previous session left state behind, clean it before opening a new one.
    stopStreams();
    closeWs();

    const t = await getAccessTokenForClient();
    if (!t) {
      setErr("Your session expired — please sign in again to record.");
      return;
    }
    const { mime, ok: mimeOk } = pickMimeType();
    if (!mimeOk) {
      setErr("Your browser does not support audio recording. Try the latest Chrome, Edge, or Safari.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErr("Microphone APIs are unavailable in this browser context.");
      return;
    }

    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;

      const ws = new WebSocket(buildConsultationWebSocketUrl(t));
      wsRef.current = ws;
      const saveAudio = saveAudioForReview;
      ws.addEventListener("message", (ev) => onMsgRef.current?.(String(ev.data)));
      // Surface unexpected socket closures so the doctor sees a real status.
      ws.addEventListener("close", (ev) => {
        if (ev.code !== 1000 && recRef.current && recRef.current.state !== "inactive") {
          setErr("Live transcription disconnected. Tap Stop & Draft, then Start to retry.");
        }
      });
      ws.addEventListener("error", () => {
        setErr("Transcription connection error. Check your network and try again.");
      });

      await whenOpen(ws);
      await whenMessageType(ws, "hello", 12_000);
      ws.send(JSON.stringify({ type: "start", consultationId, saveAudio, mimeType: mime }));
      await whenMessageType(ws, "ready", 15_000);

      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128_000 });
      recRef.current = rec;
      rec.ondataavailable = (e) => {
        const w = wsRef.current;
        if (!e.data.size || w?.readyState !== WebSocket.OPEN) return;
        void (async () => {
          try {
            const b64 = await blobToBase64(e.data);
            const seq = seqRef.current++;
            w.send(JSON.stringify({ type: "chunk", data: b64, mimeType: mime, seq }));
          } catch {
            // a single dropped chunk is non-fatal — the model windows the last 1.5 MB.
          }
        })();
      };
      rec.onerror = () => {
        setErr("Microphone capture error. Try again or check device permissions.");
      };

      setPhase("recording");
      resetTimer();
      startTimer();
      rec.start(2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start live capture";
      // Friendly messaging for the common permission and timeout cases.
      if (/permission|denied|NotAllowedError/i.test(msg)) {
        setErr("Microphone permission denied. Allow access in your browser settings to record.");
      } else if (/NotFoundError|requested device/i.test(msg)) {
        setErr("No microphone detected. Plug one in (or check audio settings) and try again.");
      } else if (/handshake timeout/i.test(msg)) {
        setErr("AI transcription server did not respond in time. Try again in a moment.");
      } else {
        setErr(msg);
      }
      stopStreams();
      closeWs();
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }, [closeWs, consultationId, saveAudioForReview, sessionOpen, stopStreams, startTimer, resetTimer]);

  // ── Pause recording ────────────────────────────────────────────────────────
  const pauseRecording = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state !== "recording") return;
    try {
      rec.pause();
      pauseTimer();
      setPhase("paused");
    } catch {
      setErr("Could not pause recording");
    }
  }, [pauseTimer]);

  // ── Resume recording ───────────────────────────────────────────────────────
  const resumeRecording = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state !== "paused") return;
    try {
      rec.resume();
      startTimer();
      setPhase("recording");
    } catch {
      setErr("Could not resume recording");
    }
  }, [startTimer]);

  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (phase !== "recording" && phase !== "paused") return;
    setErr(null);
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* */ }
    }
    const w = wsRef.current;
    if (w && w.readyState === WebSocket.OPEN) {
      w.send(JSON.stringify({ type: "stop" }));
    }
    stopStreams();
    pauseTimer();
    setTimeout(() => { closeWs(); }, 500);
    if (saveAudioForReview) {
      setHasStagingAudio(true);
      setPhase("reviewing");
    } else {
      setHasStagingAudio(false);
      // Skip the staging-review screen when nothing is being kept — let the
      // doctor immediately see the draft and continue the visit.
      setPhase("idle");
    }
  }, [closeWs, phase, saveAudioForReview, stopStreams, pauseTimer]);

  const clearError = useCallback(() => setErr(null), []);

  // ── Finalize / discard audio ───────────────────────────────────────────────
  const discardStagingAudio = useCallback(async () => {
    if (!hasStagingAudio) { setPhase("idle"); return; }
    setBusy(true);
    setErr(null);
    try {
      await finalizeConsultationRecording(consultationId, false);
      setHasStagingAudio(false);
      setPhase("idle");
      resetTimer();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not discard");
    } finally {
      setBusy(false);
    }
  }, [consultationId, hasStagingAudio, resetTimer]);

  const keepStagingAudio = useCallback(async () => {
    if (!hasStagingAudio) { setPhase("idle"); return; }
    setBusy(true);
    setErr(null);
    try {
      await finalizeConsultationRecording(consultationId, true);
      setHasStagingAudio(false);
      setPhase("idle");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }, [consultationId, hasStagingAudio]);

  return {
    phase,
    setPhase: (p: LiveAudioPhase) => setPhase(p),
    saveAudioForReview,
    setSaveAudioForReview,
    liveTranscript: liveLine,
    lastMock,
    hasStagingAudio,
    err,
    clearError,
    busy,
    elapsedSeconds,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardStagingAudio,
    keepStagingAudio
  };
}
