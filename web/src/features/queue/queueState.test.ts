import { describe, expect, it } from "vitest";
import type { QueueResponse } from "@shared/contract";
import { ApiFailure } from "../../api/http";
import { queueLiveness, queueState } from "./queueState";

const data = (counts: Partial<Record<string, number>>, claims: unknown[]): QueueResponse =>
  ({ claims, counts: { status: { queued: 0, running: 0, needs_review: 0, reviewed: 0, failed: 0, ...counts } } }) as unknown as QueueResponse;

describe("queueState", () => {
  it("is loading before the first answer", () => {
    expect(queueState({ data: undefined, error: null })).toBe("loading");
  });
  it("is unreachable when the first request could not reach the server", () => {
    expect(queueState({ data: undefined, error: new ApiFailure(0, "unreachable", "x") })).toBe("unreachable");
  });
  it("is failed when the first request got another error", () => {
    expect(queueState({ data: undefined, error: new ApiFailure(500, "unexpected_error", "x") })).toBe("failed");
    expect(queueState({ data: undefined, error: new Error("x") })).toBe("failed");
  });
  it("is empty when no status has any claim", () => {
    expect(queueState({ data: data({}, []), error: null })).toBe("empty");
  });
  it("is no_match when the filter hides every claim but others exist", () => {
    expect(queueState({ data: data({ running: 3 }, []), error: null })).toBe("no_match");
  });
  it("shows rows when the filter has claims", () => {
    expect(queueState({ data: data({ running: 3 }, [{}]), error: null })).toBe("rows");
  });
  it("keeps the last rows when a poll fails", () => {
    expect(queueState({ data: data({ running: 3 }, [{}]), error: new ApiFailure(0, "unreachable", "x") })).toBe("rows");
  });
});

describe("queueState while the filter changes", () => {
  it("waits for the answer instead of deciding no_match from the previous filter's rows", () => {
    expect(queueState({ data: data({ running: 3 }, []), error: null, isPlaceholderData: true })).toBe("loading");
  });
  it("keeps the previous rows while the answer is pending", () => {
    expect(queueState({ data: data({ running: 3 }, [{}]), error: null, isPlaceholderData: true })).toBe("rows");
  });
});

describe("queueLiveness", () => {
  const rows = data({ running: 1 }, [{}]);
  it("is live when the last poll succeeded", () => {
    expect(queueLiveness({ data: rows, isError: false })).toBe("live");
  });
  it("says reconnecting when a poll fails after rows", () => {
    expect(queueLiveness({ data: rows, isError: true })).toBe("reconnecting");
  });
  it("claims no liveness before the first answer", () => {
    expect(queueLiveness({ data: undefined, isError: false })).toBe("none");
    expect(queueLiveness({ data: undefined, isError: true })).toBe("none");
  });
});
