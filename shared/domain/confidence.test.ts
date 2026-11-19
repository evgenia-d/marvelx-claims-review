import { describe, expect, it } from "vitest";
import { confidenceLevel } from "./confidence";

describe("confidenceLevel", () => {
  it("is low under 0.60", () => expect(confidenceLevel(0.59)).toBe("low"));
  it("is medium from 0.60", () => expect(confidenceLevel(0.6)).toBe("medium"));
  it("is medium just under 0.85", () => expect(confidenceLevel(0.849)).toBe("medium"));
  it("is high from 0.85", () => expect(confidenceLevel(0.85)).toBe("high"));
});
