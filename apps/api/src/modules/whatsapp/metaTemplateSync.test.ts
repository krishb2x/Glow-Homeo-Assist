import { describe, expect, it } from "vitest";

function extractBodyText(components: Array<{ type?: string; text?: string }> | undefined): string {
  if (!components?.length) return "";
  const body = components.find((c) => c.type === "BODY");
  return body?.text?.trim() ?? "";
}

function metaNumberedVariables(body: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*(\d+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m[1]) found.add(`param_${m[1]}`);
  }
  return [...found];
}

describe("metaTemplateSync helpers", () => {
  it("extracts BODY component text", () => {
    expect(
      extractBodyText([
        { type: "HEADER", text: "Hi" },
        { type: "BODY", text: "Hello {{1}}, visit {{2}}." }
      ])
    ).toBe("Hello {{1}}, visit {{2}}.");
  });

  it("parses Meta numbered variables", () => {
    expect(metaNumberedVariables("Reminder {{1}} for {{2}}")).toEqual(["param_1", "param_2"]);
  });
});
