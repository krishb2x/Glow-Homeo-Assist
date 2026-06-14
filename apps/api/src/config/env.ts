import { z } from "zod";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from root if not already loaded
if (process.env.NODE_ENV !== "production" && !process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
}

// Helper to coerce string booleans ("true", "1") to actual boolean
const coerceBoolean = z.preprocess((val) => {
  if (typeof val === "string") {
    return val === "true" || val === "1";
  }
  return Boolean(val);
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  
  // Database / Supabase
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  
  // Auth
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required").default("dev-secret-key-change-in-production"),
  PATIENT_AUTH_PEPPER: z.string().optional(),
  
  // Security / Rate Limits
  TRUST_PROXY: coerceBoolean.default(false),
  RATE_PATIENT_SEARCH_PER_MIN: z.coerce.number().default(120),
  RATE_WHATSAPP_BROADCAST_PER_MIN: z.coerce.number().default(10),
  RATE_WHATSAPP_CONNECT_PER_MIN: z.coerce.number().default(5),
  RATE_WHATSAPP_TEMPLATE_SYNC_PER_MIN: z.coerce.number().default(5),
  RATE_PUBLIC_JOIN_PER_MIN: z.coerce.number().default(30),
  RATE_PUBLIC_RX_PER_MIN: z.coerce.number().default(20),
  LOGIN_MAX_ATTEMPTS_PER_15M: z.coerce.number().default(10),

  // URLs
  APP_PUBLIC_URL: z.string().url("APP_PUBLIC_URL must be a valid URL").optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL must be a valid URL").optional(),
  CORS_ORIGIN: z.string().optional(),
  
  // Platform WhatsApp (Global Fallback)
  PLATFORM_WHATSAPP_ENABLED: coerceBoolean.default(false),
  PLATFORM_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  PLATFORM_WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  PLATFORM_WHATSAPP_DISPLAY_PHONE: z.string().default("GlowHomeo Assist"),
  PLATFORM_WHATSAPP_WABA_ID: z.string().optional(),

  // AWS S3
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_PRIVATE_BUCKET: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  WORKER_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  NOTIFICATION_FROM_EMAIL: z.string().optional(),
  NOTIFICATION_REPLY_TO_EMAIL: z.string().optional(),
  SES_FROM_EMAIL: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // AI Scribe (Gemini)
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  SCRIBE_MAX_OUTPUT_TOKENS: z.coerce.number().default(2048),
  SCRIBE_DAILY_LIMIT_PER_CLINIC: z.coerce.number().default(200),

  // Dev Safety Bypass
  DEV_BYPASS_AUTH: coerceBoolean.default(false),
  DEV_BYPASS_BEARER: z.string().default("dev-bypass"),
  DEV_BYPASS_CLINIC_ID: z.string().uuid().default("11111111-1111-1111-1111-111111111101"),
  
  // Internal Test env flag
  VITEST: coerceBoolean.default(false),
});

// Parse the environment variables, throwing an error if validation fails
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

// In production, enforce that dev bypasses are NEVER enabled
if (parsedEnv.data.NODE_ENV === "production" && parsedEnv.data.DEV_BYPASS_AUTH) {
  console.error("❌ FATAL: DEV_BYPASS_AUTH is enabled in production! Aborting startup to prevent security breach.");
  process.exit(1);
}

// In production, enforce that JWT_SECRET is explicitly set (not the default)
if (
  parsedEnv.data.NODE_ENV === "production" && 
  parsedEnv.data.JWT_SECRET === "dev-secret-key-change-in-production"
) {
  console.error("❌ FATAL: JWT_SECRET must be explicitly set in production!");
  process.exit(1);
}

export const env = parsedEnv.data;
