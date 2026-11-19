import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Decision, DecisionInput, Money, QueueQuery, RunEvent } from "@shared/contract";

const root = join(import.meta.dirname, "..", "..", "fixtures");

function jsonlIn(dir: string): string[] {
  const path = join(root, dir);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => join(path, f));
}

const nonEmptyLines = (file: string) =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "");

describe("contract", () => {
  it("finds the supplied fixture runs", () => {
    expect(jsonlIn("runs").length).toBeGreaterThan(0);
  });
  it("parses every event of every fixture run", () => {
    for (const file of [...jsonlIn("runs"), ...jsonlIn("extra")])
      for (const line of nonEmptyLines(file)) {
        const result = RunEvent.safeParse(JSON.parse(line));
        expect(result.success, `${file}: ${line.slice(0, 120)}`).toBe(true);
      }
  });
  it("rejects an unknown event type", () =>
    expect(RunEvent.safeParse({ seq: 1, at_ms: 0, claim_id: "x", type: "run_paused", payload: {} }).success).toBe(false));
  it("keeps money amounts as strings", () => expect(Money.parse({ amount: "4415.30", currency: "EUR" }).amount).toBe("4415.30"));
  it("rejects an unknown queue param", () => expect(QueueQuery.safeParse({ sort: "x" }).success).toBe(false));
  it("rejects a priority param", () => expect(QueueQuery.safeParse({ priority: "high" }).success).toBe(false));
  it("requires a reason to override", () =>
    expect(DecisionInput.safeParse({ action: "override", based_on: 1, value: "x", reason: "  " }).success).toBe(false));

  const stored = { claim_id: "CLM-2026-004817", field_id: "repair_total", based_on: 1, at: "2026-09-18T10:07:00+02:00" };
  it("requires a reason on a stored override", () =>
    expect(Decision.safeParse({ ...stored, action: "override", value: "x" }).success).toBe(false));
  it("has no value on a stored accept", () => {
    const parsed = Decision.parse({ ...stored, action: "accept", value: "x" });
    expect("value" in parsed).toBe(false);
  });
  it("requires a value on a stored correction", () =>
    expect(Decision.safeParse({ ...stored, action: "correct" }).success).toBe(false));
});
