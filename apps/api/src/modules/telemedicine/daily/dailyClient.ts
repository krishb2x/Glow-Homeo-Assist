import { logger } from "../../../lib/logger";
import { buildDailyRoomProperties, dailyDomain, isDailyConfigured } from "./dailyRoomConfig";

const DAILY_API = "https://api.daily.co/v1";

function apiKey(): string {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) throw new Error("DAILY_API_KEY is not configured");
  return key;
}

async function dailyFetch<T>(
  path: string,
  init?: RequestInit & { method?: string }
): Promise<T> {
  const res = await fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    signal: AbortSignal.timeout(30_000)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily API ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type DailyRoom = {
  name: string;
  url: string;
  id?: string;
  config?: { exp?: number; nbf?: number };
};

export async function createDailyRoom(args: {
  roomName: string;
  recordingEnabled?: boolean;
  scheduledFor?: string | null;
  durationMinutes?: number;
}): Promise<DailyRoom> {
  if (!isDailyConfigured()) {
    throw new Error("Daily.co is not configured (DAILY_API_KEY, DAILY_DOMAIN)");
  }
  const properties = buildDailyRoomProperties(args);
  try {
    return await dailyFetch<DailyRoom>("/rooms", {
      method: "POST",
      body: JSON.stringify({ name: args.roomName, properties })
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already exists") || msg.includes("409")) {
      return await dailyFetch<DailyRoom>(`/rooms/${encodeURIComponent(args.roomName)}`, {
        method: "GET"
      });
    }
    logger.warn("daily_room_create_failed", { roomName: args.roomName, message: msg });
    throw e;
  }
}

export async function getDailyRoom(roomName: string): Promise<DailyRoom | null> {
  if (!isDailyConfigured()) return null;
  try {
    return await dailyFetch<DailyRoom>(`/rooms/${encodeURIComponent(roomName)}`, { method: "GET" });
  } catch {
    return null;
  }
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  if (!isDailyConfigured()) return;
  try {
    await dailyFetch(`/rooms/${encodeURIComponent(roomName)}`, { method: "DELETE" });
  } catch (e) {
    logger.warn("daily_room_delete_failed", {
      roomName,
      message: e instanceof Error ? e.message : String(e)
    });
  }
}

/** Extend room expiry for long consultations (Daily PATCH /rooms/:name). */
export async function extendDailyRoomExpiry(
  roomName: string,
  expUnix: number
): Promise<void> {
  if (!isDailyConfigured()) return;
  try {
    await dailyFetch(`/rooms/${encodeURIComponent(roomName)}`, {
      method: "POST",
      body: JSON.stringify({ properties: { exp: expUnix } })
    });
  } catch (e) {
    logger.warn("daily_room_extend_failed", {
      roomName,
      message: e instanceof Error ? e.message : String(e)
    });
  }
}

export type DailyMeetingToken = { token: string };

export async function createDailyMeetingToken(args: {
  roomName: string;
  userName: string;
  isOwner: boolean;
  enableKnocking?: boolean;
  exp?: number;
}): Promise<string> {
  const ttl = args.exp ?? Math.floor(Date.now() / 1000) + Number(process.env.DAILY_MEETING_TOKEN_TTL_SEC ?? 7200);
  const body: Record<string, unknown> = {
    properties: {
      room_name: args.roomName,
      user_name: args.userName,
      is_owner: args.isOwner,
      exp: ttl,
      enable_knocking: args.enableKnocking ?? !args.isOwner,
      start_video_off: false,
      start_audio_off: false
    }
  };
  const result = await dailyFetch<DailyMeetingToken>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result.token;
}

export type DailyPresence = {
  id: string;
  userName?: string;
  user_name?: string;
  owner?: boolean;
  knocking?: boolean;
  joinTime?: string;
};

export async function listRoomPresence(roomName: string): Promise<DailyPresence[]> {
  if (!isDailyConfigured()) return [];
  try {
    const data = await dailyFetch<{ data?: DailyPresence[]; total_count?: number }>(
      `/rooms/${encodeURIComponent(roomName)}/presence`,
      { method: "GET" }
    );
    return data.data ?? [];
  } catch {
    return [];
  }
}

/** Admit all knocking participants in a room (waiting room flow). */
export async function admitKnockingParticipants(roomName: string): Promise<number> {
  const presence = await listRoomPresence(roomName);
  let admitted = 0;
  for (const p of presence) {
    if (!p.knocking) continue;
    try {
      await dailyFetch(`/rooms/${encodeURIComponent(roomName)}/presence/${encodeURIComponent(p.id)}/admit`, {
        method: "POST",
        body: JSON.stringify({})
      });
      admitted += 1;
    } catch (e) {
      logger.warn("daily_admit_failed", {
        roomName,
        sessionId: p.id,
        message: e instanceof Error ? e.message : String(e)
      });
    }
  }
  return admitted;
}

export function roomUrlFromName(roomName: string): string {
  const domain = dailyDomain();
  return `https://${domain}/${roomName}`;
}

export async function startCloudRecording(roomName: string): Promise<void> {
  if (!isDailyConfigured()) return;
  try {
    await dailyFetch("/recordings", {
      method: "POST",
      body: JSON.stringify({ room_name: roomName })
    });
  } catch (e) {
    logger.warn("daily_recording_start_failed", {
      roomName,
      message: e instanceof Error ? e.message : String(e)
    });
  }
}
