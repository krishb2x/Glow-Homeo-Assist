import { describe, expect, it } from "vitest";
import { blocksToAdviceCards, mergeBlockPayloads } from "./carePlanMappers";

describe("carePlanMappers", () => {
  it("merges list items from multiple payloads", () => {
    const merged = mergeBlockPayloads([
      { intro: "Drink water", items: [{ id: "1", text: "2L daily" }] },
      { items: [{ id: "2", text: "Herbal tea" }] }
    ]);
    expect(merged.intro).toBe("Drink water");
    expect(merged.items).toHaveLength(2);
  });

  it("maps diet blocks to advice cards", () => {
    const cards = blocksToAdviceCards(
      [
        {
          id: "b1",
          blockType: "diet",
          title: "Warm meals",
          payload: { items: [{ id: "i1", text: "Avoid cold drinks" }] }
        }
      ],
      "tpl-1"
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]!.category).toBe("diet");
    expect(cards[0]!.detail).toContain("Avoid cold drinks");
  });
});
