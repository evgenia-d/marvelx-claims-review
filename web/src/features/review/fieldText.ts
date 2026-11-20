// Words for field states, shared by the row, the card and the agent line, so they always match.
import type { Decision } from "@shared/contract";
import { confidenceLevel, type Attention, type FieldView } from "@shared/domain";

const PERCENT = new Intl.NumberFormat("en-IE", { style: "percent" });

export const percent = (confidence: number) => PERCENT.format(confidence);

const LEVEL = { low: "Low", medium: "Medium", high: "High" } as const;

// "High 93%"
export const confidenceText = (confidence: number) => `${LEVEL[confidenceLevel(confidence)]} ${percent(confidence)}`;

export function attentionText(reason: Attention, view: FieldView): string {
  switch (reason) {
    case "low_confidence":
      return confidenceText(view.agent.confidence);
    case "revised_after_decision":
      return "Changed after you";
    case "no_source":
      return "No source";
    case "not_in_citation":
      return "Not in source";
    case "step_warning":
      return "Step warning";
    case "empty_value":
      return "Empty";
    default: {
      const never: never = reason;
      return never;
    }
  }
}

// A grey or blue tag for a field that doesn't need you: what happened to it.
export function infoTag(view: FieldView): { text: string; tone: "you" | "plain" } | null {
  if (view.status === "corrected") return { text: "Corrected", tone: "you" };
  if (view.status === "overridden") return { text: "Replaced", tone: "you" };
  if (view.status === "pending" && view.previous) return { text: "Changed", tone: "plain" };
  return null;
}

export function statusText(view: FieldView): string {
  if (view.needsYou) return "needs you";
  switch (view.status) {
    case "pending":
      return "not decided";
    case "accepted":
      return "you accepted";
    case "corrected":
      return "you corrected";
    case "overridden":
      return "you replaced";
    case "revised_after_decision":
      return "changed after your decision";
    default: {
      const never: never = view.status;
      return never;
    }
  }
}

// Past tense of a decision. The UI says "Reject" for the override action, so it reads "replaced".
export const DECISION_VERB = {
  accept: "accepted",
  correct: "corrected",
  override: "replaced",
} as const satisfies Record<Decision["action"], string>;
