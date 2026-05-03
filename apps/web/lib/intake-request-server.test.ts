import { afterEach, describe, expect, it, vi } from "vitest";
import {
  backendBaseFromEnv,
  buildMarketingLeadPayload,
  forwardToMarketingLead,
  parseIntakeBody
} from "./intake-request-server";

const valid = {
  intent: "walkthrough",
  name: "Dr. Jane Smith",
  email: "jane@clinic.example",
  phone: "+1 (555) 123-4567",
  city: "Mumbai",
  practice: "Verdant Clinic"
};

describe("parseIntakeBody", () => {
  it("accepts walkthrough with normalized email", () => {
    const r = parseIntakeBody({ ...valid, email: "Jane@Clinic.EXAMPLE" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intent).toBe("walkthrough");
      expect(r.email).toBe("jane@clinic.example");
      expect(r.practice).toBe("Verdant Clinic");
    }
  });

  it("accepts trial intent", () => {
    const r = parseIntakeBody({ ...valid, intent: "trial" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.intent).toBe("trial");
  });

  it("accepts missing practice", () => {
    const { practice: _p, ...rest } = valid;
    const r = parseIntakeBody(rest);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.practice).toBe(null);
  });

  it("treats null practice as empty", () => {
    const r = parseIntakeBody({ ...valid, practice: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.practice).toBe(null);
  });

  it("rejects invalid intent", () => {
    const r = parseIntakeBody({ ...valid, intent: "other" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.error).toMatch(/intent/i);
    }
  });

  it("rejects short phone", () => {
    const r = parseIntakeBody({ ...valid, phone: "12345" });
    expect(r.ok).toBe(false);
  });

  it("accepts 10-digit phone", () => {
    const r = parseIntakeBody({ ...valid, phone: "5551234567" });
    expect(r.ok).toBe(true);
  });

  it("rejects practice longer than 200 chars", () => {
    const r = parseIntakeBody({ ...valid, practice: "x".repeat(201) });
    expect(r.ok).toBe(false);
  });
});

describe("buildMarketingLeadPayload", () => {
  it("maps walkthrough to clinic label and optional practice message", () => {
    const p = parseIntakeBody(valid);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const out = buildMarketingLeadPayload(p);
    expect(out.clinicName).toBe("GlowHomeo Assist — 20-minute walkthrough");
    expect(out.intent).toBe("walkthrough");
    expect(out.message).toContain("Practice: Verdant Clinic");
  });

  it("maps trial to clinic label", () => {
    const p = parseIntakeBody({ ...valid, intent: "trial" });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const out = buildMarketingLeadPayload(p);
    expect(out.clinicName).toBe("GlowHomeo Assist — 90-day guided trial");
    expect(out.intent).toBe("trial");
  });

  it("uses null message when no practice", () => {
    const { practice: _p, ...rest } = valid;
    const p = parseIntakeBody(rest);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const out = buildMarketingLeadPayload(p);
    expect(out.message).toBeNull();
  });

  it("accepts practice at max length", () => {
    const p = parseIntakeBody({ ...valid, practice: "x".repeat(200) });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const out = buildMarketingLeadPayload(p);
    expect(out.message?.length).toBeLessThanOrEqual(2000);
    expect(out.message).toContain("Practice:");
  });
});

describe("forwardToMarketingLead (mock fetch)", () => {
  it("returns ok when API returns 201 with success envelope", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ success: true, data: { id: "uuid" } })
    });
    const result = await forwardToMarketingLead(
      {
        name: "x",
        email: "a@b.co",
        phone: "5551234567",
        clinicName: "GlowHomeo Assist — 20-minute walkthrough",
        city: "c",
        message: "m",
        intent: "walkthrough"
      },
      { baseUrl: "https://api.example.com", fetchFn }
    );
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.com/public/marketing-lead",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("forwards API error body", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ success: false, error: "Too many requests" })
    });
    const result = await forwardToMarketingLead(
      {
        name: "x",
        email: "a@b.co",
        phone: "5551234567",
        clinicName: "c",
        city: "c",
        message: "m",
        intent: "walkthrough"
      },
      { baseUrl: "http://localhost:4000", fetchFn }
    );
    expect(result).toEqual({ ok: false, status: 429, error: "Too many requests" });
  });

  it("rejects 200 body without success flag", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({})
    });
    const result = await forwardToMarketingLead(
      {
        name: "x",
        email: "a@b.co",
        phone: "5551234567",
        clinicName: "c",
        city: "c",
        message: "m",
        intent: "walkthrough"
      },
      { fetchFn }
    );
    expect(result).toEqual({ ok: false, status: 502, error: "Unexpected response from server." });
  });
});

describe("backendBaseFromEnv", () => {
  const saved = {
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  };

  afterEach(() => {
    if (saved.API_URL === undefined) delete process.env.API_URL;
    else process.env.API_URL = saved.API_URL;
    if (saved.NEXT_PUBLIC_API_URL === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = saved.NEXT_PUBLIC_API_URL;
  });

  it("defaults to localhost when env unset", () => {
    delete process.env.API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(backendBaseFromEnv()).toBe("http://127.0.0.1:4000");
  });
});
