import { describe, expect, it } from "vitest";
import { sameValue, valueMatchesType } from "./values";

const m = (amount: string, currency = "EUR") => ({ amount, currency });

describe("sameValue", () => {
  it("treats money with the same amount and currency strings as the same", () =>
    expect(sameValue(m("4415.30"), m("4415.30"))).toBe(true));
  it("treats a different amount string as a different value, even if numerically equal", () =>
    expect(sameValue(m("4415.30"), m("4415.3"))).toBe(false));
  it("treats a different currency as a different value", () => expect(sameValue(m("1.00"), m("1.00", "USD"))).toBe(false));
  it("treats null as equal only to null", () => {
    expect(sameValue(null, null)).toBe(true);
    expect(sameValue(null, "")).toBe(false);
    expect(sameValue(m("1.00"), null)).toBe(false);
  });
});

describe("valueMatchesType", () => {
  it("accepts null for every type", () => {
    for (const t of ["text", "long_text", "money", "date", "time", "number", "boolean"] as const)
      expect(valueMatchesType(t, null)).toBe(true);
  });
  it.each([
    ["money", m("1.00"), "1.00"],
    ["date", "2026-09-13", "13/09/2026"],
    ["time", "22:40", "22:40:00"],
    ["number", 48213, "48213"],
    ["boolean", false, "false"],
    ["text", "x", 1],
    ["long_text", "x", true],
  ] as const)("requires the right shape for %s", (t, good, bad) => {
    expect(valueMatchesType(t, good)).toBe(true);
    expect(valueMatchesType(t, bad)).toBe(false);
  });
});
