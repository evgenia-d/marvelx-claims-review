// One field as the reviewer sees it: the agent's history merged with the reviewer's decision.
// The merge rule lives here and only here: a human decision is never overwritten.
import type { Decision, FieldValue, ValueType } from "@shared/contract";
import { citationCheck, type CitationCheck } from "./citation";
import { confidenceLevel } from "./confidence";
import type { FieldEntry, FieldState, StepState } from "./run";

export type FieldStatus = "pending" | "accepted" | "corrected" | "overridden" | "revised_after_decision";
// The order here is the order reasons are listed in.
export type Attention =
  | "low_confidence"
  | "revised_after_decision"
  | "no_source"
  | "not_in_citation"
  | "step_warning"
  | "empty_value";
// Resolved by the caller: the text the agent's latest source points at (citedText) and the
// outcome of the step that extracted the field (null while it runs or if unknown).
export type FieldContext = { cited: string | null; stepOutcome: StepState | null };
export type FieldView = {
  field_id: string;
  label: string;
  value_type: ValueType;
  status: FieldStatus;
  shown: { value: FieldValue; by: "agent" | "you" };
  agent: FieldEntry; // latest agent entry
  decidedOn: FieldEntry | null; // agent entry the decision was made against
  previous: { value: FieldValue; reason: string | null } | null; // before the last value change
  decision: Decision | null;
  citation: CitationCheck;
  attention: Attention[];
  needsYou: boolean;
};

// The value before the last value change, with the reason given for that change. Versions move by
// one per value change, so that is the last entry of the previous version and the first of this one.
function previousValue(field: FieldState): FieldView["previous"] {
  const prev = field.history.findLast((e) => e.version === field.version - 1);
  const change = field.history.find((e) => e.version === field.version);
  return prev && change ? { value: prev.value, reason: change.reason } : null;
}

type ActionStatus = Record<Decision["action"], FieldStatus>;
const STATUS = { accept: "accepted", correct: "corrected", override: "overridden" } as const satisfies ActionStatus;

type Merged = { status: FieldStatus; shown: FieldView["shown"]; decidedOn: FieldEntry | null };

// Merge rule: a decision always wins over the agent; if the agent changed the value since, it is flagged, never replaced.
function merge(field: FieldState, decision: Decision | undefined): Merged {
  if (!decision) return { status: "pending", shown: { value: field.current.value, by: "agent" }, decidedOn: null };

  // The latest entry of the version the reviewer saw. None when the decision is ahead of this
  // state (the browser is still catching up): the decision is then treated as current.
  const decidedOn = field.history.findLast((e) => e.version === decision.based_on) ?? null;
  // An accept confirms the value the reviewer saw, not whatever the agent says now.
  const shown: FieldView["shown"] =
    decision.action === "accept"
      ? { value: (decidedOn ?? field.current).value, by: "agent" }
      : { value: decision.value, by: "you" };
  const status = decision.based_on < field.version ? "revised_after_decision" : STATUS[decision.action];
  return { status, shown, decidedOn };
}

export function fieldView(field: FieldState, decision: Decision | undefined, ctx: FieldContext): FieldView {
  const agent = field.current;
  const { status, shown, decidedOn } = merge(field, decision);
  const citation = citationCheck(field.value_type, agent.value, ctx.cited);

  // Always computed from the agent's latest entry, so the tags stay visible after a decision.
  const attention: Attention[] = [];
  if (confidenceLevel(agent.confidence) === "low") attention.push("low_confidence");
  if (status === "revised_after_decision") attention.push("revised_after_decision");
  // A citation that can't be resolved (unknown document, offsets past the text) is no usable source.
  if (agent.source === null || ctx.cited === null) attention.push("no_source");
  if (citation === "not_found") attention.push("not_in_citation");
  if (ctx.stepOutcome === "warning") attention.push("step_warning");
  if (agent.value === null) attention.push("empty_value");

  return {
    field_id: field.field_id,
    label: field.label,
    value_type: field.value_type,
    status,
    shown,
    agent,
    decidedOn,
    previous: previousValue(field),
    decision: decision ?? null,
    citation,
    attention,
    // A current decision answers the field; the tags stay as information.
    needsYou: attention.length > 0 && (status === "pending" || status === "revised_after_decision"),
  };
}
