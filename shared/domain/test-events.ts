// Builders for small hand-written event lists in domain tests. Each returns a valid RunEvent.
// at_ms is derived from seq so tests never think about delivery times.
import type { FieldValue, RunEvent, Source, ValueType } from "@shared/contract";

export const TEST_CLAIM = "CLM-TEST-0001";
const SRC: Source = { document_id: "doc-1", start: 0, end: 4 };

const envelope = (seq: number) => ({ seq, at_ms: seq * 100, claim_id: TEST_CLAIM });

type Extracted = Extract<RunEvent, { type: "field_extracted" }>;

// Picks the natural value_type for a value so most tests need no override.
function typeOf(value: FieldValue): ValueType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value !== null && typeof value === "object") return "money";
  return "text";
}

export const m = (amount: string, currency = "EUR") => ({ amount, currency });

export const started = (seq: number, started_at = "2026-09-18T10:06:12+02:00"): RunEvent => ({
  ...envelope(seq),
  type: "run_started",
  payload: { started_at },
});

export const extracted = (
  seq: number,
  field_id: string,
  value: FieldValue,
  overrides: Partial<Extracted["payload"]> = {},
): RunEvent => ({
  ...envelope(seq),
  type: "field_extracted",
  payload: { field_id, label: field_id, value, value_type: typeOf(value), confidence: 0.9, source: SRC, ...overrides },
});

export const revised = (seq: number, field_id: string, value: FieldValue, reason = "Revised.", c = 0.95): RunEvent => ({
  ...envelope(seq),
  type: "field_revised",
  payload: { field_id, value, confidence: c, source: SRC, reason },
});

export const confidence = (seq: number, field_id: string, c: number, reason = "Confidence changed."): RunEvent => ({
  ...envelope(seq),
  type: "confidence_changed",
  payload: { field_id, confidence: c, reason },
});

export const stepStarted = (seq: number, step_id: string, label = step_id): RunEvent => ({
  ...envelope(seq),
  type: "step_started",
  payload: { step_id, label },
});

export const stepFinished = (
  seq: number,
  step_id: string,
  outcome: "ok" | "warning" = "ok",
  note?: string,
): RunEvent => ({
  ...envelope(seq),
  type: "step_finished",
  payload: note === undefined ? { step_id, outcome } : { step_id, outcome, note },
});

export const delta = (seq: number, text: string): RunEvent => ({
  ...envelope(seq),
  type: "summary_delta",
  payload: { text },
});

export const finished = (seq: number, overall_confidence = 0.8): RunEvent => ({
  ...envelope(seq),
  type: "run_finished",
  payload: { overall_confidence },
});

export const failed = (
  seq: number,
  step_id: string,
  error = { code: "policy_service_unavailable", message: "The policy service did not respond.", retryable: true },
): RunEvent => ({
  ...envelope(seq),
  type: "run_failed",
  payload: { step_id, error },
});
