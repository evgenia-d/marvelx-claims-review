import { describe, expect, it } from "vitest";
import type { Decision, FieldValue, RunEvent } from "@shared/contract";
import { fieldView, type FieldContext } from "./fieldView";
import { applyEvents, initialRunState, type FieldState } from "./run";
import { TEST_CLAIM, confidence, extracted, m, revised } from "./test-events";

// Builds one field from a hand-written event list.
function field(id: string, ...events: RunEvent[]): FieldState {
  const f = applyEvents(initialRunState(TEST_CLAIM), events).fields[id];
  if (!f) throw new Error(`field ${id} was not extracted`);
  return f;
}

const meta = (based_on: number) => ({ claim_id: TEST_CLAIM, field_id: "total", based_on, at: "2026-09-18T10:42:00+02:00" });
const accept = (based_on: number): Decision => ({ ...meta(based_on), action: "accept" });
const correct = (based_on: number, value: FieldValue): Decision => ({ ...meta(based_on), action: "correct", value });
const override = (based_on: number, value: FieldValue, reason = "Invoice is a duplicate."): Decision => ({
  ...meta(based_on),
  action: "override",
  value,
  reason,
});

// A context where nothing calls for attention: a found citation and a clean step.
const clean: FieldContext = { cited: "€ 3,605.80", stepOutcome: "ok" };
const total = (...more: RunEvent[]) => field("total", extracted(36, "total", m("3605.80")), ...more);

