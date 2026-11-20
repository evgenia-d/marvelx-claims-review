import { useId, useRef, useState } from "react";
import type { ClaimDetail, DecisionInput, ValueType } from "@shared/contract";
import { formatValue, inputText, type FieldState, type FieldView } from "@shared/domain";
import { useDecide, useUndo } from "../../api/decisions";
import { ApiFailure } from "../../api/http";
import { useRunStore } from "../../api/runStore";
import { Badge, ValueBox, useIsLaptop, type ValueBoxSize } from "../../ui";
import { AgentLine } from "./AgentLine";
import { CitedText } from "./CitedText";
import { DecisionButtons, type FormMode } from "./DecisionButtons";
import { DecisionForm, type Draft } from "./DecisionForm";
import { DecisionPill } from "./DecisionPill";
import { FieldDetails } from "./FieldDetails";
import { PhoneActionBar } from "./PhoneActionBar";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { SaveFailed, type SaveFailure } from "./SaveFailed";
import { DECISION_VERB, attentionText, percent } from "./fieldText";

// Value size follows the field's type, never its length, so a revision never resizes it.
const SIZE: Record<ValueType, ValueBoxSize> = {
  money: "num",
  date: "num",
  time: "num",
  number: "num",
  boolean: "num",
  text: "text",
  long_text: "long",
};

// A confidence-only change as the agent's latest entry: the confidence before it and the reason.
function confidenceChange(field: FieldState): { from: number; reason: string | null } | null {
  if (field.current.kind !== "confidence") return null;
  const before = field.history.at(-2);
  return before ? { from: before.confidence, reason: field.current.reason } : null;
}

// A 409 agent_revised keeps the draft and asks to decide again; anything else was rolled back.
const failureOf = (error: Error): SaveFailure =>
  error instanceof ApiFailure && error.status === 409 && error.code === "agent_revised" ? "refused" : "failed";

const shownValue = (view: FieldView, v: FieldView["shown"]["value"]) => formatValue(view.value_type, v) ?? "Not found";

type Props = {
  claimId: string;
  view: FieldView;
  field: FieldState;
  group: string | null;
  startedAt: string | null;
  completedAt: string | null;
  /** The claim's documents: the phone shows the cited passage under the value. */
  documents: ClaimDetail["documents"];
  /** Called once a decision is saved, unless a later click on this field came after it. */
  onDecided?: () => void;
  /** Focus the field name when the card opens: set when the screen moved here after a decision. */
  focusOnMount?: boolean;
};

// A ref callback runs when the element mounts, so this focuses the name once per opened field.
const focusElement = (el: HTMLElement | null) => el?.focus();

/**
 * The open field: name and tags, value, pill and agent line, decisions, details. The caller keys it
 * by field id, so the draft and the save message belong to one field and survive agent updates.
 */
