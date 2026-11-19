import { z } from "zod";
import { FieldValue } from "./events";

// based_on = the field's agent version the reviewer saw (see "Agent version" in plans/PLAN.md).
const BasedOn = z.number().int().positive();
// One definition, so the limit can't drift between the request body and the stored record.
const OverrideReason = z.string().trim().min(1).max(200);

export const DecisionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), based_on: BasedOn }),
  z.object({ action: z.literal("correct"), based_on: BasedOn, value: FieldValue }),
  z.object({ action: z.literal("override"), based_on: BasedOn, value: FieldValue, reason: OverrideReason }),
]);
// The stored record has the same per-action shape as DecisionInput, so an override always has a reason
// and an accept never carries a value.
const decisionMeta = {
  claim_id: z.string(), field_id: z.string(),
  based_on: BasedOn,
  at: z.iso.datetime({ offset: true }), // set by the server
};
export const Decision = z.discriminatedUnion("action", [
  z.object({ ...decisionMeta, action: z.literal("accept") }),
  z.object({ ...decisionMeta, action: z.literal("correct"), value: FieldValue }),
  z.object({ ...decisionMeta, action: z.literal("override"), value: FieldValue, reason: OverrideReason }),
]);
export const DecisionsResponse = z.object({ decisions: z.array(Decision) });
export const ApiError = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

export type DecisionInput = z.infer<typeof DecisionInput>;
export type Decision = z.infer<typeof Decision>;
export type DecisionsResponse = z.infer<typeof DecisionsResponse>;
export type ApiError = z.infer<typeof ApiError>;
