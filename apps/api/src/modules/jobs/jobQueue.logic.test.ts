import { describe, expect, it } from "vitest";
import {
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  computeBackoffMs,
  isRetryableJobError,
  shouldDeadLetter,
  timelineHasMore
} from "./jobQueue.logic";

describe("computeBackoffMs", () => {
  it("uses exponential backoff capped at 1 hour", () => {
    expect(computeBackoffMs(1)).toBe(BASE_BACKOFF_MS);
    expect(computeBackoffMs(2)).toBe(BASE_BACKOFF_MS * 2);
    expect(computeBackoffMs(20)).toBe(MAX_BACKOFF_MS);
  });
});

describe("shouldDeadLetter", () => {
  it("dead-letters after max attempts", () => {
    expect(shouldDeadLetter(8, 8, "network")).toBe(true);
    expect(shouldDeadLetter(3, 8, "network")).toBe(false);
  });

  it("dead-letters non-retryable template errors immediately", () => {
    expect(shouldDeadLetter(1, 8, "invalid template name")).toBe(true);
    expect(shouldDeadLetter(1, 8, "patient not found")).toBe(true);
  });
});

describe("isRetryableJobError", () => {
  it("classifies retryable vs permanent failures", () => {
    expect(isRetryableJobError("timeout")).toBe(true);
    expect(isRetryableJobError("template missing")).toBe(false);
  });
});

describe("timelineHasMore", () => {
  it("paginates correctly", () => {
    expect(timelineHasMore(100, 0, 40)).toBe(true);
    expect(timelineHasMore(100, 60, 40)).toBe(false);
    expect(timelineHasMore(40, 0, 40)).toBe(false);
  });
});
