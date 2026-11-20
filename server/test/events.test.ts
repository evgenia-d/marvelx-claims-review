import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LastEventId } from "@shared/contract";
import { catalog, errorOf, makeApp } from "./helpers";

const C4817 = "CLM-2026-004817";
const url = `/api/claims/${C4817}/events`;
const events4817 = catalog.claims.find((c) => c.claim_id === C4817)?.events ?? [];
const dueSeqs = (elapsed: number) => events4817.filter((e) => e.at_ms <= elapsed).map((e) => e.seq);

type Reader = ReadableStreamDefaultReader<Uint8Array>;
const decoder = new TextDecoder();

// Reads the SSE body until `done(text)` holds or the stream ends, advancing the fake timers
// so the server's 200 ms loop runs.
async function readUntil(reader: Reader, done: (text: string) => boolean, text = ""): Promise<{ text: string; ended: boolean }> {
  while (!done(text)) {
    const next = reader.read();
    let settled = false;
    void next.then(() => (settled = true), () => (settled = true));
    for (let i = 0; i < 100 && !settled; i++) await vi.advanceTimersByTimeAsync(200);
    const { value, done: ended } = await next;
    if (ended) return { text, ended: true };
    text += decoder.decode(value);
  }
  return { text, ended: false };
}

// Event ids are `<replay id>.<seq>`.
const parsedIds = (text: string) => [...text.matchAll(/^id: (.+)$/gm)].map((m) => LastEventId.parse(m[1]));
const ids = (text: string) => parsedIds(text).map((id) => id.seq);
const rawIds = (text: string) => [...text.matchAll(/^id: (.+)$/gm)].map((m) => m[1] ?? "");

// The `synced` messages, whole: no `id:` line, so the browser's Last-Event-ID stays the last run event's.
const syncedBlocks = (text: string) => text.split("\n\n").filter((block) => block.includes("event: synced"));

// Connects, reads the first event's id (the current replay's), and disconnects.
async function currentId(app: ReturnType<typeof makeApp>["app"], path = url) {
  const reader = (await app.request(path)).body!.getReader();
  const { text } = await readUntil(reader, (t) => ids(t).length >= 1);
  await reader.cancel();
  return rawIds(text)[0] ?? "";
}

// Connecting with this Last-Event-ID gets `event: reset` and a closed stream, no run events.
async function expectResetOnConnect(app: ReturnType<typeof makeApp>["app"], lastEventId: string) {
  const reader = (await app.request(url, { headers: { "Last-Event-ID": lastEventId } })).body!.getReader();
  const { text, ended } = await readUntil(reader, () => false);
  expect(text).toContain("event: reset");
  expect(ids(text)).toEqual([]);
  expect(ended).toBe(true);
}

