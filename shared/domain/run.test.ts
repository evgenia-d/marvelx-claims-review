import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RunEvent } from "@shared/contract";
import { applyEvent, applyEvents, initialRunState } from "./run";
import {
  TEST_CLAIM,
  confidence,
  delta,
  extracted,
  failed,
  finished,
  m,
  revised,
  started,
  stepFinished,
  stepStarted,
} from "./test-events";

const fresh = () => initialRunState(TEST_CLAIM);
const run = (...events: RunEvent[]) => applyEvents(fresh(), events);

describe("applyEvent", () => {
  it("applies the same seq once", () => {
    const once = run(started(1), extracted(3, "total", m("4415.00")), revised(42, "total", m("4415.30")));
    const again = applyEvent(once, revised(42, "total", m("4415.30")));
    expect(again).toBe(once);
    expect(again.fields.total?.history.length).toBe(2);
    expect(again.fields.total?.version).toBe(2);
  });

  it("records when each agent entry arrived", () => {
    const s = run(started(1), extracted(3, "total", m("10.00")), revised(4, "total", m("12.00")), confidence(5, "total", 0.5));
    expect(s.fields.total?.history.map((e) => e.at_ms)).toEqual([300, 400, 500]);
    expect(s.fields.total?.current.at_ms).toBe(500);
  });

  it("keeps fields in arrival order", () => {
    const s = run(extracted(3, "b", "x"), extracted(4, "a", "y"), revised(5, "b", "z"), extracted(6, "c", "w"));
    expect(s.field_order).toEqual(["b", "a", "c"]);
  });

  it("does not move the version on a same-value revision", () => {
    const s = run(extracted(3, "total", m("10.00")), revised(4, "total", m("10.00"), "Checked again.", 0.7));
    const f = s.fields.total!;
    expect(f.version).toBe(1);
    expect(f.current.confidence).toBe(0.7);
    expect(f.history.map((h) => h.reason)).toContain("Checked again.");
  });

  it("does not move the version on a confidence change", () => {
    const s = run(extracted(3, "plate", "AB-12"), confidence(4, "plate", 0.98, "Policy lists it."));
    const f = s.fields.plate!;
    expect(f.version).toBe(1);
    expect(f.current.confidence).toBe(0.98);
    expect(f.current.value).toBe("AB-12");
    expect(f.history.map((h) => h.reason)).toContain("Policy lists it.");
  });

  it("records the running step on an extracted field", () => {
    const s = run(stepStarted(2, "read_invoice"), extracted(3, "total", m("1.00")));
    expect(s.fields.total?.step_id).toBe("read_invoice");
  });

  it("ignores a revision for a field that was never extracted", () => {
    const before = run(extracted(3, "total", m("1.00")));
    const after = applyEvents(before, [revised(4, "ghost", "x"), confidence(5, "ghost", 0.1)]);
    expect(after.fields).toBe(before.fields);
    expect(after.field_order).toBe(before.field_order);
    expect(after.steps).toBe(before.steps);
    expect(after.seen.has(4) && after.seen.has(5)).toBe(true);
  });

  it("ignores a second extraction of a known field", () => {
    const before = run(extracted(3, "total", m("1.00")));
    const after = applyEvent(before, extracted(4, "total", m("2.00"), { label: "Other" }));
    expect(after.fields).toBe(before.fields);
    expect(after.field_order).toBe(before.field_order);
    expect(after.seen.has(4)).toBe(true);
  });

  it("does not crash on step_finished for an unknown step", () => {
    const before = run(stepStarted(2, "classify"));
    const after = applyEvent(before, stepFinished(3, "nope"));
    expect(after.steps).toBe(before.steps);
  });

  it("marks the failed step and keeps extracted fields", () => {
    const s = run(
      started(1),
      stepStarted(2, "lookup_policy"),
      extracted(3, "policy_number", "P-1"),
      failed(31, "lookup_policy"),
    );
    expect(s.steps.find((x) => x.step_id === "lookup_policy")?.state).toBe("failed");
    expect(s.status).toBe("failed");
    expect(s.error?.retryable).toBe(true);
    expect(s.error?.step_id).toBe("lookup_policy");
    expect(s.fields.policy_number?.current.value).toBe("P-1");
  });

  it("appends summary deltas in seq order of arrival", () => {
    const s = run(delta(5, "The car "), delta(6, "was hit. "), delta(5, "The car "));
    expect(s.summary).toBe("The car was hit. ");
  });

  it("keeps untouched fields as the same objects after an event", () => {
    const before = run(stepStarted(2, "s"), extracted(3, "a", "x"), extracted(4, "b", "y"));
    const after = applyEvent(before, revised(5, "b", "z"));
    expect(after.fields.a).toBe(before.fields.a);
    expect(after.fields.b).not.toBe(before.fields.b);
    expect(after.steps).toBe(before.steps);
  });

  it("does not mutate the previous state", () => {
    const before = run(extracted(3, "a", "x"));
    const seenBefore = [...before.seen];
    applyEvent(before, revised(4, "a", "y"));
    expect([...before.seen]).toEqual(seenBefore);
    expect(before.fields.a?.version).toBe(1);
  });

  it("finishes the run with its overall confidence", () => {
    const s = run(started(1), finished(9, 0.61));
    expect(s.status).toBe("finished");
    expect(s.overall_confidence).toBe(0.61);
  });

  it("a second run_started after a failure sets the run back to running and clears the error", () => {
    const failedRun = run(started(1), stepStarted(2, "lookup_policy"), extracted(3, "a", "x"), failed(4, "lookup_policy"));
    const retried = applyEvents(failedRun, [started(5), stepStarted(6, "lookup_policy")]);
    expect(retried.status).toBe("running");
    expect(retried.error).toBeNull();
    expect(retried.fields.a).toBe(failedRun.fields.a);
    expect(retried.steps.filter((x) => x.step_id === "lookup_policy")).toEqual([
      { step_id: "lookup_policy", label: "lookup_policy", state: "running", note: null },
    ]);
  });
});

describe("fixture CLM-2026-004817", () => {
  it("replays CLM-2026-004817 to 49 fields with two revisions", () => {
    const file = join(import.meta.dirname, "..", "..", "fixtures", "runs", "CLM-2026-004817.jsonl");
    const events = readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => RunEvent.parse(JSON.parse(l)));
    const s = applyEvents(initialRunState("CLM-2026-004817"), events);
    expect(s.field_order.length).toBe(49);
    // Exactly two fields were revised, each once; seq 42 arrives twice but is applied once.
    const revisedFields = Object.values(s.fields).filter((f) => f.version > 1);
    expect(Object.fromEntries(revisedFields.map((f) => [f.field_id, f.version]))).toEqual({
      liability_assessment: 2,
      total_incl_vat: 2,
    });
    expect(s.fields.total_incl_vat?.history.length).toBe(2);
    expect(s.overall_confidence).toBe(0.61);
    expect(s.status).toBe("finished");
    expect(s.fields.estimated_payable?.current.source).toBeNull();
  });
});
