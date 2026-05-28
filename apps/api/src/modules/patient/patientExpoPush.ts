import { logger } from "../../lib/logger";

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
};

function mockEnabled(): boolean {
  return process.env.NOTIFICATION_MOCK_SEND === "true" || process.env.NODE_ENV !== "production";
}

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<{ ok: boolean; error?: string }> {
  const valid = messages.filter((m) => m.to.startsWith("ExponentPushToken[") || m.to.startsWith("ExpoPushToken["));
  if (valid.length === 0) {
    return { ok: false, error: "no_valid_expo_tokens" };
  }

  if (process.env.NOTIFICATION_MOCK_SEND === "true") {
    logger.info("expo_push_mock", { count: valid.length, preview: valid[0]?.title });
    return { ok: true };
  }

  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(valid)
    });
    if (!res.ok) {
      const text = await res.text();
      if (mockEnabled()) {
        logger.info("expo_push_mock_fallback", { status: res.status, preview: text.slice(0, 200) });
        return { ok: true };
      }
      return { ok: false, error: `expo_http_${res.status}` };
    }
    const json = (await res.json()) as { data?: Array<{ status?: string; message?: string }> };
    const failures = (json.data ?? []).filter((d) => d.status === "error");
    if (failures.length > 0 && !mockEnabled()) {
      logger.warn("expo_push_partial_failure", { failures: failures.slice(0, 3) });
      return { ok: failures.length < valid.length, error: failures[0]?.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (mockEnabled()) {
      logger.info("expo_push_mock_network", { message: msg });
      return { ok: true };
    }
    return { ok: false, error: msg };
  }
}
