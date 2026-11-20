import { describe, expect, it } from "vitest";
import { backAction, cameFromList } from "./phoneNav";

describe("phone back", () => {
  it("goes back in history when the field was opened from the list", () => {
    expect(backAction({ fromList: true })).toBe("history");
  });

  it("leaves the field in the URL when there is no list entry to return to (deep link, reload)", () => {
    expect(backAction(null)).toBe("replace");
    expect(backAction(undefined)).toBe("replace");
    expect(backAction({ fromList: "yes" })).toBe("replace");
  });

  it("reads only a true flag as coming from the list", () => {
    expect(cameFromList({ fromList: true })).toBe(true);
    expect(cameFromList({})).toBe(false);
  });
});
