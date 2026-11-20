import { describe, expect, it } from "vitest";
import { formatDate, formatDayTime, formatInstant, formatMoney, formatValue } from "./format";

const m = (amount: string, currency = "EUR") => ({ amount, currency });

describe("formatMoney", () => {
  it("formats euros with grouping", () => expect(formatMoney(m("4415.30"))).toBe("€4,415.30"));
  it("puts the minus sign before the symbol", () => expect(formatMoney(m("-12.50"))).toBe("-€12.50"));
  it("formats pounds in the millions", () => expect(formatMoney(m("1000000.00", "GBP"))).toBe("£1,000,000.00"));
  it("never rounds away digits the amount has", () => expect(formatMoney(m("1.005"))).toBe("€1.005"));
  it("does not lose precision on a long amount", () =>
    expect(formatMoney(m("12345678901234567.89"))).toBe("€12,345,678,901,234,567.89"));
  it("falls back to the raw amount for a currency Intl rejects", () =>
    expect(formatMoney(m("1.00", "E1R"))).toBe("1.00 E1R"));
});

describe("formatDate", () => {
  it("formats a date as day, short month, year", () => expect(formatDate("2026-09-13")).toBe("13 Sep 2026"));
});

describe("formatInstant", () => {
  it("shows hours and minutes in the given zone", () =>
    expect(formatInstant("2026-09-18T10:06:12+02:00", "Europe/Amsterdam")).toBe("10:06"));
  it("uses a 24-hour clock", () => expect(formatInstant("2026-09-18T22:06:12Z", "UTC")).toBe("22:06"));
});

describe("formatDayTime", () => {
  it("shows day, short month and time in the given zone", () =>
    expect(formatDayTime("2026-09-18T10:05:00+02:00", "Europe/Amsterdam")).toBe("18 Sep, 10:05"));
  it("writes September as Sep", () => expect(formatDayTime("2026-09-03T08:00:00Z", "UTC")).toBe("3 Sep, 08:00"));
});

describe("formatValue", () => {
  it("returns null for an empty value, so the caller shows Not found", () => expect(formatValue("text", null)).toBeNull());
  it("shows yes and no for booleans", () => {
    expect(formatValue("boolean", true)).toBe("Yes");
    expect(formatValue("boolean", false)).toBe("No");
  });
  it("formats money", () => expect(formatValue("money", m("3605.80"))).toBe("€3,605.80"));
  it("formats dates", () => expect(formatValue("date", "2026-09-13")).toBe("13 Sep 2026"));
  it("shows a time as given", () => expect(formatValue("time", "23:40")).toBe("23:40"));
  it("groups numbers and keeps decimals", () => {
    expect(formatValue("number", 48213)).toBe("48,213");
    expect(formatValue("number", 14.5)).toBe("14.5");
  });
  it("shows text as given", () => expect(formatValue("long_text", "Rear-end collision")).toBe("Rear-end collision"));
  it("formats a value by its own shape when it does not match its type", () => {
    expect(formatValue("number", "about 4")).toBe("about 4");
    expect(formatValue("text", m("1.00"))).toBe("€1.00");
  });
});
