import { describe, expect, it } from "vitest";
import {
  MARKETING_FOOTER_LEGAL,
  MARKETING_FOOTER_PRODUCT,
  MARKETING_PRIMARY_NAV,
  resolveLoginHref
} from "./marketing-nav";

describe("MARKETING_PRIMARY_NAV", () => {
  it("includes Pricing, Features, Security, and FAQ entries", () => {
    const labels = MARKETING_PRIMARY_NAV.map((i) => i.label.toLowerCase());
    expect(labels).toContain("features");
    expect(labels).toContain("pricing");
    expect(labels).toContain("security");
    expect(labels).toContain("faq");
  });

  it("every entry has an absolute or anchor href", () => {
    for (const item of MARKETING_PRIMARY_NAV) {
      expect(item.href.startsWith("/")).toBe(true);
    }
  });
});

describe("MARKETING_FOOTER_PRODUCT", () => {
  it("lists product pages including Pricing and Security", () => {
    const hrefs = MARKETING_FOOTER_PRODUCT.map((i) => i.href);
    expect(hrefs).toContain("/pricing");
    expect(hrefs).toContain("/security");
    expect(hrefs).toContain("/features");
  });
});

describe("MARKETING_FOOTER_LEGAL", () => {
  it("lists the required legal pages", () => {
    const hrefs = MARKETING_FOOTER_LEGAL.map((i) => i.href);
    expect(hrefs).toEqual(["/privacy", "/terms", "/cookies", "/refunds"]);
  });
});

describe("resolveLoginHref", () => {
  it("builds an absolute login URL when an app origin is given", () => {
    expect(resolveLoginHref("https://app.example.com")).toBe("https://app.example.com/login");
  });

  it("trims trailing slashes from the origin", () => {
    expect(resolveLoginHref("https://app.example.com///")).toBe("https://app.example.com/login");
  });

  it("returns a relative /login when no origin is provided", () => {
    expect(resolveLoginHref("")).toBe("/login");
  });

  it("appends a safe `next` parameter when provided", () => {
    const out = resolveLoginHref("https://app.example.com", { next: "/dashboard" });
    expect(out).toBe("https://app.example.com/login?next=%2Fdashboard");
  });

  it("ignores unsafe `next` values (protocol-relative, absolute URLs)", () => {
    expect(resolveLoginHref("https://app.example.com", { next: "//evil.com" })).toBe(
      "https://app.example.com/login"
    );
    expect(resolveLoginHref("https://app.example.com", { next: "https://evil.com" })).toBe(
      "https://app.example.com/login"
    );
  });

  it("ignores `next` values that do not start with `/`", () => {
    expect(resolveLoginHref("https://app.example.com", { next: "dashboard" })).toBe(
      "https://app.example.com/login"
    );
  });
});
