import { afterEach, describe, expect, it, vi } from "vitest";
import { parseQueueSearch, queuePath, rememberQueueSearch, toQueueSearch } from "./search";

describe("queue search params", () => {
  it("parses status", () => {
    expect(parseQueueSearch(new URLSearchParams("status=needs_review"))).toEqual({
      ok: true,
      query: { status: "needs_review" },
    });
  });

  it("parses no params as all claims", () => {
    expect(parseQueueSearch(new URLSearchParams(""))).toEqual({ ok: true, query: {} });
  });

  it("returns not ok for status=done", () => {
    expect(parseQueueSearch(new URLSearchParams("status=done"))).toEqual({ ok: false });
  });

  it("returns not ok for an unknown param", () => {
    expect(parseQueueSearch(new URLSearchParams("priority=high"))).toEqual({ ok: false });
  });

  it("drops empty filters when writing the URL", () => {
    expect(toQueueSearch({}).toString()).toBe("");
    expect(toQueueSearch({ status: undefined }).toString()).toBe("");
    expect(toQueueSearch({ status: "failed" }).toString()).toBe("status=failed");
  });
});

describe("remembered queue search", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("doesn't remember an invalid search", () => {
    rememberQueueSearch("?status=failed");
    rememberQueueSearch("?status=done");
    expect(queuePath()).toBe("/?status=failed");
  });

  it("ignores an invalid search kept in sessionStorage", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "?status=done", setItem: () => undefined });
    vi.resetModules();
    const fresh = await import("./search");
    expect(fresh.queuePath()).toBe("/");
  });
});
