import { describe, expect, it } from "vitest";
import { consultationStepHref, stepFromQuery, stepToQuery } from "./consultation-step-url";

describe("consultation-step-url", () => {
  it("maps query to primary steps", () => {
    expect(stepFromQuery("notes")).toBe("notes");
    expect(stepFromQuery("ai")).toBe("notes");
    expect(stepFromQuery("bogus")).toBe("patient");
    expect(stepFromQuery(null)).toBe("patient");
  });

  it("builds hrefs", () => {
    expect(consultationStepHref("abc", "prescription")).toBe("/consultation/abc?step=prescription");
    expect(stepToQuery("ai")).toBe("notes");
  });
});
