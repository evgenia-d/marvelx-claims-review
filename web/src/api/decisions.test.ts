import { describe, expect, it } from "vitest";
import type { Decision } from "@shared/contract";
import { withDecision, withoutDecision } from "./decisions";

const at = "2026-11-20T10:06:00.000Z";
const accept = (field_id: string, based_on = 1): Decision => ({ action: "accept", claim_id: "CLM-1", field_id, based_on, at });
const correct = (field_id: string, amount: string): Decision =>
  ({ action: "correct", claim_id: "CLM-1", field_id, based_on: 1, at, value: { amount, currency: "EUR" } });

describe("decision cache writes", () => {
  it("withDecision replaces the field's previous decision", () => {
    const list = withDecision([accept("total_incl_vat"), accept("policy_number")], correct("total_incl_vat", "4415.30"));
    expect(list).toHaveLength(2);
    expect(list.filter((d) => d.field_id === "total_incl_vat")).toEqual([correct("total_incl_vat", "4415.30")]);
  });
  it("withoutDecision leaves other fields' decisions alone", () =>
    expect(withoutDecision([accept("a"), accept("b")], "a")).toEqual([accept("b")]));
  it("does not change the list it was given", () => {
    const list = [accept("a")];
    withDecision(list, accept("a", 2));
    withoutDecision(list, "a");
    expect(list).toEqual([accept("a")]);
  });
});
