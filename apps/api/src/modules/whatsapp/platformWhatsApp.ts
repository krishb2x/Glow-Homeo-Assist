import type { WhatsAppConnectionRow } from "./types";
import { env } from "../../config/env";

/** GlowHomeo platform WABA — used when a doctor has not connected their own WhatsApp Business. */
export function isPlatformWhatsAppConfigured(): boolean {
  if (!env.PLATFORM_WHATSAPP_ENABLED) return false;
  return Boolean(
    env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID?.trim() &&
    env.PLATFORM_WHATSAPP_ACCESS_TOKEN?.trim()
  );
}

export function getPlatformWhatsAppDisplayPhone(): string {
  return env.PLATFORM_WHATSAPP_DISPLAY_PHONE?.trim() || "GlowHomeo Assist";
}

export function getPlatformWhatsAppConnection(): WhatsAppConnectionRow | null {
  if (!isPlatformWhatsAppConfigured()) return null;

  return {
    id: "platform",
    clinic_id: "",
    doctor_id: "",
    provider: "meta_cloud",
    channel_type: "AUTOMATED",
    waba_id: env.PLATFORM_WHATSAPP_WABA_ID?.trim() ?? null,
    phone_number_id: env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID!.trim(),
    display_phone: getPlatformWhatsAppDisplayPhone(),
    access_token: env.PLATFORM_WHATSAPP_ACCESS_TOKEN!.trim(),
    status: "connected",
    verified_at: null,
    quality_rating: null
  };
}

export type WhatsAppSenderSource = "doctor" | "platform" | null;

function isUsableMetaConnection(conn: WhatsAppConnectionRow | null): conn is WhatsAppConnectionRow {
  return Boolean(
    conn?.status === "connected" &&
      conn.provider === "meta_cloud" &&
      conn.phone_number_id?.trim() &&
      conn.access_token?.trim()
  );
}

/** Prefer doctor's connected WABA; fall back to GlowHomeo platform number. */
export function resolveWhatsAppSendConnection(doctorConnection: WhatsAppConnectionRow | null): {
  connection: WhatsAppConnectionRow | null;
  sender: WhatsAppSenderSource;
} {
  if (isUsableMetaConnection(doctorConnection)) {
    return { connection: doctorConnection, sender: "doctor" };
  }

  const platform = getPlatformWhatsAppConnection();
  if (platform) {
    return { connection: platform, sender: "platform" };
  }

  return { connection: null, sender: null };
}
