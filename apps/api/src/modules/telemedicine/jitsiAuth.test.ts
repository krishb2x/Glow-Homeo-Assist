import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isJitsiJwtEnabled, signJitsiRoomToken } from "./jitsiAuth";

describe("jitsiAuth", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("is disabled without secrets", () => {
    delete process.env.JITSI_APP_ID;
    delete process.env.JITSI_APP_SECRET;
    expect(isJitsiJwtEnabled()).toBe(false);
    expect(signJitsiRoomToken({ roomId: "r1", displayName: "Dr" })).toBeNull();
  });

  it("signs JWT when configured", () => {
    process.env.JITSI_APP_ID = "app";
    process.env.JITSI_APP_SECRET = "secret-secret-secret-secret";
    expect(isJitsiJwtEnabled()).toBe(true);
    const token = signJitsiRoomToken({
      roomId: "consult-abc",
      displayName: "Dr Test",
      moderator: true,
      expiresInSec: 3600
    });
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token!.split(".")).toHaveLength(3);
  });
});