describe("fieldView", () => {
  it("is pending with the agent's value when there is no decision", () => {
    const v = fieldView(total(), undefined, clean);
    expect(v.status).toBe("pending");
    expect(v.shown).toEqual({ value: m("3605.80"), by: "agent" });
    expect(v.decision).toBeNull();
    expect(v.decidedOn).toBeNull();
  });

  it("is accepted with the agent's value when the decision is current", () => {
    const v = fieldView(total(), accept(1), clean);
    expect(v.status).toBe("accepted");
    expect(v.shown).toEqual({ value: m("3605.80"), by: "agent" });
    expect(v.decidedOn?.version).toBe(1);
  });

  it.each([
    ["corrected", correct(1, m("3650.80"))],
    ["overridden", override(1, m("3650.80"))],
  ] as const)("is %s and shows the reviewer's value", (status, decision) => {
    const v = fieldView(total(), decision, clean);
    expect(v.status).toBe(status);
    expect(v.shown).toEqual({ value: m("3650.80"), by: "you" });
  });

  it("keeps an accepted decision when the agent revises the value", () => {
    const f = total(revised(42, "total", m("4415.30"), "Page 2 of the invoice adds supplements."));
    const v = fieldView(f, accept(1), clean);
    expect(v.status).toBe("revised_after_decision");
    expect(v.shown).toEqual({ value: m("3605.80"), by: "agent" });
    expect(v.agent.value).toEqual(m("4415.30"));
    expect(v.decidedOn?.value).toEqual(m("3605.80"));
    expect(v.needsYou).toBe(true);
  });

  it.each([
    ["corrected", correct(1, m("3650.80"))],
    ["overridden", override(1, m("3650.80"))],
  ] as const)("keeps a %s value when the agent revises", (_, decision) => {
    const v = fieldView(total(revised(42, "total", m("4415.30"))), decision, clean);
    expect(v.status).toBe("revised_after_decision");
    expect(v.shown).toEqual({ value: m("3650.80"), by: "you" });
    expect(v.agent.value).toEqual(m("4415.30"));
  });

  it("does not reopen a decision on a confidence-only change", () => {
    const f = total(confidence(50, "total", 0.97, "Matches the policy."));
    const v = fieldView(f, accept(1), clean);
    expect(v.status).toBe("accepted");
    expect(v.needsYou).toBe(false);
  });

  it("does not reopen a decision on a same-value revision", () => {
    const f = total(revised(42, "total", m("3605.80"), "Checked again."));
    expect(fieldView(f, accept(1), clean).status).toBe("accepted");
  });

  it("is current again once the reviewer decides on the new version", () => {
    const f = total(revised(42, "total", m("4415.30")));
    const v = fieldView(f, accept(2), clean);
    expect(v.status).toBe("accepted");
    expect(v.shown).toEqual({ value: m("4415.30"), by: "agent" });
  });

  it("treats a decision on a version the field has not reached yet as current", () => {
    const v = fieldView(total(), accept(2), clean);
    expect(v.status).toBe("accepted");
    expect(v.decidedOn).toBeNull();
    expect(v.shown).toEqual({ value: m("3605.80"), by: "agent" });
  });

  it("shows the value before the last change and the agent's reason", () => {
    const f = total(
      revised(42, "total", m("4415.30"), "Page 2 of the invoice adds supplements."),
      confidence(50, "total", 0.97, "Matches the policy."),
    );
    expect(fieldView(f, undefined, clean).previous).toEqual({
      value: m("3605.80"),
      reason: "Page 2 of the invoice adds supplements.",
    });
  });

  it("has no previous value while the value never changed", () => {
    const f = total(confidence(50, "total", 0.97), revised(51, "total", m("3605.80")));
    expect(fieldView(f, undefined, clean).previous).toBeNull();
  });

  describe("attention", () => {
    it("lists no_source when the agent gives no citation", () => {
      const f = field("payable", extracted(60, "payable", m("4165.30"), { source: null }));
      expect(fieldView(f, undefined, { cited: null, stepOutcome: "ok" }).attention).toEqual(["no_source"]);
    });

    it("counts a source that can't be resolved as no_source", () => {
      // The agent cites a document, but citedText could not resolve it (unknown document or bad offsets).
      const v = fieldView(total(), undefined, { cited: null, stepOutcome: "ok" });
      expect(v.attention).toEqual(["no_source"]);
      expect(v.needsYou).toBe(true);
    });

    it("lists empty_value when the agent found nothing", () => {
      const f = field("witness_phone", extracted(20, "witness_phone", null));
      expect(fieldView(f, undefined, { cited: "Witness: none", stepOutcome: "ok" }).attention).toEqual(["empty_value"]);
    });

    it("lists low_confidence under 0.60", () => {
      const f = field("total", extracted(36, "total", m("3605.80"), { confidence: 0.59 }));
      expect(fieldView(f, undefined, clean).attention).toEqual(["low_confidence"]);
    });

    it("lists step_warning when the extracting step finished with a warning", () => {
      expect(fieldView(total(), undefined, { ...clean, stepOutcome: "warning" }).attention).toEqual(["step_warning"]);
    });

    it("lists not_in_citation when a checked value is not in its cited text", () => {
      const f = field("incident_time", extracted(8, "incident_time", "22:40", { value_type: "time" }));
      const v = fieldView(f, undefined, { cited: "23:40", stepOutcome: "ok" });
      expect(v.citation).toBe("not_found");
      expect(v.attention).toEqual(["not_in_citation"]);
    });

    it("lists revised_after_decision when the agent revised a decided field", () => {
      const v = fieldView(total(revised(42, "total", m("4415.30"))), accept(1), { cited: "€ 4,415.30", stepOutcome: "ok" });
      expect(v.attention).toEqual(["revised_after_decision"]);
    });

    it("lists reasons in a stable order", () => {
      const f = field("t", extracted(8, "t", null, { value_type: "time", confidence: 0.3, source: null }));
      expect(fieldView(f, undefined, { cited: null, stepOutcome: "warning" }).attention).toEqual([
        "low_confidence",
        "no_source",
        "step_warning",
        "empty_value",
      ]);
    });

    it("needs nothing from the reviewer when there is no reason", () => {
      const v = fieldView(total(), undefined, clean);
      expect(v.attention).toEqual([]);
      expect(v.needsYou).toBe(false);
    });

    it("a current decision clears needsYou but keeps the tags", () => {
      const f = field("payable", extracted(60, "payable", m("4165.30"), { source: null }));
      const v = fieldView(f, accept(1), { cited: null, stepOutcome: "ok" });
      expect(v.needsYou).toBe(false);
      expect(v.attention).toEqual(["no_source"]);
    });
  });
});
