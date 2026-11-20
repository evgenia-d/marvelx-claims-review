import type { DecisionInput } from "@shared/contract";
import type { FieldView } from "@shared/domain";

// "Keep mine" saves the value the reviewer sees against the agent's new version. A stored accept
// has no value, so a kept accept becomes a correction with the value accepted then (decidedOn,
// from fieldView). Re-sending the accept would accept the agent's new value instead.
export function keepMine(view: FieldView): DecisionInput | null {
  const { decision, decidedOn } = view;
  const based_on = view.agent.version;
  if (!decision) return null;
  switch (decision.action) {
    case "accept":
      return decidedOn ? { action: "correct", based_on, value: decidedOn.value } : null;
    case "correct":
      return { action: "correct", based_on, value: decision.value };
    case "override":
      return { action: "override", based_on, value: decision.value, reason: decision.reason };
    default: {
      const never: never = decision;
      return never;
    }
  }
}
