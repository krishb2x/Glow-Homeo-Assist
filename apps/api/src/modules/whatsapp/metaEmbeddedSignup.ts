import { logger } from "../../lib/logger";

const GRAPH = "https://graph.facebook.com/v21.0";

export type EmbeddedSignupResult = {
  accessToken: string;
  wabaId: string | null;
  phoneNumberId: string;
  displayPhone: string | null;
};

function requireMetaApp(): { appId: string; appSecret: string } | null {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

/** Exchange authorization code from Meta Embedded Signup / FB.login. */
export async function exchangeMetaAuthCode(
  code: string,
  redirectUri?: string
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const app = requireMetaApp();
  if (!app) return { ok: false, error: "META_APP_ID and META_APP_SECRET are not configured." };

  const params = new URLSearchParams({
    client_id: app.appId,
    client_secret: app.appSecret,
    code: code.trim()
  });
  if (redirectUri?.trim()) params.set("redirect_uri", redirectUri.trim());

  try {
    const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
    const json = (await res.json()) as { access_token?: string; error?: { message: string } };
    if (!res.ok || !json.access_token) {
      return { ok: false, error: json.error?.message ?? `Token exchange failed (${res.status})` };
    }
    return { ok: true, accessToken: json.access_token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Token exchange failed" };
  }
}

async function listPhoneNumbersForWaba(
  wabaId: string,
  accessToken: string
): Promise<Array<{ id: string; display_phone_number?: string }>> {
  const res = await fetch(`${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = (await res.json()) as {
    data?: Array<{ id: string; display_phone_number?: string; verified_name?: string }>;
  };
  return json.data ?? [];
}

/** Resolve phone number ID when client did not pass one from Embedded Signup postMessage. */
export async function resolveWhatsAppAssets(
  accessToken: string,
  hints?: { wabaId?: string | null; phoneNumberId?: string | null }
): Promise<{ ok: true; assets: EmbeddedSignupResult } | { ok: false; error: string }> {
  if (hints?.phoneNumberId?.trim()) {
    const verify = await fetch(
      `${GRAPH}/${hints.phoneNumberId.trim()}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const vj = (await verify.json()) as {
      display_phone_number?: string;
      verified_name?: string;
      error?: { message: string };
    };
    if (!verify.ok) {
      return { ok: false, error: vj.error?.message ?? "Invalid phone number ID" };
    }
    return {
      ok: true,
      assets: {
        accessToken,
        wabaId: hints.wabaId?.trim() ?? null,
        phoneNumberId: hints.phoneNumberId.trim(),
        displayPhone: vj.display_phone_number ?? vj.verified_name ?? null
      }
    };
  }

  const wabaId = hints?.wabaId?.trim();
  if (!wabaId) {
    return {
      ok: false,
      error: "Missing WABA or phone number ID from Embedded Signup. Retry connect or use manual setup."
    };
  }

  const phones = await listPhoneNumbersForWaba(wabaId, accessToken);
  const pick = phones[0];
  if (!pick?.id) {
    return { ok: false, error: "No WhatsApp phone numbers found on this Business account." };
  }

  return {
    ok: true,
    assets: {
      accessToken,
      wabaId,
      phoneNumberId: pick.id,
      displayPhone: pick.display_phone_number ?? null
    }
  };
}

export function getEmbeddedSignupPublicConfig(): {
  enabled: boolean;
  appId: string | null;
  configId: string | null;
} {
  const appId = process.env.META_APP_ID?.trim() ?? process.env.NEXT_PUBLIC_META_APP_ID?.trim() ?? null;
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() ?? null;
  return {
    enabled: Boolean(appId && configId && process.env.META_APP_SECRET?.trim()),
    appId,
    configId
  };
}

export async function completeEmbeddedSignup(input: {
  code: string;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  redirectUri?: string | null;
}): Promise<{ ok: true; assets: EmbeddedSignupResult } | { ok: false; error: string }> {
  const exchanged = await exchangeMetaAuthCode(input.code, input.redirectUri ?? undefined);
  if (!exchanged.ok) return exchanged;

  const resolved = await resolveWhatsAppAssets(exchanged.accessToken, {
    wabaId: input.wabaId,
    phoneNumberId: input.phoneNumberId
  });
  if (!resolved.ok) {
    logger.warn("embedded_signup_resolve_failed", { error: resolved.error });
    return resolved;
  }
  return resolved;
}
