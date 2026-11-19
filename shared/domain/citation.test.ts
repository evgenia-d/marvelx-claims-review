import { describe, expect, it } from "vitest";
import { citationCheck, citedText } from "./citation";

const m = (amount: string, currency = "EUR") => ({ amount, currency });

// Cited spans copied from fixtures/documents (4817 police report, repair invoice, policy schedule; 4822 statement).
const PARTS_LINES =
  "Rear bumper cover                        1         € 612.40       € 612.40\n" +
  "Rear bumper reinforcement                1         € 298.60       € 298.60\n" +
  "Tail lamp assembly, left                 1         € 341.00       € 341.00";

describe("citedText", () => {
  const docs = { "police-report-004817": "Time of incident: 23:40" };

  it("returns the cited slice of the document", () =>
    expect(citedText(docs, { document_id: "police-report-004817", start: 18, end: 23 })).toBe("23:40"));

  it("returns null without a source", () => expect(citedText(docs, null)).toBeNull());

  it("citedText returns null for an unknown document", () =>
    expect(citedText(docs, { document_id: "nope", start: 0, end: 4 })).toBeNull());

  it("citedText returns null when the offsets fall outside the document", () =>
    expect(citedText(docs, { document_id: "police-report-004817", start: 18, end: 99 })).toBeNull());

  it("returns null when start is not before end", () =>
    expect(citedText(docs, { document_id: "police-report-004817", start: 5, end: 5 })).toBeNull());
});

describe("citationCheck", () => {
  describe("found", () => {
    it("finds a time as written", () => expect(citationCheck("time", "23:40", "23:40")).toBe("found"));
    it("finds a date written out in words", () =>
      expect(citationCheck("date", "2026-09-13", "13 September 2026")).toBe("found"));
    it("finds a date in words with a single-digit day", () =>
      expect(citationCheck("date", "2026-03-01", "1 March 2026")).toBe("found"));
    it("finds a date in ISO form", () => expect(citationCheck("date", "2026-09-03", "Date: 2026-09-03")).toBe("found"));
    it("finds money with thousands grouping", () =>
      expect(citationCheck("money", m("3605.80"), "Estimated total incl. VAT: € 3,605.80")).toBe("found"));
    it("finds a grouped number", () =>
      expect(citationCheck("number", 48213, "Mileage on arrival: 48,213 km")).toBe("found"));
    it("finds a small number standing alone", () =>
      expect(citationCheck("number", 4, "Courtesy car                             4 days")).toBe("found"));
    it("finds a decimal number", () =>
      expect(citationCheck("number", 14.5, "Labour, body and assembly                14.5 h")).toBe("found"));
  });

  describe("not_found", () => {
    it("does not find a different time", () => expect(citationCheck("time", "22:40", "23:40")).toBe("not_found"));
    it("does not find money that is the sum of the cited lines", () =>
      expect(citationCheck("money", m("1252.00"), PARTS_LINES)).toBe("not_found"));
    it("does not find a digit inside a larger number", () =>
      expect(citationCheck("number", 4, "Labour, body and assembly                14.5 h")).toBe("not_found"));
    it("does not find a date cited without its year", () =>
      expect(citationCheck("date", "2026-09-20", "On Sunday 20 September at about 22:30")).toBe("not_found"));
    it("does not find money that is only the start of a longer amount", () =>
      expect(citationCheck("money", m("1.00"), "€ 1.005")).toBe("not_found"));
    it("does not find a day inside a longer day", () =>
      expect(citationCheck("date", "2026-09-01", "Date of theft: 21 September 2026")).toBe("not_found"));
    it("does not crash on a negative amount, it just isn't found", () =>
      expect(citationCheck("money", m("-12.50"), "Refund: € -12.50")).toBe("not_found"));
  });

  describe("not_checked", () => {
    it("does not check text values", () => {
      expect(citationCheck("text", "AB-123-C", "Plate: XY-999-Z")).toBe("not_checked");
      expect(citationCheck("long_text", "Rear-end collision", "Something else")).toBe("not_checked");
    });
    it("does not check yes/no values", () => expect(citationCheck("boolean", true, "No")).toBe("not_checked"));
    it("does not check null values", () => expect(citationCheck("time", null, "23:40")).toBe("not_checked"));
    it("does not check without cited text", () => expect(citationCheck("time", "22:40", null)).toBe("not_checked"));
    it("does not check (or throw on) a malformed time with regex characters", () =>
      expect(citationCheck("time", "23:40 (approx", "23:40")).toBe("not_checked"));
    it("does not check a value whose shape does not match its type", () =>
      expect(citationCheck("money", "3605.80", "€ 3,605.80")).toBe("not_checked"));
  });
});
