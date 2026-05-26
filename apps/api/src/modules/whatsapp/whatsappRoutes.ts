import type express from "express";
import { z } from "zod";
import type { AuthClaims } from "../../auth";
import { authRequired, requireAppRoles } from "../../auth";
import { getDb } from "../../db";
import { supabaseAdmin } from "../../supabase";
import { resolveClinicScope } from "../../lib/clinicScope";
import { jsonSuccess, jsonError } from "../../lib/apiEnvelope";
import { jsonErrorDb } from "../../lib/safeError";
import { logger } from "../../lib/logger";
import { isFeatureEnabled } from "../../lib/features";
import {
  AudienceSpecSchema,
  BroadcastCreateSchema,
  ConnectionUpsertSchema,
  TemplateCreateSchema
} from "./types";
import { resolveAudience } from "./audienceResolver";
import { extractTemplateVariables } from "./variableResolver";
import { verifyMetaConnection } from "./metaCloudApi";
import { loadDoctorWhatsAppConnection, sendWhatsAppMessage, resolveWhatsAppSendConnection, isPlatformWhatsAppConfigured, getPlatformWhatsAppDisplayPhone } from "./sendMessage";
import { createWhatsAppBroadcast } from "./broadcastService";
import { encryptAccessToken } from "./credentialVault";
import { handleMetaWebhook, verifyMetaWebhook, verifyMetaWebhookSignature, shouldRequireMetaWebhookSignature } from "./webhookHandler";
import { rateLimitMiddleware } from "../../lib/rateLimit";
import { doctorRateLimit } from "../../lib/rateLimit";
import { completeEmbeddedSignup, getEmbeddedSignupPublicConfig } from "./metaEmbeddedSignup";
import { syncMetaTemplatesForDoctor } from "./metaTemplateSync";

const waConnectLimit = doctorRateLimit(
  "whatsapp_connect",
  Number(process.env.RATE_WHATSAPP_CONNECT_PER_MIN ?? "5")
);
const waBroadcastLimit = doctorRateLimit(
  "whatsapp_broadcast",
  Number(process.env.RATE_WHATSAPP_BROADCAST_PER_MIN ?? "10")
);
const waOAuthLimit = doctorRateLimit(
  "whatsapp_oauth",
  Number(process.env.RATE_WHATSAPP_OAUTH_PER_MIN ?? "10")
);
const waTemplateSyncLimit = doctorRateLimit(
  "whatsapp_template_sync",
  Number(process.env.RATE_WHATSAPP_TEMPLATE_SYNC_PER_MIN ?? "5")
);

const metaWebhookLimit = rateLimitMiddleware({
  keyPrefix: "meta_whatsapp_webhook",
  windowMs: 60_000,
  max: Number(process.env.RATE_META_WEBHOOK_PER_MIN ?? "120")
});

async function syncTemplatesAfterConnect(
  client: ReturnType<typeof getDb>,
  clinicId: string,
  doctorId: string
): Promise<void> {
  const r = await syncMetaTemplatesForDoctor({ client, clinicId, doctorId });
  if (!r.ok) {
    logger.warn("whatsapp_auto_template_sync_skipped", { error: r.error });
  }
}

