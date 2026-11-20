import type { Decision } from "@shared/contract";
import { formatInstant } from "@shared/domain";
import { Badge, IconCheck, IconPencil, IconSwap } from "../../ui";
import { DECISION_VERB } from "./fieldText";

const ICON = { accept: IconCheck, correct: IconPencil, override: IconSwap } as const satisfies Record<
  Decision["action"],
  unknown
>;

/** "Not decided" or "You · accepted 10:06": whose value this is, in words and an icon. */
export function DecisionPill({ decision }: { decision: Decision | null }) {
  if (!decision) {
    return (
      <Badge shape="pill" tone="plain">
        Not decided
      </Badge>
    );
  }
  const Icon = ICON[decision.action];
  return (
    <Badge shape="pill" tone="you" icon={<Icon size={12} />}>
      You · {DECISION_VERB[decision.action]} {formatInstant(decision.at)}
    </Badge>
  );
}
