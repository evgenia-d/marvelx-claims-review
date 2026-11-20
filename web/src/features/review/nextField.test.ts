import { describe, expect, it } from "vitest";
import { nextFieldId } from "./nextField";

const ordered = ["a", "b", "c", "d"];
const only = (...ids: string[]) => (id: string) => ids.includes(id);

describe("nextFieldId", () => {
  it("picks the next candidate below the current field", () => {
    expect(nextFieldId(ordered, "a", only("c", "d"))).toBe("c");
  });

  it("wraps to the top when nothing below is left", () => {
    expect(nextFieldId(ordered, "c", only("a", "b"))).toBe("a");
  });

  it("never returns the current field", () => {
    expect(nextFieldId(ordered, "b", only("b"))).toBeNull();
  });

  it("returns null when no field is left to decide", () => {
    expect(nextFieldId(ordered, "b", only())).toBeNull();
  });

  it("starts from the top when the current field is not in the list", () => {
    expect(nextFieldId(ordered, "x", only("b", "d"))).toBe("b");
  });
});