function maskToken(token: string | null | undefined): string | null {
  if (!token?.trim()) return null;
  const t = token.trim();
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}••••${t.slice(-4)}`;
}

async function requireWhatsAppFeature(
  req: express.Request,
  res: express.Response,
  clinicId: string
): Promise<boolean> {
  const enabled = await isFeatureEnabled(clinicId, "whatsapp_integration");
  if (!enabled) {
    jsonError(res, 403, "WhatsApp Business is not enabled for this clinic plan.", {
      code: "FEATURE_DISABLED"
    });
    return false;
  }
  return true;
}

export function registerWhatsAppRoutes(app: express.Express): void {
  app.get(
    "/doctor/whatsapp/oauth/config",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      if (!(await requireWhatsAppFeature(req, res, clinicId))) return;
      const cfg = getEmbeddedSignupPublicConfig();
      jsonSuccess(res, 200, {
        enabled: cfg.enabled,
        appId: cfg.appId,
        configId: cfg.configId
      });
    }
  );

  app.post(
    "/doctor/whatsapp/oauth/exchange",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    waOAuthLimit,
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      if (!(await requireWhatsAppFeature(req, res, clinicId))) return;

      const parsed = z
        .object({
          code: z.string().min(1),
          wabaId: z.string().optional().nullable(),
          phoneNumberId: z.string().optional().nullable(),
          redirectUri: z.string().max(500).optional().nullable()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid OAuth payload", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }

      const completed = await completeEmbeddedSignup({
        code: parsed.data.code,
        wabaId: parsed.data.wabaId,
        phoneNumberId: parsed.data.phoneNumberId,
        redirectUri: parsed.data.redirectUri
      });
      if (!completed.ok) {
        jsonError(res, 400, completed.error, { code: "WHATSAPP_OAUTH_FAILED" });
        return;
      }

      const { assets } = completed;
      const verify = await verifyMetaConnection({
        phoneNumberId: assets.phoneNumberId,
        accessToken: assets.accessToken
      });
      if (!verify.ok) {
        jsonError(res, 400, verify.error ?? "Could not verify WhatsApp account", {
          code: "WHATSAPP_VERIFY_FAILED"
        });
        return;
      }

      const client = getDb(claims);
      const enc = encryptAccessToken(assets.accessToken);
      const payload = {
        clinic_id: clinicId,
        doctor_id: claims.userId,
        provider: "meta_cloud" as const,
        waba_id: assets.wabaId,
        phone_number_id: assets.phoneNumberId,
        display_phone: assets.displayPhone ?? verify.displayPhone ?? null,
        access_token: enc.legacyPlain,
        access_token_encrypted: enc.ciphertext,
        status: "connected",
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from("whatsapp_connections")
        .upsert(payload, { onConflict: "clinic_id,doctor_id" })
        .select("id,status,display_phone,verified_at,phone_number_id,waba_id")
        .maybeSingle();

      if (error) {
        jsonErrorDb(res, "whatsapp_oauth_upsert", error);
        return;
      }

      jsonSuccess(res, 200, {
        connected: true,
        status: "connected",
        displayPhone: (data as { display_phone?: string } | null)?.display_phone ?? payload.display_phone,
        phoneNumberId: assets.phoneNumberId,
        wabaId: assets.wabaId,
        verifiedAt: (data as { verified_at?: string } | null)?.verified_at
      });
      void syncTemplatesAfterConnect(client, clinicId, claims.userId);
    }
  );

  app.get(
    "/doctor/whatsapp/connection",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      if (!(await requireWhatsAppFeature(req, res, clinicId))) return;

      const client = getDb(claims);
      const row = await loadDoctorWhatsAppConnection(client, clinicId, claims.userId);
      if (row?.status === "connected") {
        jsonSuccess(res, 200, {
          status: row.status,
          connected: true,
          senderSource: "doctor",
          provider: row.provider,
          wabaId: row.waba_id,
          phoneNumberId: row.phone_number_id,
          displayPhone: row.display_phone,
          accessTokenMasked: maskToken(row.access_token),
          verifiedAt: row.verified_at,
          qualityRating: row.quality_rating,
          platformFallbackAvailable: isPlatformWhatsAppConfigured()
        });
        return;
      }

      const { connection, sender } = resolveWhatsAppSendConnection(row);
      if (sender === "platform" && connection) {
        jsonSuccess(res, 200, {
          status: "platform_fallback",
          connected: true,
          senderSource: "platform",
          provider: "meta_cloud",
          displayPhone: connection.display_phone ?? getPlatformWhatsAppDisplayPhone(),
          ownConnectionConnected: false,
          platformFallbackAvailable: true,
          message:
            "Patient notifications are sent from the GlowHomeo platform WhatsApp number. Connect your own WhatsApp Business in Settings to send from your clinic number."
        });
        return;
      }

      jsonSuccess(res, 200, {
        status: "disconnected",
        connected: false,
        senderSource: null,
        platformFallbackAvailable: isPlatformWhatsAppConfigured()
      });
    }
  );

  app.post(
    "/doctor/whatsapp/connection",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    waConnectLimit,
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      if (!(await requireWhatsAppFeature(req, res, clinicId))) return;

      const parsed = ConnectionUpsertSchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid connection payload", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      const body = parsed.data;
      if (!body.phoneNumberId?.trim() || !body.accessToken?.trim()) {
        jsonError(res, 400, "Phone number ID and access token are required.", { code: "VALIDATION_ERROR" });
        return;
      }

      const verify = await verifyMetaConnection({
        phoneNumberId: body.phoneNumberId.trim(),
        accessToken: body.accessToken.trim()
      });
      if (!verify.ok) {
        jsonError(res, 400, verify.error ?? "Could not verify WhatsApp credentials", {
          code: "WHATSAPP_VERIFY_FAILED"
        });
        return;
      }

      const client = getDb(claims);
      const enc = encryptAccessToken(body.accessToken.trim());
      const payload = {
        clinic_id: clinicId,
        doctor_id: claims.userId,
        provider: body.provider,
        waba_id: body.wabaId?.trim() ?? null,
        phone_number_id: body.phoneNumberId.trim(),
        display_phone: body.displayPhone?.trim() ?? verify.displayPhone ?? null,
        access_token: enc.legacyPlain,
        access_token_encrypted: enc.ciphertext,
        status: "connected",
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from("whatsapp_connections")
        .upsert(payload, { onConflict: "clinic_id,doctor_id" })
        .select("id,status,display_phone,verified_at")
        .maybeSingle();

      if (error) {
        jsonErrorDb(res, "whatsapp_connection_upsert", error);
        return;
      }
      jsonSuccess(res, 200, {
        connected: true,
        status: "connected",
        displayPhone: (data as { display_phone?: string } | null)?.display_phone ?? payload.display_phone,
        verifiedAt: (data as { verified_at?: string } | null)?.verified_at
      });
      void syncTemplatesAfterConnect(client, clinicId, claims.userId);
    }
  );

  app.post(
    "/doctor/whatsapp/connection/verify",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      if (!(await requireWhatsAppFeature(req, res, clinicId))) return;

      const testPhone = z.string().min(8).max(20).safeParse(req.body?.testPhone);
      if (!testPhone.success) {
        jsonError(res, 400, "Provide testPhone (E.164 or Indian mobile).", { code: "VALIDATION_ERROR" });
        return;
      }

      const client = getDb(claims);
      const doctorConn = await loadDoctorWhatsAppConnection(client, clinicId, claims.userId);
      const { connection: conn, sender } = resolveWhatsAppSendConnection(doctorConn);
      if (!conn) {
        jsonError(res, 400, "Connect WhatsApp Business or configure the GlowHomeo platform sender.", {
          code: "NOT_CONNECTED"
        });
        return;
      }

      const result = await sendWhatsAppMessage({
        connection: doctorConn,
        toPhone: testPhone.data,
        body:
          sender === "platform"
            ? "GlowHomeo Assist: platform WhatsApp is active. Patient notifications will reach you from this number until you connect your own WhatsApp Business."
            : "GlowHomeo Assist: your WhatsApp Business connection is verified. You can send patient broadcasts from Settings → Messages."
      });

      if (!result.ok) {
        jsonError(res, 502, result.error ?? "Test message failed", { code: "SEND_FAILED" });
        return;
      }
      jsonSuccess(res, 200, { sent: true, provider: result.provider });
    }
  );

  app.delete(
    "/doctor/whatsapp/connection",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const client = getDb(claims);
      await client
        .from("whatsapp_connections")
        .delete()
        .eq("clinic_id", clinicId)
        .eq("doctor_id", claims.userId);
      jsonSuccess(res, 200, { disconnected: true });
    }
  );

  app.get(
    "/doctor/whatsapp/templates",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const client = getDb(claims);
      const { data, error } = await client
        .from("whatsapp_templates")
        .select("id,name,meta_template_name,language_code,category,body,variables,status,created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) {
        jsonErrorDb(res, "whatsapp_templates_list", error);
        return;
      }
      jsonSuccess(res, 200, data ?? []);
    }
  );

  app.post(
    "/doctor/whatsapp/templates",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const parsed = TemplateCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid template", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }
      const vars = extractTemplateVariables(parsed.data.body);
      const client = getDb(claims);
      const { data, error } = await client
        .from("whatsapp_templates")
        .insert({
          clinic_id: clinicId,
          doctor_id: claims.userId,
          name: parsed.data.name,
          meta_template_name: parsed.data.metaTemplateName ?? null,
          language_code: parsed.data.languageCode,
          category: parsed.data.category,
          body: parsed.data.body,
          variables: vars,
          status: parsed.data.status
        })
        .select("id,name,status")
        .maybeSingle();
      if (error) {
        jsonErrorDb(res, "whatsapp_template_create", error);
        return;
      }
      jsonSuccess(res, 201, data);
    }
  );

  app.post(
    "/doctor/whatsapp/templates/sync",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    waTemplateSyncLimit,
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      if (!(await requireWhatsAppFeature(req, res, clinicId))) return;

      const client = getDb(claims);
      const synced = await syncMetaTemplatesForDoctor({
        client,
        clinicId,
        doctorId: claims.userId
      });
      if (!synced.ok) {
        jsonError(res, 400, synced.error, { code: "TEMPLATE_SYNC_FAILED" });
        return;
      }
      jsonSuccess(res, 200, synced.result);
    }
  );

  app.post(
    "/doctor/whatsapp/audience/preview",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const parsed = AudienceSpecSchema.safeParse(req.body?.audience ?? req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid audience", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }

      const client = getDb(claims);
      const { patients, skippedNoPhone } = await resolveAudience(client, clinicId, parsed.data);
      jsonSuccess(res, 200, {
        recipientCount: patients.length,
        skippedNoPhone,
        sample: patients.slice(0, 5).map((p) => ({ id: p.id, name: p.name, phone: p.phone }))
      });
    }
  );

  app.post(
    "/doctor/whatsapp/broadcasts",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    waBroadcastLimit,
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      if (!(await requireWhatsAppFeature(req, res, clinicId))) return;

      const parsed = BroadcastCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid broadcast", {
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        });
        return;
      }

      const client = getDb(claims);
      const doctorConn = await loadDoctorWhatsAppConnection(client, clinicId, claims.userId);
      const { connection: sendConn } = resolveWhatsAppSendConnection(doctorConn);
      if (!sendConn) {
        jsonError(res, 400, "Connect WhatsApp Business or enable the GlowHomeo platform sender.", {
          code: "NOT_CONNECTED"
        });
        return;
      }

      const [{ data: profile }, { data: clinic }] = await Promise.all([
        client.from("profiles").select("full_name").eq("id", claims.userId).maybeSingle(),
        client.from("clinics").select("name").eq("id", clinicId).maybeSingle()
      ]);

      const result = await createWhatsAppBroadcast({
        client,
        admin: supabaseAdmin,
        clinicId,
        doctorId: claims.userId,
        doctorName: (profile as { full_name?: string } | null)?.full_name ?? "Doctor",
        clinicName: (clinic as { name?: string } | null)?.name ?? "Clinic",
        templateId: parsed.data.templateId,
        body: parsed.data.body,
        audience: parsed.data.audience,
        scheduledAt: parsed.data.scheduledAt
      });

      jsonSuccess(res, 201, result);
    }
  );

  app.get(
    "/doctor/whatsapp/broadcasts/:id",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid broadcast id", { code: "VALIDATION_ERROR" });
        return;
      }

      const client = getDb(claims);
      const { data: broadcast, error: bErr } = await client
        .from("whatsapp_broadcasts")
        .select("*")
        .eq("id", idParse.data)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (bErr) {
        jsonErrorDb(res, "whatsapp_broadcast_get", bErr);
        return;
      }
      if (!broadcast) {
        jsonError(res, 404, "Broadcast not found", { code: "NOT_FOUND" });
        return;
      }

      const { data: deliveries } = await client
        .from("whatsapp_broadcast_deliveries")
        .select("id,patient_id,phone,status,last_error,sent_at,delivered_at")
        .eq("broadcast_id", idParse.data)
        .order("created_at", { ascending: true })
        .limit(100);

      jsonSuccess(res, 200, { broadcast, deliveries: deliveries ?? [] });
    }
  );

  /** Meta webhook verification (GET) and event delivery (POST). */
  app.get("/webhooks/meta/whatsapp", (req, res) => {
    const challenge = verifyMetaWebhook(
      req.query["hub.mode"] as string | undefined,
      req.query["hub.verify_token"] as string | undefined,
      req.query["hub.challenge"] as string | undefined
    );
    if (challenge) {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  });

  app.post("/webhooks/meta/whatsapp", metaWebhookLimit, async (req, res) => {
    const rawBody = (req as express.Request & { rawBody?: string }).rawBody ?? "";
    const signature = req.headers["x-hub-signature-256"] as string | undefined;

    if (shouldRequireMetaWebhookSignature()) {
      if (!verifyMetaWebhookSignature(rawBody, signature)) {
        logger.warn("meta_webhook_signature_rejected");
        res.sendStatus(403);
        return;
      }
    } else if (process.env.META_APP_SECRET?.trim() && rawBody) {
      if (!verifyMetaWebhookSignature(rawBody, signature)) {
        logger.warn("meta_webhook_signature_invalid_dev");
        res.sendStatus(403);
        return;
      }
    }

    try {
      const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : (req.body ?? {});
      await handleMetaWebhook(supabaseAdmin, body);
      res.sendStatus(200);
    } catch (e) {
      logger.warn("meta_webhook_handler_failed", {
        message: e instanceof Error ? e.message : String(e)
      });
      res.sendStatus(500);
    }
  });
}
