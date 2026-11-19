import type { FieldValue, Money, ValueType } from "@shared/contract";

const isMoney = (v: FieldValue): v is Money => v !== null && typeof v === "object";

// Deep equality for field values. Money compares the amount and currency strings as given:
// "4415.30" and "4415.3" are different values, because the agent's string is what the reviewer sees.
export function sameValue(a: FieldValue, b: FieldValue): boolean {
  if (isMoney(a) || isMoney(b)) return isMoney(a) && isMoney(b) && a.amount === b.amount && a.currency === b.currency;
  return a === b;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

// Whether a value has the shape its value_type promises. null ("not found") matches every type.
export function valueMatchesType(t: ValueType, v: FieldValue): boolean {
  if (v === null) return true;
  switch (t) {
    case "text":
    case "long_text":
      return typeof v === "string";
    case "money":
      return isMoney(v);
    case "date":
      return typeof v === "string" && DATE.test(v);
    case "time":
      return typeof v === "string" && TIME.test(v);
    case "number":
      return typeof v === "number";
    case "boolean":
      return typeof v === "boolean";
  }
}

// English month names, fixed rather than from Intl: citation matching needs the exact words the
// documents use, and en-IE Intl writes "Sept" where the design wants "Sep" (it varies by ICU version).
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type DateParts = { year: string; month: string; day: string; monthName: (typeof MONTHS)[number] };

// Splits "2026-09-13" into its parts as strings, or null if it is not YYYY-MM-DD with a real month.
// No Date object, so no time zone can shift the day.
export function isoDateParts(iso: string): DateParts | null {
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) ?? [];
  const monthName = MONTHS[Number(month) - 1];
  return year && month && day && monthName ? { year, month, day, monthName } : null;
}
