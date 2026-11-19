// T2: is the agent's value actually in the text it cites? Only time, date, money and number values
// are checked; text and yes/no values have no single right way to be written.
//
// We read the numbers and dates out of the cited text and compare them to the value as stored, rather
// than writing the value out in every format a document might use. That needs no Intl, never builds a
// regex from agent text, and covers the English forms the fixture documents use.
import type { FieldValue, Source, ValueType } from "@shared/contract";
import { isoDateParts, valueMatchesType } from "./values";

export type CitationCheck = "found" | "not_found" | "not_checked";

// The cited span of a document, or null when it can't be resolved (no source, unknown document,
// offsets outside the text, or an empty span). Offsets are UTF-16 code units, end exclusive,
// exactly like String.prototype.slice.
export function citedText(docs: Record<string, string>, source: Source): string | null {
  if (source === null) return null;
  const text = docs[source.document_id];
  if (text === undefined) return null;
  if (source.start >= source.end || source.end > text.length) return null;
  return text.slice(source.start, source.end);
}

// Numbers as written in the cited text, thousands commas removed: "€ 3,605.80 incl. VAT" → ["3605.80"].
// Each number is read whole, so the "4" in "14.5" is never read on its own.
const numbersIn = (text: string) => (text.match(/\d[\d,]*(\.\d+)?/g) ?? []).map((n) => n.replaceAll(",", ""));

// Dates written "D Month YYYY", leading zero dropped: "on 01 March 2026" → ["1 March 2026"].
// A date cited without its year ("Sunday 20 September") is not read: the year is unverified.
const datesIn = (text: string) => (text.match(/\d{1,2} [A-Z][a-z]+ \d{4}/g) ?? []).map((d) => d.replace(/^0/, ""));

function inText(v: Exclude<FieldValue, null>, cited: string): boolean {
  if (typeof v === "object") return numbersIn(cited).includes(v.amount); // money, as the agent wrote it
  if (typeof v === "number") return numbersIn(cited).includes(String(v));
  if (typeof v !== "string") return false;
  if (cited.includes(v)) return true; // a time, or a date written as ISO
  const date = isoDateParts(v);
  return date !== null && datesIn(cited).includes(`${date.day.replace(/^0/, "")} ${date.monthName} ${date.year}`);
}

const CHECKED: ValueType[] = ["time", "date", "money", "number"];

// A value of the wrong shape for its type (e.g. time "about 23:40") is not_checked rather than guessed at.
export function citationCheck(t: ValueType, v: FieldValue, cited: string | null): CitationCheck {
  if (v === null || cited === null || !CHECKED.includes(t) || !valueMatchesType(t, v)) return "not_checked";
  return inText(v, cited) ? "found" : "not_found";
}
