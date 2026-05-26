import { describe, expect, it } from "vitest";
import { parseEnvContent } from "./loadMonorepoEnv";

describe("parseEnvContent", () => {
  it("parses KEY=value lines", () => {
    const out = parseEnvContent("DAILY_API_KEY=abc123\nDAILY_DOMAIN=test.daily.co\n");
    expect(out.DAILY_API_KEY).toBe("abc123");
    expect(out.DAILY_DOMAIN).toBe("test.daily.co");
  });

  it("strips UTF-8 BOM", () => {
    const out = parseEnvContent("\uFEFFDAILY_API_KEY=bomkey\n");
    expect(out.DAILY_API_KEY).toBe("bomkey");
  });

  it("handles CRLF line endings", () => {
    const out = parseEnvContent("META_APP_ID=123\r\nMETA_APP_SECRET=secret\r\n");
    expect(out.META_APP_ID).toBe("123");
    expect(out.META_APP_SECRET).toBe("secret");
  });

  it("skips comments and blank lines", () => {
    const out = parseEnvContent("# comment\n\nJWT_SECRET=dev-local-change-me-before-production\n");
    expect(out.JWT_SECRET).toBe("dev-local-change-me-before-production");
    expect(Object.keys(out)).toHaveLength(1);
  });
});
