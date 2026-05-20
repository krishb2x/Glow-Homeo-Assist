import { describe, expect, it } from "vitest";
import {
  AUTH_BACK_HOME_HREF,
  AUTH_BACK_HOME_LABEL,
  AUTH_FOOTER_LINKS,
  AUTH_PANEL_HIGHLIGHTS,
  authFooterYear
} from "./auth-shell-config";

describe("AUTH_BACK_HOME", () => {
  it("points back to the marketing home", () => {
    expect(AUTH_BACK_HOME_HREF).toBe("/");
  });

  it("uses a clear human label", () => {
    expect(AUTH_BACK_HOME_LABEL.toLowerCase()).toContain("home");
  });
});

describe("AUTH_FOOTER_LINKS", () => {
  it("includes privacy, terms, and a contact channel", () => {
    const hrefs = AUTH_FOOTER_LINKS.map((l) => l.href);
    expect(hrefs).toContain("/privacy");
    expect(hrefs).toContain("/terms");
    expect(hrefs.some((h) => h.startsWith("mailto:"))).toBe(true);
  });

  it("every link has a non-empty label and href", () => {
    for (const l of AUTH_FOOTER_LINKS) {
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.href.length).toBeGreaterThan(0);
    }
  });

  it("internal links start with /", () => {
    for (const l of AUTH_FOOTER_LINKS) {
      if (l.href.startsWith("mailto:")) continue;
      expect(l.href.startsWith("/")).toBe(true);
    }
  });
});

describe("AUTH_PANEL_HIGHLIGHTS", () => {
  it("returns a non-empty list of clinical highlights", () => {
    expect(AUTH_PANEL_HIGHLIGHTS.length).toBeGreaterThanOrEqual(3);
    for (const h of AUTH_PANEL_HIGHLIGHTS) {
      expect(typeof h).toBe("string");
      expect(h.length).toBeGreaterThan(8);
    }
  });
});

describe("authFooterYear", () => {
  it("returns the year of the current date by default", () => {
    expect(authFooterYear()).toBe(new Date().getFullYear());
  });

  it("returns the year of an injected date", () => {
    expect(authFooterYear(new Date("2030-06-15T10:00:00Z"))).toBe(2030);
  });
});
