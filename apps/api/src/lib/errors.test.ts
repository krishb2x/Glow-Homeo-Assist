import { describe, expect, it } from "vitest";
import { AppError, isRetryableError } from "./errors";

describe("isRetryableError", () => {
  it("returns true for AppError with retryable flag", () => {
    const err = new AppError("busy", { retryable: true, statusCode: 503 });
    expect(isRetryableError(err)).toBe(true);
  });

  it("returns false for operational errors", () => {
    const err = new AppError("bad input", { retryable: false });
    expect(isRetryableError(err)).toBe(false);
  });

  it("returns false for unknown errors", () => {
    expect(isRetryableError(new Error("x"))).toBe(false);
  });
});
