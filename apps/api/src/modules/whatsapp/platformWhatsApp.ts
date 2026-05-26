import type { WhatsAppConnectionRow } from "./types";

/** GlowHomeo platform WABA — used when a doctor has not connected their own WhatsApp Business. */
export function isPlatformWhatsAppConfigured(): boolean {
  if (process.env.PLATFORM_WHATSAPP_ENABLED === "false") return false;
  return Boolean(
    process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN?.trim()
  );
}

export function getPlatformWhatsAppDisplayPhone(): string {
  return process.env.PLATFORM_WHATSAPP_DISPLAY_PHONE?.trim() || "GlowHomeo Assist";
}

export function getPlatformWhatsAppConnection(): WhatsAppConnectionRow | null {
  if (!isPlatformWhatsAppConfigured()) return null;

  return {
    id: "platform",
    clinic_id: "",
    doctor_id: "",
    provider: "meta_cloud",
    waba_id: process.env.PLATFORM_WHATSAPP_WABA_ID?.trim() ?? null,
    phone_number_id: process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID!.trim(),
    display_phone: getPlatformWhatsAppDisplayPhone(),
    access_token: process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN!.trim(),
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