describe("GET /api/claims/:claimId/events", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends every due event with its seq as id", async () => {
    const { app, tick } = makeApp();
    tick(10000);
    const res = await app.request(url);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reader = res.body!.getReader();
    const expected = dueSeqs(10000);
    const { text } = await readUntil(reader, (t) => ids(t).length >= expected.length);
    expect(ids(text)).toEqual(expected);
    expect(new Set(parsedIds(text).map((id) => id.replay)).size).toBe(1);
    expect(text).toContain("retry: 2000");
    expect(text).toContain("event: run");
    const first = /^data: (.*)$/m.exec(text)?.[1] ?? "";
    expect(JSON.parse(first)).toMatchObject({ seq: 1, type: "run_started", claim_id: C4817 });
    await reader.cancel();
  });

  it("sends newly due events as the clock moves", async () => {
    const { app, tick } = makeApp();
    const reader = (await app.request(url)).body!.getReader();
    const start = await readUntil(reader, (t) => ids(t).length >= 1);
    tick(10000);
    const { text } = await readUntil(reader, (t) => ids(t).length >= dueSeqs(10000).length, start.text);
    expect(ids(text)).toEqual(dueSeqs(10000));
    await reader.cancel();
  });

  it("resumes after Last-Event-ID", async () => {
    const { app, tick } = makeApp();
    const replayId = LastEventId.parse(await currentId(app)).replay;
    tick(10000);
    const res = await app.request(url, { headers: { "Last-Event-ID": `${replayId}.5` } });
    const reader = res.body!.getReader();
    const expected = dueSeqs(10000).filter((s) => s > 5);
    const { text } = await readUntil(reader, (t) => ids(t).length >= expected.length);
    expect(ids(text)).toEqual(expected);
    await reader.cancel();
  });

  it("sends the duplicate seq 42 as the fixture has it", async () => {
    const { app, tick } = makeApp();
    tick(60000);
    const reader = (await app.request(url)).body!.getReader();
    const expected = dueSeqs(60000);
    const { text } = await readUntil(reader, (t) => ids(t).length >= expected.length);
    expect(ids(text).filter((s) => s === 42)).toHaveLength(2);
    expect(ids(text)).toEqual(expected);
    await reader.cancel();
  });

  it("returns 404 JSON for an unknown claim", async () => {
    const { app } = makeApp();
    const res = await app.request("/api/claims/CLM-2026-999999/events");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect((await errorOf(res)).code).toBe("claim_not_found");
  });

  it("sends a reset event and closes the stream when the replay restarts", async () => {
    const { app } = makeApp();
    const reader = (await app.request(url)).body!.getReader();
    const start = await readUntil(reader, (t) => ids(t).length >= 1);
    expect((await app.request("/api/replay/restart", { method: "POST" })).status).toBe(204);
    const { text, ended } = await readUntil(reader, () => false, start.text);
    expect(text).toContain("event: reset");
    expect(ended).toBe(true);
  });

  it("sends reset on connect when Last-Event-ID is from an earlier replay", async () => {
    const { app } = makeApp();
    const old = await currentId(app);
    await app.request("/api/replay/restart", { method: "POST" });
    await expectResetOnConnect(app, old);
  });

  it("sends reset on connect when Last-Event-ID is from another server start", async () => {
    const old = await currentId(makeApp().app);
    await expectResetOnConnect(makeApp().app, old);
  });

  it("sends reset on connect when Last-Event-ID is unreadable", async () => {
    const { app } = makeApp();
    await expectResetOnConnect(app, "5");
  });

  it("sends all 24 events of preloaded 4809 at once at t=0", async () => {
    const { app } = makeApp();
    const reader = (await app.request("/api/claims/CLM-2026-004809/events")).body!.getReader();
    const { text } = await readUntil(reader, (t) => ids(t).length >= 24);
    expect(ids(text)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    await reader.cancel();
  });

  it("sends all 24 events of 4809 again to a fresh connection after a restart", async () => {
    const { app } = makeApp();
    await app.request("/api/replay/restart", { method: "POST" });
    const reader = (await app.request("/api/claims/CLM-2026-004809/events")).body!.getReader();
    const { text } = await readUntil(reader, (t) => ids(t).length >= 24);
    expect(ids(text)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    await reader.cancel();
  });

  it("sends synced after the backlog", async () => {
    const { app, tick } = makeApp();
    tick(10000);
    const reader = (await app.request(url)).body!.getReader();
    const { text } = await readUntil(reader, (t) => t.includes("event: synced"));
    const before = text.slice(0, text.indexOf("event: synced"));
    expect(ids(before)).toEqual(dueSeqs(10000));
    expect(syncedBlocks(text)).toEqual(["event: synced\ndata: {}"]);
    await reader.cancel();
  });

  it("sends synced on an empty backlog", async () => {
    const { app } = makeApp();
    // 4830 starts 20 s into the replay: nothing is due yet.
    const reader = (await app.request("/api/claims/CLM-2026-004830/events")).body!.getReader();
    const { text } = await readUntil(reader, (t) => t.includes("event: synced"));
    expect(ids(text)).toEqual([]);
    expect(syncedBlocks(text)).toHaveLength(1);
    await reader.cancel();
  });

  it("sends synced after a resume from a current-replay Last-Event-ID", async () => {
    const { app, tick } = makeApp();
    const replayId = LastEventId.parse(await currentId(app)).replay;
    tick(10000);
    const reader = (await app.request(url, { headers: { "Last-Event-ID": `${replayId}.5` } })).body!.getReader();
    const { text } = await readUntil(reader, (t) => t.includes("event: synced"));
    const before = text.slice(0, text.indexOf("event: synced"));
    expect(ids(before)).toEqual(dueSeqs(10000).filter((s) => s > 5));
    expect(syncedBlocks(text)).toHaveLength(1);
    await reader.cancel();
  });

  it("does not send synced again on later polls", async () => {
    const { app, tick } = makeApp();
    const reader = (await app.request(url)).body!.getReader();
    const start = await readUntil(reader, (t) => t.includes("event: synced"));
    tick(10000);
    const { text } = await readUntil(reader, (t) => ids(t).length >= dueSeqs(10000).length, start.text);
    expect(ids(text)).toEqual(dueSeqs(10000));
    expect(syncedBlocks(text)).toHaveLength(1);
    await reader.cancel();
  });

  it("sends no synced with a reset on connect", async () => {
    const { app } = makeApp();
    const reader = (await app.request(url, { headers: { "Last-Event-ID": "5" } })).body!.getReader();
    const { text } = await readUntil(reader, () => false);
    expect(text).toContain("event: reset");
    expect(text).not.toContain("event: synced");
  });

  it("sends a heartbeat comment every 15 s", async () => {
    const { app } = makeApp();
    const opened = Date.now(); // fake time: moves only with the fake timers
    const reader = (await app.request(url)).body!.getReader();
    const { text } = await readUntil(reader, (t) => t.includes(": hb"));
    // The first `: hb` arrives on the poll at 15 s, not before about 14.8 s.
    expect(Date.now() - opened).toBeGreaterThanOrEqual(14800);
    expect(text.match(/^: hb$/gm)).toHaveLength(1);
    await reader.cancel();
  });
});
