import { afterEach, describe, expect, it } from "vitest";
import {
  getPlatformWhatsAppConnection,
  isPlatformWhatsAppConfigured,
  resolveWhatsAppSendConnection
} from "./platformWhatsApp";
import type { WhatsAppConnectionRow } from "./types";
import { env } from "../../config/env";

const doctorConn: WhatsAppConnectionRow = {
  id: "doc-1",
  clinic_id: "clinic-1",
  doctor_id: "doctor-1",
  provider: "meta_cloud",
  waba_id: "waba",
  phone_number_id: "123",
  display_phone: "+91 98765 43210",
  access_token: "token",
  status: "connected",
  verified_at: null,
  quality_rating: null
};

describe("isPlatformWhatsAppConfigured", () => {
  const prev = {
    enabled: env.PLATFORM_WHATSAPP_ENABLED,
    phoneId: env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID,
    token: env.PLATFORM_WHATSAPP_ACCESS_TOKEN
  };

  afterEach(() => {
    env.PLATFORM_WHATSAPP_ENABLED = prev.enabled;
    env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = prev.phoneId;
    env.PLATFORM_WHATSAPP_ACCESS_TOKEN = prev.token;
  });

  it("is true when phone id and token are set", () => {
    env.PLATFORM_WHATSAPP_ENABLED = true;
    env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = "999";
    env.PLATFORM_WHATSAPP_ACCESS_TOKEN = "secret";
    expect(isPlatformWhatsAppConfigured()).toBe(true);
  });

  it("is false when explicitly disabled", () => {
    env.PLATFORM_WHATSAPP_ENABLED = false;
    env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = "999";
    env.PLATFORM_WHATSAPP_ACCESS_TOKEN = "secret";
    expect(isPlatformWhatsAppConfigured()).toBe(false);
  });
});

describe("resolveWhatsAppSendConnection", () => {
  const prev = {
    enabled: env.PLATFORM_WHATSAPP_ENABLED,
    phoneId: env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID,
    token: env.PLATFORM_WHATSAPP_ACCESS_TOKEN
  };

  afterEach(() => {
    env.PLATFORM_WHATSAPP_ENABLED = prev.enabled;
    env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = prev.phoneId;
    env.PLATFORM_WHATSAPP_ACCESS_TOKEN = prev.token;
  });

  it("prefers doctor connection when connected", () => {
    const resolved = resolveWhatsAppSendConnection(doctorConn);
    expect(resolved.sender).toBe("doctor");
    expect(resolved.connection?.phone_number_id).toBe("123");
  });

  it("falls back to platform when doctor is disconnected", () => {
    env.PLATFORM_WHATSAPP_ENABLED = true;
    env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = "platform-phone";
    env.PLATFORM_WHATSAPP_ACCESS_TOKEN = "platform-token";

    const resolved = resolveWhatsAppSendConnection(null);
    expect(resolved.sender).toBe("platform");
    expect(resolved.connection?.phone_number_id).toBe("platform-phone");
    expect(getPlatformWhatsAppConnection()?.display_phone).toBeTruthy();
  });
});
