import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiFailure, getJson } from "./http";
import { z } from "zod";

const schema = z.object({});
const failure = async (): Promise<ApiFailure> => {
  try {
    await getJson("/x", schema);
  } catch (e) {
    return e as ApiFailure;
  }
  throw new Error("expected a failure");
};

afterEach(() => vi.unstubAllGlobals());

describe("getJson failures", () => {
  it("treats a failed fetch as unreachable", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    expect((await failure()).status).toBe(0);
  });

  it("treats a 502 without an error body as unreachable", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 502, headers: { "Content-Type": "text/plain" } }));
    const f = await failure();
    expect(f.status).toBe(0);
    expect(f.code).toBe("unreachable");
  });

  it("keeps the status and code of the server's own error body", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: { code: "claim_not_found", message: "No such claim." } }, { status: 404 }));
    const f = await failure();
    expect([f.status, f.code]).toEqual([404, "claim_not_found"]);
  });

  it("reports a 500 without an error body as unexpected", async () => {
    vi.stubGlobal("fetch", async () => new Response("boom", { status: 500 }));
    const f = await failure();
    expect([f.status, f.code]).toEqual([500, "unexpected_error"]);
  });
});
