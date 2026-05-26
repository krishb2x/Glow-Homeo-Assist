import { isDailyConfigured } from "../modules/telemedicine/daily/dailyRoomConfig";
import { logger } from "./logger";
import { getIntegrationHealth, integrationHealthOk } from "./integrationConfig";
import { loadMonorepoEnv } from "./loadMonorepoEnv";

/** Fail fast in production when telemedicine / public URLs are misconfigured. */
export function assertProductionEnvironment(): void {
  const envLoad = loadMonorepoEnv();
  if (envLoad.path) {
    logger.info("env_loaded", { path: envLoad.path, keysApplied: envLoad.count });
  } else {
    logger.warn("env_file_not_found", { hint: "Create .env at monorepo root" });
  }

  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const checks = getIntegrationHealth();
    const warnings = Object.entries(checks)
      .filter(([, c]) => !c.ok)
      .map(([k, c]) => `${k}: ${c.detail}`);
    if (warnings.length > 0) {
      logger.warn("dev_integration_gaps", { count: warnings.length, warnings: warnings.slice(0, 8) });
    }
    return;
  }

  const missing: string[] = [];
  const publicUrl = process.env.APP_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!publicUrl) missing.push("APP_PUBLIC_URL");
  if (!process.env.JWT_SECRET?.trim()) missing.push("JWT_SECRET");
  if (process.env.JWT_SECRET === "dev-local-change-me-before-production") missing.push("JWT_SECRET(weak)");
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) missing.push("JWT_SECRET(too_short)");
  if (!process.env.CORS_ORIGIN?.trim()) missing.push("CORS_ORIGIN");

  const telemedicineEnabled = process.env.REQUIRE_DAILY_IN_PROD !== "0";
  if (telemedicineEnabled) {
    if (!process.env.DAILY_API_KEY?.trim()) missing.push("DAILY_API_KEY");
    if (!process.env.DAILY_DOMAIN?.trim()) missing.push("DAILY_DOMAIN");
    if (!process.env.DAILY_WEBHOOK_SECRET?.trim()) missing.push("DAILY_WEBHOOK_SECRET");
    if (!isDailyConfigured()) missing.push("DAILY_API_KEY+DAILY_DOMAIN");
  }

  if (!process.env.META_APP_SECRET?.trim()) missing.push("META_APP_SECRET");
  if (!process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()) missing.push("META_WEBHOOK_VERIFY_TOKEN");
  if (!process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim()) missing.push("WHATSAPP_TOKEN_ENCRYPTION_KEY");

  if (process.env.NOTIFICATION_MOCK_SEND === "true") {
    missing.push("NOTIFICATION_MOCK_SEND(must_be_false_in_prod)");
  }

  if (process.env.NOTIFICATION_MOCK_SEND !== "true") {
    if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
    if (!process.env.NOTIFICATION_FROM_EMAIL?.trim()) missing.push("NOTIFICATION_FROM_EMAIL");
  }

  const requirePlatformWa = process.env.REQUIRE_PLATFORM_WHATSAPP_IN_PROD === "1";
  if (requirePlatformWa && !process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID?.trim()) {
    missing.push("PLATFORM_WHATSAPP_PHONE_NUMBER_ID");
  }
  if (requirePlatformWa && !process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN?.trim()) {
    missing.push("PLATFORM_WHATSAPP_ACCESS_TOKEN");
  }

  if (process.env.REQUIRE_S3_IN_PROD === "1" && !process.env.AWS_S3_PRIVATE_BUCKET?.trim()) {
    missing.push("AWS_S3_PRIVATE_BUCKET");
  }

  if (missing.length > 0) {
    throw new Error(
      `Production environment incomplete. Set required variables: ${missing.join(", ")}. See docs/PRODUCTION_ROLLOUT.md`
    );
  }

  if (!integrationHealthOk()) {
    throw new Error("Production integration health check failed. See GET /health/deep");
  }

  logger.info("production_environment_validated", { publicUrl, telemedicineEnabled });
}
