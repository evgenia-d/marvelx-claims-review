// Every field of a claim as the reviewer sees it. The one place that resolves a field's context
// (cited text, extracting step), so the queue's needs_you and the review header can't disagree.
import type { Decision } from "@shared/contract";
import { citedText } from "./citation";
import { fieldView, type FieldContext, type FieldView } from "./fieldView";
import type { FieldState, RunState } from "./run";

function fieldContext(run: RunState, field: FieldState, docs: Record<string, string>): FieldContext {
  const stepOutcome = run.steps.find((s) => s.step_id === field.step_id)?.state ?? null;
  return { cited: citedText(docs, field.current.source), stepOutcome };
}

// Views in field_order (arrival order). docs maps document_id to its text.
export function claimViews(run: RunState, decisions: Record<string, Decision>, docs: Record<string, string>): FieldView[] {
  return run.field_order.flatMap((id) => {
    const field = run.fields[id];
    return field ? [fieldView(field, decisions[id], fieldContext(run, field, docs))] : [];
  });
}

export function needsYouCount(views: FieldView[]): number {
  return views.filter((v) => v.needsYou).length;
}
