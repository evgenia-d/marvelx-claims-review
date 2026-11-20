import { useId, type FormEvent, type KeyboardEvent } from "react";
import type { DecisionInput } from "@shared/contract";
import { isMoney, parseInput, type FieldView } from "@shared/domain";
import { Busy, Button, IconCheck, TextInput, type ValueBoxSize } from "../../ui";
import type { FormMode } from "./DecisionButtons";

/** `basedOn` is the agent version the reviewer saw when the form opened, not the one at Save. */
export type Draft = { mode: FormMode; value: string; reason: string; basedOn: number };

type Props = {
  view: FieldView;
  draft: Draft;
  /** Same size as the value box, so the input matches the value it edits. */
  size: ValueBoxSize;
  onChange: (draft: Draft) => void;
  onSave: (input: DecisionInput) => void;
  onCancel: () => void;
  /** A save is in flight: Save shows the busy dot, and Save and Cancel are blocked. */
  saving?: boolean;
};

const REASON_MAX = 200; // OverrideReason in the contract

// The input holds only the amount, so money takes the currency of the value it replaces. Every fixture is EUR.
function currencyOf(view: FieldView): string {
  const agent = view.agent.value;
  if (isMoney(agent)) return agent.currency;
  const decided = view.decidedOn?.value ?? null;
  return isMoney(decided) ? decided.currency : "EUR";
}

/** Correct (starts from the agent's value) or Reject (starts empty, needs a reason). Enter saves, Escape cancels. */
export function DecisionForm({ view, draft, size, onChange, onSave, onCancel, saving = false }: Props) {
  const valueHelp = useId();
  const reasonHelp = useId();
  const parsed = parseInput(view.value_type, draft.value, currencyOf(view));
  const needsReason = draft.mode === "override" && draft.reason.trim() === "";
  const blocked = !parsed.ok || needsReason;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!parsed.ok || needsReason || saving) return;
    const based_on = draft.basedOn;
    onSave(
      draft.mode === "correct"
        ? { action: "correct", based_on, value: parsed.value }
        : { action: "override", based_on, value: parsed.value, reason: draft.reason.trim() },
    );
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && !saving) onCancel();
  }

  const valueProps = {
    label: "Your value",
    value: draft.value,
    autoFocus: true,
    placeholder: draft.mode === "override" ? "Enter the right value" : undefined,
    "aria-invalid": !parsed.ok,
    "aria-describedby": parsed.ok ? undefined : valueHelp,
  };

  return (
    <form onSubmit={submit} onKeyDown={onKeyDown} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {size === "long" ? (
          <TextInput {...valueProps} size="long" onChange={(e) => onChange({ ...draft, value: e.target.value })} />
        ) : (
          <TextInput {...valueProps} size={size} onChange={(e) => onChange({ ...draft, value: e.target.value })} />
        )}
        {!parsed.ok && (
          <p id={valueHelp} className="text-sm text-attn">
            {parsed.message}
          </p>
        )}
      </div>
      {draft.mode === "override" && (
        <div className="flex flex-col gap-1">
          <TextInput
            label="Reason"
            size="text"
            value={draft.reason}
            maxLength={REASON_MAX}
            placeholder="Why the agent's value is wrong (one line)"
            aria-describedby={needsReason ? reasonHelp : undefined}
            onChange={(e) => onChange({ ...draft, reason: e.target.value })}
          />
          {needsReason && (
            <p id={reasonHelp} className="text-sm text-ink-3">
              A reason is needed to replace the value.
            </p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" icon={saving ? <Busy /> : <IconCheck />} aria-disabled={blocked || saving || undefined}>
          Save
        </Button>
        <Button variant="secondary" aria-disabled={saving || undefined} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
