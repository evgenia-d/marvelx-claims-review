import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RunEvent, type Decision } from "@shared/contract";
import { claimViews, needsYouCount } from "./claimViews";
import { applyEvents, initialRunState } from "./run";
import { TEST_CLAIM, extracted, m, revised, stepFinished, stepStarted } from "./test-events";

const accept = (field_id: string, based_on: number): Decision => ({
  claim_id: TEST_CLAIM,
  field_id,
  based_on,
  at: "2026-09-18T10:42:00+02:00",
  action: "accept",
});

describe("claimViews", () => {
  // doc-1 is "€ 3,605.80 …"; "lost" cites a document the claim doesn't have.
  const docs = { "doc-1": "€ 3,605.80 and 23:40" };
  const run = applyEvents(initialRunState(TEST_CLAIM), [
    stepStarted(1, "read_invoice"),
    extracted(2, "total", m("3605.80"), { source: { document_id: "doc-1", start: 2, end: 10 } }),
    extracted(3, "lost", m("10.00"), { source: { document_id: "missing", start: 0, end: 4 } }),
    stepFinished(4, "read_invoice", "warning", "Invoice is a scan."),
    stepStarted(5, "read_report"),
    extracted(6, "time", "23:40", { value_type: "time", source: { document_id: "doc-1", start: 15, end: 20 } }),
    revised(7, "total", m("4415.30")),
  ]);

  it("builds one view per field in arrival order with the decision applied", () => {
    const views = claimViews(run, { total: accept("total", 1) }, docs);
    expect(views.map((v) => v.field_id)).toEqual(["total", "lost", "time"]);
    expect(views[0]?.status).toBe("revised_after_decision");
  });

  it("resolves the extracting step's outcome and the cited text", () => {
    const [total, lost, time] = claimViews(run, {}, docs);
    expect(total?.attention).toContain("step_warning");
    expect(time?.attention).toEqual([]); // read_report is still running; 23:40 is found in its citation
    expect(time?.citation).toBe("found");
    expect(lost?.attention).toEqual(["no_source", "step_warning"]);
  });

  it("counts the fields that need the reviewer", () => {
    expect(needsYouCount(claimViews(run, {}, docs))).toBe(2);
    expect(needsYouCount(claimViews(run, { lost: accept("lost", 1) }, docs))).toBe(1);
  });
});

describe("fixture CLM-2026-004817", () => {
  const fixtures = join(import.meta.dirname, "..", "..", "fixtures");
  const index = JSON.parse(readFileSync(join(fixtures, "documents", "index.json"), "utf8")) as { document_id: string }[];
  const docs = Object.fromEntries(
    index.map((d) => [d.document_id, readFileSync(join(fixtures, "documents", `${d.document_id}.txt`), "utf8")]),
  );
  const events = readFileSync(join(fixtures, "runs", "CLM-2026-004817.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => RunEvent.parse(JSON.parse(line)));
  const run = applyEvents(initialRunState("CLM-2026-004817"), events);

  // Matches the fixture's edge cases (plans/SPEC.md): 22:40 vs "23:40" and the parts sum (T2), the four
  // third-party fields and liability at low confidence, two empty values, estimated_payable without a source.
  it("flags nine fields as needing the reviewer with no decisions", () => {
    const views = claimViews(run, {}, docs);
    expect(views.filter((v) => v.needsYou).map((v) => v.field_id)).toEqual([
      "incident_time",
      "third_party_name",
      "third_party_plate",
      "third_party_insurer",
      "third_party_policy_number",
      "witness_phone",
      "liability_assessment",
      "parts_total",
      "estimated_payable",
    ]);
    expect(needsYouCount(views)).toBe(9);
  });
});
