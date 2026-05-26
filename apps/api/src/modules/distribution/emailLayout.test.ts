import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildTransactionalEmail,
  isValidEmailAddress,
  normalizeEmailAddress,
  notificationMockSendEnabled
} from "./emailLayout";

describe("isValidEmailAddress", () => {
  it("accepts standard addresses", () => {
    expect(isValidEmailAddress("patient@example.com")).toBe(true);
    expect(isValidEmailAddress("  Patient@Example.COM  ")).toBe(true);
  });

  it("rejects invalid addresses", () => {
    expect(isValidEmailAddress("not-an-email")).toBe(false);
    expect(isValidEmailAddress("")).toBe(false);
  });
});

describe("normalizeEmailAddress", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmailAddress("  Foo@Bar.com ")).toBe("foo@bar.com");
  });
});

describe("buildTransactionalEmail", () => {
  it("includes branded layout, CTA, and compliance footer", () => {
    const { html, text } = buildTransactionalEmail({
      title: "Test title",
      bodyHtml: "<p>Body</p>",
      bodyText: "Body",
      clinicName: "Demo Clinic",
      ctaLabel: "Open link",
      ctaUrl: "https://example.com/join"
    });

    expect(html).toContain("Demo Clinic");
    expect(html).toContain("Test title");
    expect(html).toContain("https://example.com/join");
    expect(html).toContain("do not reply");
    expect(text).toContain("Open link: https://example.com/join");
  });
});

describe("notificationMockSendEnabled", () => {
  const prev = process.env.NOTIFICATION_MOCK_SEND;

  afterEach(() => {
    if (prev === undefined) delete process.env.NOTIFICATION_MOCK_SEND;
    else process.env.NOTIFICATION_MOCK_SEND = prev;
  });

  it("returns true when NOTIFICATION_MOCK_SEND=true", () => {
    process.env.NOTIFICATION_MOCK_SEND = "true";
    expect(notificationMockSendEnabled()).toBe(true);
  });

  it("returns false when unset", () => {
    delete process.env.NOTIFICATION_MOCK_SEND;
    expect(notificationMockSendEnabled()).toBe(false);
  });
});
