/** Daily.co room + token timing defaults for healthcare consultations. */

export function dailyRoomPrefix(): string {
  return process.env.DAILY_ROOM_PREFIX?.trim() || "GlowHomeo";
}

export function meetingTokenTtlSec(): number {
  const n = Number(process.env.DAILY_MEETING_TOKEN_TTL_SEC ?? "7200");
  return Number.isFinite(n) && n > 60 ? n : 7200;
}

export function dailyDomain(): string {
  return (process.env.DAILY_DOMAIN?.trim() || "").replace(/\/$/, "");
}

export function isDailyConfigured(): boolean {
  return Boolean(process.env.DAILY_API_KEY?.trim() && dailyDomain());
}

/** Room window: 15 min before slot (or now) through 2h after slot / now. */
export function roomWindowUnix(args?: { scheduledFor?: string | null; durationMinutes?: number }): {
  nbf: number;
  exp: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const durationMin = args?.durationMinutes ?? 120;
  let start = now - 15 * 60;
  if (args?.scheduledFor) {
    const slot = Math.floor(new Date(args.scheduledFor).getTime() / 1000);
    start = Math.min(start, slot - 15 * 60);
  }
  const end = Math.max(now + durationMin * 60, start + 2 * 3600);
  return { nbf: start, exp: end };
}

export function buildDailyRoomProperties(args: {
  recordingEnabled?: boolean;
  scheduledFor?: string | null;
  durationMinutes?: number;
}): Record<string, unknown> {
  const { nbf, exp } = roomWindowUnix(args);
  return {
    privacy: "private",
    enable_knocking: true,
    enable_prejoin_ui: false,
    enable_screenshare: false,
    max_participants: 2,
    nbf,
    exp,
    enable_recording: args.recordingEnabled ? "cloud" : false,
    start_video_off: false,
    start_audio_off: false
  };
}
