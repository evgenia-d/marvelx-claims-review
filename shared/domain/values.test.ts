import { describe, expect, it } from "vitest";
import { inputText, parseInput, sameValue, valueMatchesType } from "./values";

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

describe("parseInput", () => {
  const ok = (value: unknown) => ({ ok: true, value });
  it("keeps a money amount exactly as typed", () =>
    expect(parseInput("money", "4415.3", "EUR")).toEqual(ok(m("4415.3"))));
  it.each(["4,415.30", "4415.301", "€4415", "-1.00", "4415."])("rejects the money amount %s", (raw) =>
    expect(parseInput("money", raw, "EUR").ok).toBe(false));
  it("reads yes and no as booleans, ignoring case", () => {
    expect(parseInput("boolean", "yes", "EUR")).toEqual(ok(true));
    expect(parseInput("boolean", "No", "EUR")).toEqual(ok(false));
    expect(parseInput("boolean", "true", "EUR").ok).toBe(false);
  });
  it("reads a number with an optional sign and decimals, without separators", () => {
    expect(parseInput("number", "14.5", "EUR")).toEqual(ok(14.5));
    expect(parseInput("number", "-3", "EUR")).toEqual(ok(-3));
    expect(parseInput("number", "48,213", "EUR").ok).toBe(false);
  });
  it("accepts a real YYYY-MM-DD date only", () => {
    expect(parseInput("date", "2026-09-13", "EUR")).toEqual(ok("2026-09-13"));
    expect(parseInput("date", "2026-13-01", "EUR").ok).toBe(false);
    expect(parseInput("date", "13/09/2026", "EUR").ok).toBe(false);
  });
  it("accepts a time from 00:00 to 23:59 only", () => {
    expect(parseInput("time", "22:40", "EUR")).toEqual(ok("22:40"));
    expect(parseInput("time", "24:00", "EUR").ok).toBe(false);
    expect(parseInput("time", "12:60", "EUR").ok).toBe(false);
  });
  it("keeps text as typed apart from the outer spaces", () =>
    expect(parseInput("long_text", "  Rear-ended at  lights ", "EUR")).toEqual(ok("Rear-ended at  lights")));
  it("reads a blank input as not found for every type", () => {
    for (const t of ["text", "long_text", "money", "date", "time", "number", "boolean"] as const)
      expect(parseInput(t, "   ", "EUR")).toEqual(ok(null));
  });
  it("explains a rejected value in plain words", () => {
    const result = parseInput("money", "4,415.30", "EUR");
    expect(result.ok ? "" : result.message).toBe("Use digits and a dot, like 4415.30");
  });
});

describe("inputText", () => {
  it("gives the amount string for money, yes/no for booleans and empty for not found", () => {
    expect(inputText(m("3605.80"))).toBe("3605.80");
    expect(inputText(true)).toBe("yes");
    expect(inputText(false)).toBe("no");
    expect(inputText(null)).toBe("");
  });
  it("round-trips through parseInput", () => {
    expect(parseInput("number", inputText(14.5), "EUR")).toEqual({ ok: true, value: 14.5 });
    expect(parseInput("money", inputText(m("4415.30")), "EUR")).toEqual({ ok: true, value: m("4415.30") });
  });
});
