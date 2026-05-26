import { afterEach, describe, expect, it } from "vitest";
import {
  getPlatformWhatsAppConnection,
  isPlatformWhatsAppConfigured,
  resolveWhatsAppSendConnection
} from "./platformWhatsApp";
import type { WhatsAppConnectionRow } from "./types";

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
    enabled: process.env.PLATFORM_WHATSAPP_ENABLED,
    phoneId: process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN
  };

  afterEach(() => {
    if (prev.enabled === undefined) delete process.env.PLATFORM_WHATSAPP_ENABLED;
    else process.env.PLATFORM_WHATSAPP_ENABLED = prev.enabled;
    if (prev.phoneId === undefined) delete process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID;
    else process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = prev.phoneId;
    if (prev.token === undefined) delete process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN;
    else process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN = prev.token;
  });

  it("is true when phone id and token are set", () => {
    process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = "999";
    process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN = "secret";
    expect(isPlatformWhatsAppConfigured()).toBe(true);
  });

  it("is false when explicitly disabled", () => {
    process.env.PLATFORM_WHATSAPP_ENABLED = "false";
    process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = "999";
    process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN = "secret";
    expect(isPlatformWhatsAppConfigured()).toBe(false);
  });
});

describe("resolveWhatsAppSendConnection", () => {
  const prev = {
    phoneId: process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN
  };

  afterEach(() => {
    if (prev.phoneId === undefined) delete process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID;
    else process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = prev.phoneId;
    if (prev.token === undefined) delete process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN;
    else process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN = prev.token;
  });

  it("prefers doctor connection when connected", () => {
    const resolved = resolveWhatsAppSendConnection(doctorConn);
    expect(resolved.sender).toBe("doctor");
    expect(resolved.connection?.phone_number_id).toBe("123");
  });

  it("falls back to platform when doctor is disconnected", () => {
    process.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID = "platform-phone";
    process.env.PLATFORM_WHATSAPP_ACCESS_TOKEN = "platform-token";

    const resolved = resolveWhatsAppSendConnection(null);
    expect(resolved.sender).toBe("platform");
    expect(resolved.connection?.phone_number_id).toBe("platform-phone");
    expect(getPlatformWhatsAppConnection()?.display_phone).toBeTruthy();
  });
});
