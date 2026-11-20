import { afterEach, describe, expect, it, vi } from "vitest";
import { parseRunEvent } from "./events";

afterEach(() => vi.restoreAllMocks());

describe("parseRunEvent", () => {
  it("parseRunEvent returns null for an unknown event type", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = JSON.stringify({ seq: 1, at_ms: 0, claim_id: "CLM-2026-004817", type: "approve_claim", payload: {} });
    expect(parseRunEvent(data)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("parseRunEvent returns null for bad JSON", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseRunEvent("{not json")).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("parses a valid run event", () => {
    const event = { seq: 3, at_ms: 300, claim_id: "CLM-2026-004817", type: "summary_delta", payload: { text: "Hi" } };
    expect(parseRunEvent(JSON.stringify(event))).toEqual(event);
  });
});
