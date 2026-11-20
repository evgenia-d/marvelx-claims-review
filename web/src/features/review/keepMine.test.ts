import { describe, expect, it } from "vitest";
import type { Decision, FieldValue, RunEvent } from "@shared/contract";
import { applyEvents, fieldView, initialRunState, type FieldState } from "@shared/domain";
import { TEST_CLAIM, extracted, m, revised } from "@shared/domain/test-events";
import { keepMine } from "./keepMine";

const field = (...events: RunEvent[]): FieldState => applyEvents(initialRunState(TEST_CLAIM), events).fields.total as FieldState;
const meta = { claim_id: TEST_CLAIM, field_id: "total", based_on: 1, at: "2026-09-18T10:42:00+02:00" };
const accept: Decision = { ...meta, action: "accept" };
const correct = (value: FieldValue): Decision => ({ ...meta, action: "correct", value });
const override = (value: FieldValue): Decision => ({ ...meta, action: "override", value, reason: "Invoice is a duplicate." });

const ctx = { cited: "€ 4,415.30", stepOutcome: "ok" } as const;
// The agent revised to version 2 after the decision on version 1.
const afterRevision = (decision: Decision | undefined) =>
  fieldView(field(extracted(1, "total", m("3605.80")), revised(2, "total", m("4415.30"))), decision, ctx);

describe("keepMine", () => {
  it("turns a kept accept into a correction with the value accepted then", () => {
    expect(keepMine(afterRevision(accept))).toEqual({ action: "correct", based_on: 2, value: m("3605.80") });
  });

  it("keeps a correction's value against the agent's new version", () => {
    expect(keepMine(afterRevision(correct(m("3650.80"))))).toEqual({ action: "correct", based_on: 2, value: m("3650.80") });
  });

  it("keeps an override's value and reason against the agent's new version", () => {
    expect(keepMine(afterRevision(override(m("0.00"))))).toEqual({
      action: "override",
      based_on: 2,
      value: m("0.00"),
      reason: "Invoice is a duplicate.",
    });
  });

  it("returns null when there is no decision", () => {
    expect(keepMine(afterRevision(undefined))).toBeNull();
  });
});
