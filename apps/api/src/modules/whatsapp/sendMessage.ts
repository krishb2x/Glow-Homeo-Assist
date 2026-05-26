import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { sendPrescriptionWhatsApp } from "../distribution/notificationProviders";
import { sendMetaTemplateMessage, sendMetaTextMessage } from "./metaCloudApi";
import { resolveWhatsAppSendConnection, type WhatsAppSenderSource } from "./platformWhatsApp";
import type { WhatsAppConnectionRow } from "./types";
import { decryptAccessToken } from "./credentialVault";

export type WhatsAppSendInput = {
  connection: WhatsAppConnectionRow | null;
  toPhone: string;
  body: string;
  metaTemplateName?: string | null;
  languageCode?: string;
  templateParameters?: string[];
};

export type WhatsAppSendOutput = {
  ok: boolean;
  error?: string;
  provider?: string;
  messageId?: string;
  sender?: WhatsAppSenderSource | "twilio" | "mock";
};

export async function sendWhatsAppMessage(input: WhatsAppSendInput): Promise<WhatsAppSendOutput> {
  const phone = input.toPhone.trim();
  if (!phone) return { ok: false, error: "No phone number" };

  const { connection: conn, sender } = resolveWhatsAppSendConnection(input.connection);

  if (conn) {
    if (sender === "platform") {
      logger.info("whatsapp_send_platform", { to: phone.slice(-4) });
    }

    if (input.metaTemplateName?.trim()) {
      const r = await sendMetaTemplateMessage({
        phoneNumberId: conn.phone_number_id!,
        accessToken: conn.access_token!,
        toPhoneE164: phone,
        templateName: input.metaTemplateName.trim(),
        languageCode: input.languageCode ?? "en",
        bodyParameters: input.templateParameters
      });
      return {
        ok: r.ok,
        error: r.error,
        provider: sender === "platform" ? "meta_cloud_platform" : r.provider,
        messageId: r.messageId,
        sender: sender ?? undefined
      };
    }

    const r = await sendMetaTextMessage({
      phoneNumberId: conn.phone_number_id!,
      accessToken: conn.access_token!,
      toPhoneE164: phone,
      body: input.body
    });
    return {
      ok: r.ok,
      error: r.error,
      provider: sender === "platform" ? "meta_cloud_platform" : r.provider,
      messageId: r.messageId,
      sender: sender ?? undefined
    };
  }

  const fallback = await sendPrescriptionWhatsApp({ toPhone: phone, body: input.body });
  if (!fallback.ok) return { ok: false, error: fallback.error };
  return {
    ok: true,
    provider: fallback.provider,
    sender: fallback.mock ? "mock" : "twilio"
  };
}

export async function loadDoctorWhatsAppConnection(
  client: SupabaseClient,
  clinicId: string,
  doctorId: string
): Promise<WhatsAppConnectionRow | null> {
  const { data, error } = await client
    .from("whatsapp_connections")
    .select(
      "id,clinic_id,doctor_id,provider,waba_id,phone_number_id,display_phone,access_token,access_token_encrypted,status,verified_at,quality_rating"
    )
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctorId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as WhatsAppConnectionRow & { access_token_encrypted?: string | null };
  const token = decryptAccessToken(row.access_token_encrypted ?? null, row.access_token);
  return { ...row, access_token: token ?? row.access_token };
}

export { resolveWhatsAppSendConnection, isPlatformWhatsAppConfigured, getPlatformWhatsAppDisplayPhone } from "./platformWhatsApp";
