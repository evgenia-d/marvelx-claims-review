// Field views for the review screen, built with the same shared claimViews the server uses for the
// queue, so the screen and the queue can't disagree.
import { useShallow } from "zustand/react/shallow";
import type { Decision } from "@shared/contract";
import { claimViews, type FieldView, type ViewsRun } from "@shared/domain";
import { useDecisions, useDocuments } from "../../api/queries";
import { useRunStore } from "../../api/runStore";

const NO_DECISIONS: Record<string, Decision> = {};
const NO_DOCS: Record<string, string> = {};
const NO_RUN: ViewsRun = { field_order: [], fields: {}, steps: [] };

function useDecisionMap(claimId: string): Record<string, Decision> {
  const { data } = useDecisions(claimId);
  return data ? Object.fromEntries(data.decisions.map((d) => [d.field_id, d])) : NO_DECISIONS;
}

// Every field's view, in arrival order. Subscribes to fields, field order and steps only, so a
// summary chunk doesn't rebuild them.
export function useFieldViews(claimId: string): FieldView[] {
  const run = useRunStore(
    useShallow((s): ViewsRun => {
      const r = s.runs[claimId];
      return r ? { field_order: r.field_order, fields: r.fields, steps: r.steps } : NO_RUN;
    }),
  );
  const decisions = useDecisionMap(claimId);
  const docs = useDocuments(claimId).data ?? NO_DOCS;
  return claimViews(run, decisions, docs);
}
