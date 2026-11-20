import type { DecisionInput } from "@shared/contract";
import type { FieldView } from "@shared/domain";
import { keepMine } from "./keepMine";
import { Busy, Button, IconButton, IconCheck, IconPencil, IconSwap, IconUndo } from "../../ui";

export type FormMode = "correct" | "override";

type Props = {
  view: FieldView;
  onDecide: (input: DecisionInput) => void;
  onUndo: () => void;
  onOpen: (mode: FormMode) => void;
  /** The element that says what was decided (the decision pill): the reason a blocked Accept gives. */
  acceptedNoteId: string;
  /** A save is in flight: every button is blocked. */
  saving?: boolean;
  /** The button that started the save shows the busy dot in place of its icon. Keep mine has no icon, so it shows none: the blocked buttons and aria-busy carry the state. */
  savingFrom?: "primary" | "undo" | null;
  /** In the phone action bar: the buttons share the width, and wrap when they don't fit. */
  bar?: boolean;
  /** The button that opened the form just closed: it takes focus back when these buttons mount. */
  returnFocusTo?: FormMode | null;
};

const focusElement = (el: HTMLElement | null) => el?.focus();

/**
 * The decisions for the open field, per its state. Never on rows, never for many fields at once.
 *
 * Anchored right, in the same place on every field, so a reviewer going through fields doesn't
 * move the mouse: the primary is always the rightmost button, at a fixed width, so Correct and
 * Reject never shift. It is "Use new" after an agent revision, a blocked "Accept" while any decision
 * stands (an accept, a correction or a rejection; Undo, then Accept, goes back to the agent's
 * value), and "Accept" otherwise. Buttons that come and go (Undo, Keep mine) sit at the left end.
 */
export function DecisionButtons({ view, onDecide, onUndo, onOpen, acceptedNoteId, saving = false, savingFrom = null, bar = false, returnFocusTo = null }: Props) {
  const based_on = view.agent.version;
  const accept = () => onDecide({ action: "accept", based_on });
  const kept = view.status === "revised_after_decision" ? keepMine(view) : null;
  // Once any decision stands, Accept is blocked: one click must not replace what the reviewer
  // decided (or typed) with the agent's value. Undo, then Accept, is the way back to it.
  const blocked = view.decision !== null && view.status !== "revised_after_decision";
  // In the phone bar the buttons share the width (grow from their own width, so they wrap rather than squash) and keep their text and icon.
  const grow = bar ? "grow" : undefined;

  return (
    <div aria-busy={saving || undefined} className={bar ? "flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2 lg:justify-end"}>
      {view.decision && <IconButton label="Undo decision" icon={savingFrom === "undo" ? <Busy /> : <IconUndo />} onClick={onUndo} aria-disabled={saving || undefined} tooltipAlign="end" />}
      {kept && (
        <Button variant="secondary" className={grow} compact={bar} aria-disabled={saving || undefined} onClick={() => onDecide(kept)}>
          Keep mine
        </Button>
      )}
      <Button variant="secondary" className={grow} compact={bar} icon={<IconPencil />} aria-disabled={saving || undefined} ref={returnFocusTo === "correct" ? focusElement : undefined} onClick={() => onOpen("correct")}>
        Correct
      </Button>
      <Button variant="secondary" className={grow} compact={bar} icon={<IconSwap />} aria-disabled={saving || undefined} ref={returnFocusTo === "override" ? focusElement : undefined} onClick={() => onOpen("override")}>
        Reject
      </Button>
      <Button
        variant="primary"
        icon={savingFrom === "primary" ? <Busy /> : <IconCheck />}
        onClick={accept}
        className={bar ? grow : "w-28"}
        compact={bar}
        aria-disabled={blocked || saving || undefined}
        aria-describedby={blocked ? acceptedNoteId : undefined}
      >
        {view.status === "revised_after_decision" ? "Use new" : "Accept"}
      </Button>
    </div>
  );
}
