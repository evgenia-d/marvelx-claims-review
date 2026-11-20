import { describe, expect, it } from "vitest";
import { fieldPosition, positionLabel } from "./fieldPosition";

const ordered = ["a", "b", "c", "d"];
const only = (...ids: string[]) => (id: string) => ids.includes(id);

describe("fieldPosition", () => {
  it("counts within the fields the filter shows", () => {
    expect(fieldPosition(ordered, "c", only("b", "c", "d"))).toEqual({
      index: 1,
      total: 3,
      prev: "b",
      next: "d",
      inFilter: true,
    });
  });

  it("has no previous at the start and no next at the end (no wrap)", () => {
    expect(fieldPosition(ordered, "a", only("a", "b"))).toMatchObject({ prev: null, next: "b" });
    expect(fieldPosition(ordered, "b", only("a", "b"))).toMatchObject({ prev: "a", next: null });
  });

  it("falls back to the whole list when the open field is not shown by the filter", () => {
    expect(fieldPosition(ordered, "b", only("d"))).toEqual({
      index: 1,
      total: 4,
      prev: "a",
      next: "c",
      inFilter: false,
    });
  });

  it("returns null when the open field is not in the list at all", () => {
    expect(fieldPosition(ordered, "x", only("a"))).toBeNull();
  });
});

describe("positionLabel", () => {
  it("names the filter and the 1-based position", () => {
    const pos = fieldPosition(ordered, "c", only("b", "c", "d"));
    expect(pos && positionLabel(pos, "needs_you")).toBe("Needs you · 2 of 3");
  });

  it("says All when the field is outside the filter", () => {
    const pos = fieldPosition(ordered, "b", only("d"));
    expect(pos && positionLabel(pos, "needs_you")).toBe("All · 2 of 4");
  });
});
