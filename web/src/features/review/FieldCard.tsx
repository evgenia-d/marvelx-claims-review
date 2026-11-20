import type { ValueType } from "@shared/contract";
import { formatValue, type FieldState, type FieldView } from "@shared/domain";
import { Badge, ValueBox, type ValueBoxSize } from "../../ui";
import { AgentLine } from "./AgentLine";
import { attentionText, percent } from "./fieldText";

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

type Props = { view: FieldView; field: FieldState; group: string | null; startedAt: string | null };

/** The open field, read-only in D1: name and tags, value, agent line, what changed and why. */
export function FieldCard({ view, field, group, startedAt }: Props) {
  const value = formatValue(view.value_type, view.shown.value);
  const size = SIZE[view.value_type];
  const confidence = confidenceChange(field);

  return (
    <article aria-labelledby="open-field-name">
      <div className="flex h-12 items-center border-b border-line px-6 text-base text-ink-3">{group}</div>
      <div className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="open-field-name" className="font-serif text-lg font-medium tracking-tight text-ink">
            {view.label}
          </h2>
          <span className="flex flex-wrap gap-1">
            {view.attention.map((reason) => (
              <Badge key={reason} shape="tag" tone="attn">
                {attentionText(reason, view)}
              </Badge>
            ))}
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

        {value === null ? (
          <ValueBox tone="muted" size={size}>
            <span className="font-mono italic">Not found in documents</span>
          </ValueBox>
        ) : (
          <ValueBox tone={view.shown.by === "you" ? "tint" : "default"} size={size}>
            {value}
          </ValueBox>
        )}

        <AgentLine field={field} startedAt={startedAt} />

        {/* Before → after: the last value change and the agent's reason (the History disclosure is cut). */}
        {view.previous && (
          <div className="flex flex-col gap-1 text-sm text-ink-2">
            <p>
              <span className="text-ink-3">Agent changed it: </span>
              <span className="font-mono text-ink">
                {formatValue(view.value_type, view.previous.value) ?? "Not found"} →{" "}
                {formatValue(view.value_type, view.agent.value) ?? "Not found"}
              </span>
            </p>
            {view.previous.reason && <p>{view.previous.reason}</p>}
          </div>
        )}
        {confidence?.reason && (
          <p className="text-sm text-ink-2">
            <span className="text-ink-3">Why confidence changed: </span>
            {confidence.reason}
          </p>
        )}
      </div>
    </article>
  );
}
