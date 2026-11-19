import { describe, expect, it } from "vitest";
import type { Decision, QueueItem } from "@shared/contract";
import { fieldView, type FieldView } from "./fieldView";
import { applyEvents, initialRunState } from "./run";
import { canComplete, claimStatus, queueCounts } from "./status";
import { TEST_CLAIM, extracted, m, revised } from "./test-events";

const DONE = "2026-09-18T11:00:00+02:00";

describe("claimStatus", () => {
  it.each([
    ["not_started", "queued"],
    ["running", "running"],
    ["finished", "needs_review"],
    ["failed", "failed"],
  ] as const)("maps a %s run to %s", (run, status) => expect(claimStatus(run, null)).toBe(status));
  it("is reviewed once completed, whatever the run did", () => {
    for (const run of ["not_started", "running", "finished", "failed"] as const)
      expect(claimStatus(run, DONE)).toBe("reviewed");
  });
});

// Two fields: "a" and "total"; "total" is revised to version 2.
const state = applyEvents(initialRunState(TEST_CLAIM), [
  extracted(3, "a", "x"),
  extracted(4, "total", m("3605.80")),
  revised(5, "total", m("4415.30")),
]);
const ctx = { cited: null, stepOutcome: "ok" as const };
const accept = (field_id: string, based_on: number): Decision => ({
  claim_id: TEST_CLAIM,
  field_id,
  based_on,
  at: "2026-09-18T10:42:00+02:00",
  action: "accept",
});
const views = (decisions: Record<string, Decision>): FieldView[] =>
  state.field_order.map((id) => fieldView(state.fields[id]!, decisions[id], ctx));

describe("canComplete", () => {
  it("refuses while the agent is working", () =>
    expect(canComplete("running", views({}), null)).toMatchObject({ ok: false, reason: "agent_working" }));

  it("refuses before the run starts", () =>
    expect(canComplete("not_started", [], null)).toMatchObject({ ok: false, reason: "not_started" }));

  it("counts undecided fields as left", () =>
    expect(canComplete("finished", views({}), null)).toEqual({ ok: false, reason: "fields_left", left: 2 }));

  it("counts a field revised after the decision as left", () =>
    expect(canComplete("finished", views({ a: accept("a", 1), total: accept("total", 1) }), null)).toEqual({
      ok: false,
      reason: "fields_left",
      left: 1,
    }));

  it("allows completion when every field is decided", () =>
    expect(canComplete("finished", views({ a: accept("a", 1), total: accept("total", 2) }), null)).toEqual({ ok: true }));

  it("allows completing a failed run once every field is decided", () =>
    expect(canComplete("failed", views({ a: accept("a", 1), total: accept("total", 2) }), null)).toEqual({ ok: true }));

  it("refuses a claim that is already completed", () =>
    expect(canComplete("finished", views({ a: accept("a", 1), total: accept("total", 2) }), DONE)).toEqual({
      ok: false,
      reason: "completed",
      left: 0,
    }));
});

const item = (claim_id: string, status: QueueItem["status"], priority: QueueItem["priority"]): QueueItem => ({
  id: claim_id,
  claim_id,
  claimant_name: "Test",
  product: "Motor",
  priority,
  status,
  run_failed: false,
  needs_you: 0,
  confidence: null,
  received_at: "2026-09-18T09:00:00+02:00",
  updated_at: "2026-09-18T09:00:00+02:00",
  completed_at: null,
});

describe("queueCounts", () => {
  const items = [
    item("1", "running", "high"),
    item("2", "needs_review", "high"),
    item("3", "needs_review", "normal"),
    item("4", "failed", "low"),
  ];

  it("counts every status over the whole queue, zeros included", () =>
    expect(queueCounts(items)).toEqual({
      status: { queued: 0, running: 1, needs_review: 2, failed: 1, reviewed: 0 },
    }));
});
