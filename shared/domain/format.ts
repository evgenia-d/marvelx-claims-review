// Display formatting for values. Intl only, locale en-IE (euro amounts, day-month order).
import type { FieldValue, Money, ValueType } from "@shared/contract";
import { isoDateParts } from "./values";

const LOCALE = "en-IE";

// The amount string goes to Intl as is (exact decimal, no float). maximumFractionDigits 20 (Intl's limit)
// keeps every decimal up to 20, so "1.005" is never rounded; the currency's own minimum still pads "4415.3".
export function formatMoney({ amount, currency }: Money): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: 20 }).format(
      amount as Intl.StringNumericLiteral,
    );
  } catch {
    // A currency code Intl rejects: show the amount exactly as given rather than fail.
    return `${amount} ${currency}`;
  }
}

// "2026-09-13" → "13 Sep 2026". Built from the string's own parts, so no time zone can shift the day.
// Month abbreviations are fixed: en-IE Intl writes "Sept" in current ICU versions.
export function formatDate(iso: string): string {
  const parts = isoDateParts(iso);
  if (!parts) return iso;
  return `${parts.day.replace(/^0/, "")} ${parts.monthName.slice(0, 3)} ${parts.year}`;
}

// "10:06" in the viewer's time zone. timeZone is for tests; the app leaves it out.
export function formatInstant(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(
    new Date(iso),
  );
}

// "18 Sep, 10:05" in the viewer's time zone (queue received / updated). timeZone is for tests.
export function formatDayTime(iso: string, timeZone?: string): string {
  const day = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone }).formatToParts(new Date(iso));
  const part = (type: string) => day.find((p) => p.type === type)?.value ?? "";
  // Fixed 3-letter months, as in formatDate (en-IE Intl writes "Sept").
  return `${part("day")} ${part("month").slice(0, 3)}, ${formatInstant(iso, timeZone)}`;
}

const NUMBER = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 20 });

// The value as display text, or null for an empty value (the caller shows "Not found").
// Dispatches on the value's own shape, so a value that doesn't match its type still shows sensibly.
export function formatValue(t: ValueType, v: FieldValue): string | null {
  if (v === null) return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return NUMBER.format(v);
  if (typeof v === "object") return formatMoney(v);
  if (t === "date") return formatDate(v);
  return v;
}
