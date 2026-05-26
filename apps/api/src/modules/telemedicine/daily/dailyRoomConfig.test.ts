import { describe, expect, it } from "vitest";
import { dailyRoomPrefix, meetingTokenTtlSec, roomWindowUnix } from "./dailyRoomConfig";

describe("dailyRoomConfig", () => {
  it("uses default room prefix", () => {
    delete process.env.DAILY_ROOM_PREFIX;
    expect(dailyRoomPrefix()).toBe("GlowHomeo");
  });

  it("computes room window with nbf before exp", () => {
    const { nbf, exp } = roomWindowUnix({ scheduledFor: new Date(Date.now() + 3600000).toISOString() });
    expect(exp).toBeGreaterThan(nbf);
  });

  it("meeting token ttl defaults to 7200", () => {
    delete process.env.DAILY_MEETING_TOKEN_TTL_SEC;
    expect(meetingTokenTtlSec()).toBe(7200);
  });
});
