import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog";
import { fixturesRoot } from "./helpers";

let dir = "";
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

// A one-claim fixture pack in a temp dir: fixtures/ itself is never written.
function pack(runLines: string[]) {
  dir = mkdtempSync(join(tmpdir(), "catalog-"));
  mkdirSync(join(dir, "runs"));
  mkdirSync(join(dir, "documents"));
  writeFileSync(join(dir, "claims.json"), JSON.stringify([{
    id: "clm_1", claim_id: "CLM-2026-000001", claimant_name: "A", product: "motor", priority: "high",
    received_at: "2026-09-18T10:05:31+02:00", run: "runs/CLM-2026-000001.jsonl", start_after_ms: 0, initial_status: "queued",
  }]));
  writeFileSync(join(dir, "documents", "index.json"), "[]");
  writeFileSync(join(dir, "runs", "CLM-2026-000001.jsonl"), runLines.join("\n") + "\n");
  return dir;
}

const started = '{"seq":1,"at_ms":0,"type":"run_started","claim_id":"CLM-2026-000001","payload":{"started_at":"2026-09-18T10:06:12+02:00"}}';

describe("loadCatalog", () => {
  it("loads the four fixture claims with their runs and documents", () => {
    const catalog = loadCatalog(fixturesRoot);
    expect(catalog.claims.map((c) => [c.claim_id, c.events.length, c.documents.length])).toEqual([
      ["CLM-2026-004817", 111, 4],
      ["CLM-2026-004822", 31, 2],
      ["CLM-2026-004830", 30, 2],
      ["CLM-2026-004809", 24, 2],
    ]);
  });

  it("throws with the file and line number on a line that is not JSON", () => {
    expect(() => loadCatalog(pack([started, "{not json"]))).toThrow(/CLM-2026-000001\.jsonl:2/);
  });

  it("throws with the file and line number on an event that fails the schema", () => {
    const bad = '{"seq":2,"at_ms":5,"type":"run_paused","claim_id":"CLM-2026-000001","payload":{}}';
    expect(() => loadCatalog(pack([started, bad]))).toThrow(/CLM-2026-000001\.jsonl:2/);
  });

  it("throws with the file and line number when at_ms goes back in time", () => {
    const later = '{"seq":2,"at_ms":900,"type":"step_started","claim_id":"CLM-2026-000001","payload":{"step_id":"a","label":"A"}}';
    const earlier = '{"seq":3,"at_ms":500,"type":"step_started","claim_id":"CLM-2026-000001","payload":{"step_id":"b","label":"B"}}';
    expect(() => loadCatalog(pack([started, later, earlier]))).toThrow(/CLM-2026-000001\.jsonl:3: at_ms 500 is earlier than the previous line's 900/);
  });
});
