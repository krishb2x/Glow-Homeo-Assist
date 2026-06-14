import { isDailyConfigured } from "../modules/telemedicine/daily/dailyRoomConfig";
import { isPlatformWhatsAppConfigured, getPlatformWhatsAppDisplayPhone } from "../modules/whatsapp/platformWhatsApp";
import { isS3Configured } from "../s3";

export type IntegrationCheck = {
  ok: boolean;
  detail: string;
  required?: boolean;
};

function set(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function getIntegrationHealth(): Record<string, IntegrationCheck> {
  const isProd = process.env.NODE_ENV === "production";
  const mockSend = process.env.NOTIFICATION_MOCK_SEND === "true";

  return {
    envFile: {
      ok: set("SUPABASE_URL"),
      detail: set("SUPABASE_URL") ? "supabase vars loaded" : "SUPABASE_URL missing"
    },
    daily: {
      ok: isDailyConfigured(),
      required: isProd,
      detail: isDailyConfigured()
        ? `domain=${process.env.DAILY_DOMAIN?.trim()}`
        : "Set DAILY_API_KEY and DAILY_DOMAIN"
    },
    dailyWebhook: {
      ok: set("DAILY_WEBHOOK_SECRET"),
      required: isProd,
      detail: set("DAILY_WEBHOOK_SECRET") ? "secret set" : "DAILY_WEBHOOK_SECRET missing"
    },
    meta: {
      ok: set("META_APP_ID") && set("META_APP_SECRET"),
      required: isProd,
      detail:
        set("META_APP_ID") && set("META_APP_SECRET")
          ? "app id + secret set"
          : "META_APP_ID or META_APP_SECRET missing"
    },
    metaWebhook: {
      ok: set("META_WEBHOOK_VERIFY_TOKEN"),
      required: isProd,
      detail: set("META_WEBHOOK_VERIFY_TOKEN") ? "verify token set" : "META_WEBHOOK_VERIFY_TOKEN missing"
    },
    metaEmbeddedSignup: {
      ok: set("META_EMBEDDED_SIGNUP_CONFIG_ID"),
      required: false,
      detail: set("META_EMBEDDED_SIGNUP_CONFIG_ID")
        ? "embedded signup configured"
        : "META_EMBEDDED_SIGNUP_CONFIG_ID empty — doctor WhatsApp OAuth disabled"
    },
    whatsappEncryption: {
      ok: set("WHATSAPP_TOKEN_ENCRYPTION_KEY"),
      required: isProd,
      detail: set("WHATSAPP_TOKEN_ENCRYPTION_KEY") ? "encryption key set" : "WHATSAPP_TOKEN_ENCRYPTION_KEY missing"
    },
    emailDelivery: {
      ok: (set("SMTP_HOST") && set("SMTP_USER") && set("SMTP_PASSWORD")) || set("RESEND_API_KEY") || mockSend || !isProd,
      required: isProd && !mockSend,
      detail: mockSend
        ? "NOTIFICATION_MOCK_SEND=true — outbound email suppressed"
        : (set("SMTP_HOST") && set("SMTP_USER") && set("SMTP_PASSWORD"))
          ? "SMTP configured"
          : set("RESEND_API_KEY")
            ? "Resend API configured"
            : "Neither SMTP nor RESEND_API_KEY is configured"
    },
    s3: {
      ok: isS3Configured() || !isProd,
      required: isProd && process.env.REQUIRE_S3_IN_PROD === "1",
      detail: isS3Configured()
        ? "configured"
        : process.env.REQUIRE_S3_IN_PROD === "1"
          ? "AWS_S3_* required but not set"
          : "AWS_S3_* not set — PDF storage disabled (portal links still work)"
    },
    platformWhatsApp: {
      ok: isPlatformWhatsAppConfigured() || !isProd,
      required: isProd && process.env.REQUIRE_PLATFORM_WHATSAPP_IN_PROD === "1",
      detail: isPlatformWhatsAppConfigured()
        ? `GlowHomeo platform sender: ${getPlatformWhatsAppDisplayPhone()}`
        : "PLATFORM_WHATSAPP_* not set — doctors must connect own WhatsApp or configure Twilio fallback"
    },
    twilioFallback: {
      ok: set("TWILIO_ACCOUNT_SID") && set("TWILIO_AUTH_TOKEN") && set("TWILIO_WHATSAPP_FROM"),
      required: false,
      detail:
        set("TWILIO_ACCOUNT_SID") && set("TWILIO_WHATSAPP_FROM")
          ? "Twilio fallback available"
          : "Twilio not configured — uses doctor Meta or mock"
    },
    notifications: {
      ok: true,
      detail: mockSend ? "NOTIFICATION_MOCK_SEND=true (no real sends)" : "live send mode"
    },
    jwt: {
      ok: isProd
        ? Boolean(process.env.JWT_SECRET?.trim()) &&
          process.env.JWT_SECRET !== "dev-local-change-me-before-production" &&
          (process.env.JWT_SECRET?.length ?? 0) >= 32
        : true,
      required: isProd,
      detail:
        process.env.JWT_SECRET === "dev-local-change-me-before-production"
          ? "dev placeholder — replace before production"
          : set("JWT_SECRET")
            ? "set"
            : "JWT_SECRET missing"
    },
    publicUrl: {
      ok: Boolean(process.env.APP_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()),
      required: isProd,
      detail: process.env.APP_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "missing"
    },
    cors: {
      ok: set("CORS_ORIGIN") || !isProd,
      required: isProd,
      detail: set("CORS_ORIGIN") ? process.env.CORS_ORIGIN!.trim() : "CORS_ORIGIN missing"
    }
  };
}

export function integrationHealthOk(): boolean {
  const checks = getIntegrationHealth();
  return Object.values(checks).every((c) => !c.required || c.ok);
}
