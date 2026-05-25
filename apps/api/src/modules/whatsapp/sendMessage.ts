import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPrescriptionWhatsApp } from "../distribution/notificationProviders";
import { sendMetaTemplateMessage, sendMetaTextMessage } from "./metaCloudApi";
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
};

export async function sendWhatsAppMessage(input: WhatsAppSendInput): Promise<WhatsAppSendOutput> {
  const phone = input.toPhone.trim();
  if (!phone) return { ok: false, error: "No phone number" };

  const conn = input.connection;
  if (
    conn?.status === "connected" &&
    conn.provider === "meta_cloud" &&
    conn.phone_number_id &&
    conn.access_token
  ) {
    if (input.metaTemplateName?.trim()) {
      const r = await sendMetaTemplateMessage({
        phoneNumberId: conn.phone_number_id,
        accessToken: conn.access_token,
        toPhoneE164: phone,
        templateName: input.metaTemplateName.trim(),
        languageCode: input.languageCode ?? "en",
        bodyParameters: input.templateParameters
      });
      return { ok: r.ok, error: r.error, provider: r.provider, messageId: r.messageId };
    }
    const r = await sendMetaTextMessage({
      phoneNumberId: conn.phone_number_id,
      accessToken: conn.access_token,
      toPhoneE164: phone,
      body: input.body
    });
    return { ok: r.ok, error: r.error, provider: r.provider, messageId: r.messageId };
  }

  const fallback = await sendPrescriptionWhatsApp({ toPhone: phone, body: input.body });
  if (!fallback.ok) return { ok: false, error: fallback.error };
  return { ok: true, provider: fallback.provider };
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
