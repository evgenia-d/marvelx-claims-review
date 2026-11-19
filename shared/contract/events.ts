import { z } from "zod";

export const Money = z.object({ amount: z.string().regex(/^-?\d+(\.\d+)?$/), currency: z.string().length(3) });
export const ValueType = z.enum(["text", "long_text", "money", "date", "time", "number", "boolean"]);
// field_revised carries no value_type, so the value is the loose union; fieldView pairs it with the extracted value_type.
export const FieldValue = z.union([z.string(), z.number(), z.boolean(), Money]).nullable();
export const Source = z.object({ document_id: z.string(), start: z.number().int().min(0), end: z.number().int().min(0) }).nullable();

const envelope = { seq: z.number().int().positive(), at_ms: z.number().int().min(0), claim_id: z.string() };
export const RunEvent = z.discriminatedUnion("type", [
  z.object({ ...envelope, type: z.literal("run_started"), payload: z.object({ started_at: z.iso.datetime({ offset: true }) }) }),
  z.object({ ...envelope, type: z.literal("step_started"), payload: z.object({ step_id: z.string(), label: z.string() }) }),
  z.object({ ...envelope, type: z.literal("step_finished"), payload: z.object({ step_id: z.string(), outcome: z.enum(["ok", "warning"]), note: z.string().optional() }) }),
  z.object({ ...envelope, type: z.literal("summary_delta"), payload: z.object({ text: z.string() }) }),
  z.object({ ...envelope, type: z.literal("field_extracted"), payload: z.object({ field_id: z.string(), label: z.string(), value: FieldValue, value_type: ValueType, confidence: z.number().min(0).max(1), source: Source }) }),
  z.object({ ...envelope, type: z.literal("field_revised"), payload: z.object({ field_id: z.string(), value: FieldValue, confidence: z.number().min(0).max(1), source: Source, reason: z.string() }) }),
  z.object({ ...envelope, type: z.literal("confidence_changed"), payload: z.object({ field_id: z.string(), confidence: z.number().min(0).max(1), reason: z.string() }) }),
  z.object({ ...envelope, type: z.literal("run_finished"), payload: z.object({ overall_confidence: z.number().min(0).max(1) }) }),
  z.object({ ...envelope, type: z.literal("run_failed"), payload: z.object({ step_id: z.string(), error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }) }) }),
]);

export type Money = z.infer<typeof Money>;
export type ValueType = z.infer<typeof ValueType>;
export type FieldValue = z.infer<typeof FieldValue>;
export type Source = z.infer<typeof Source>;
export type RunEvent = z.infer<typeof RunEvent>;
