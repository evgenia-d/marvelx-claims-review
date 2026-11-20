import type { DecisionInput } from "@shared/contract";
import type { FieldView } from "@shared/domain";
import { Button, IconButton, IconCheck, IconPencil, IconSwap, IconUndo } from "../../ui";

export type FormMode = "correct" | "override";

type Props = {
  view: FieldView;
  onDecide: (input: DecisionInput) => void;
  onUndo: () => void;
  onOpen: (mode: FormMode) => void;
  /** The element that says the value is accepted: the reason a blocked Accept gives. */
  acceptedNoteId: string;
};

// "Keep mine" saves the value the reviewer sees against the agent's new version. A stored accept
// has no value, so a kept accept becomes a correction with the value accepted then (decidedOn,
// from fieldView). Re-sending the accept would accept the agent's new value instead.
function keepMine(view: FieldView): DecisionInput | null {
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

/**
 * The decisions for the open field, per its state. Never on rows, never for many fields at once.
 *
 * Anchored right, in the same place on every field, so a reviewer going through fields doesn't
 * move the mouse: the primary is always the rightmost button, at a fixed width, so Correct and
 * Reject never shift. It is "Use new" after an agent revision, a blocked "Accept" once the agent's
 * value is accepted, and "Accept" otherwise (after a correction or rejection it goes back to the
 * agent's value). Buttons that come and go (Undo, Keep mine) sit at the left end.
 */
export function DecisionButtons({ view, onDecide, onUndo, onOpen, acceptedNoteId }: Props) {
  const based_on = view.agent.version;
  const accept = () => onDecide({ action: "accept", based_on });
  const kept = view.status === "revised_after_decision" ? keepMine(view) : null;
  const accepted = view.status === "accepted";

  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      {view.decision && <IconButton label="Undo decision" icon={<IconUndo />} onClick={onUndo} tooltipAlign="end" />}
      {kept && (
        <Button variant="secondary" onClick={() => onDecide(kept)}>
          Keep mine
        </Button>
      )}
      <Button variant="secondary" icon={<IconPencil />} onClick={() => onOpen("correct")}>
        Correct
      </Button>
      <Button variant="secondary" icon={<IconSwap />} onClick={() => onOpen("override")}>
        Reject
      </Button>
      <Button
        variant="primary"
        icon={<IconCheck />}
        onClick={accept}
        className="w-28"
        aria-disabled={accepted || undefined}
        aria-describedby={accepted ? acceptedNoteId : undefined}
      >
        {view.status === "revised_after_decision" ? "Use new" : "Accept"}
      </Button>
    </div>
  );
}