export function FieldCard({ claimId, view, field, group, startedAt, completedAt, documents, onDecided, focusOnMount }: Props) {
  const laptop = useIsLaptop();
  const value = formatValue(view.value_type, view.shown.value);
  const size = SIZE[view.value_type];
  const confidence = confidenceChange(field);
  // Local until saved: cleared only when the save succeeds, so a refused or failed save keeps the text.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  // Cancel / Escape give focus back to the button that opened the form.
  const [returnFocusTo, setReturnFocusTo] = useState<FormMode | null>(null);
  const decide = useDecide(claimId, view.field_id);
  const undo = useUndo(claimId, view.field_id);
  const pillId = useId();
  // Counts this field's clicks (decide, undo, opening a draft). A save moves the screen on only if
  // it is still the last click: Accept then a quick Undo, or Correct, stays on the field.
  const lastClick = useRef(0);

  const save = (input: DecisionInput, fromDraft: boolean) => {
    setFailure(null);
    const click = ++lastClick.current;
    decide.mutate(input, {
      onSuccess: () => {
        if (fromDraft) setDraft(null);
        if (click === lastClick.current) onDecided?.();
      },
      onError: (error) => {
        const kind = failureOf(error);
        setFailure(kind);
        // The server is ahead: rebase the draft on the newest version this browser has, so the next
        // Save goes once the reviewer has looked again. Read from the store in the handler, not in render.
        if (fromDraft && kind === "refused") {
          const latest = useRunStore.getState().runs[claimId]?.fields[view.field_id]?.version;
          setDraft((d) => (d && latest !== undefined ? { ...d, basedOn: Math.max(d.basedOn, latest) } : d));
        }
      },
    });
  };
  // A draft is saved against the version the reviewer saw when it opened. If the agent changed the
  // value since, nothing is sent: the reviewer is told, the draft moves to the new version and keeps
  // its text, and the next Save goes.
  const saveDraft = (input: DecisionInput) => {
    if (draft && draft.basedOn !== view.agent.version) {
      setFailure("refused");
      setDraft({ ...draft, basedOn: view.agent.version });
      return;
    }
    save(input, true);
  };
  const undoDecision = () => {
    setFailure(null);
    lastClick.current++;
    // A failed click queued before this undo may have left a message; the undo is now the last word.
    undo.mutate(undefined, { onSuccess: () => setFailure(null), onError: (error) => setFailure(failureOf(error)) });
  };
  // Correct starts from the agent's value as the input reads it; Reject starts empty. Opening a
  // draft counts as a click: a save still in flight then lands without moving the screen on.
  const open = (mode: FormMode) => {
    lastClick.current++;
    setReturnFocusTo(null);
    setDraft({
      mode,
      value: mode === "correct" ? inputText(view.agent.value) : "",
      reason: "",
      basedOn: view.agent.version,
    });
  };
  // T3: the decision stays, and the card says what the agent changed under it.
  const revisedAfter = view.status === "revised_after_decision" && view.decidedOn ? view.decision : null;

  const buttons = (bar: boolean) => (
    <DecisionButtons
      view={view}
      bar={bar}
      returnFocusTo={returnFocusTo}
      onDecide={(input) => save(input, false)}
      onUndo={undoDecision}
      onOpen={open}
      acceptedNoteId={pillId}
    />
  );
  const showButtons = completedAt === null && !draft;

  return (
    // On a phone the card fills the screen under its top bar, so the action bar sits at the bottom.
    <article aria-labelledby="open-field-name" className="flex flex-1 flex-col">
      {/* On a phone the screen's top bar already names the group. */}
      {laptop && <div className="flex h-12 items-center border-b border-line px-6 text-base text-ink-3">{group}</div>}
      <div className="flex flex-1 flex-col gap-3 p-4 lg:p-6">
        {/* Name and tags on the left, decisions pinned top-right (below lg they wrap under the name).
            The tags wrap inside their own column, so they never push the buttons around. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 lg:min-h-9">
            <h2
              id="open-field-name"
              tabIndex={-1}
              ref={focusOnMount ? focusElement : undefined}
              className="font-serif text-lg font-medium tracking-tight text-ink"
            >
              {view.label}
            </h2>
            <span className="flex flex-wrap gap-1">
              {view.attention.map((reason) => (
                <Badge key={reason} shape="tag" tone="attn">
                  {attentionText(reason, view)}
                </Badge>
              ))}
              {/* "Changed after you" comes from view.attention above. */}
              {view.status === "revised_after_decision" && (
                <Badge shape="tag" tone="attn">
                  Blocks sign-off
                </Badge>
              )}
              {view.status === "pending" && view.previous && (
                <Badge shape="tag" tone="plain">
                  Changed by agent
                </Badge>
              )}
              {confidence && (
                <Badge shape="tag" tone="plain">
                  Confidence {percent(confidence.from)} → {percent(view.agent.confidence)}
                </Badge>
              )}
            </span>
          </div>
          {/* While a draft is open, its Save / Cancel below are the only actions. On a phone the buttons are in the bar. */}
          {completedAt !== null ? (
            <div className="lg:flex lg:min-h-9 lg:items-center">
              <ReadOnlyNote completedAt={completedAt} />
            </div>
          ) : (
            showButtons && laptop && <div className="shrink-0">{buttons(false)}</div>
          )}
        </div>

        {value === null ? (
          <ValueBox tone="muted" size={size}>
            <span className="font-mono italic">Not found in documents</span>
          </ValueBox>
        ) : (
          <ValueBox tone={view.shown.by === "you" ? "tint" : "default"} size={size}>
            {value}
          </ValueBox>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span id={pillId}>
            <DecisionPill decision={view.decision} />
          </span>
          <AgentLine field={field} startedAt={startedAt} />
        </div>

        {!laptop && <CitedText view={view} documents={documents} />}

        {/* Before → after: the last value change (its reason is under "Why it changed"). After a
            decision, it says the agent revised the value the reviewer decided on. */}
        {revisedAfter ? (
          <div className="flex flex-col gap-1 text-sm text-ink-2">
            <p>
              <span className="text-attn">Agent revised this after you {DECISION_VERB[revisedAfter.action]}: </span>
              <span className="font-mono text-ink">
                {shownValue(view, view.decidedOn?.value ?? null)} → {shownValue(view, view.agent.value)}
              </span>
            </p>
            {/* T3 shows the reason with the line, not behind a disclosure. */}
            {view.previous?.reason && <p>{view.previous.reason}</p>}
          </div>
        ) : (
          view.previous && (
            <p className="text-sm text-ink-2">
              <span className="text-ink-3">Agent changed it: </span>
              <span className="font-mono text-ink">
                {shownValue(view, view.previous.value)} → {shownValue(view, view.agent.value)}
              </span>
            </p>
          )
        )}
        {confidence?.reason && (
          <p className="text-sm text-ink-2">
            <span className="text-ink-3">Why confidence changed: </span>
            {confidence.reason}
          </p>
        )}

        {failure && <SaveFailed kind={failure} />}
        {completedAt === null && draft && (
          <DecisionForm
            view={view}
            draft={draft}
            size={size}
            onChange={setDraft}
            onSave={saveDraft}
            onCancel={() => {
              setReturnFocusTo(draft.mode);
              setDraft(null);
            }}
          />
        )}

        <FieldDetails
          whyChanged={revisedAfter ? null : (view.previous?.reason ?? null)}
          yourReason={view.decision?.action === "override" ? view.decision.reason : null}
        />
      </div>
      {!laptop && showButtons && <PhoneActionBar>{buttons(true)}</PhoneActionBar>}
    </article>
  );
}
