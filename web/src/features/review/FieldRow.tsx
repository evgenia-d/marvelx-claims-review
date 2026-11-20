import type { FieldView } from "@shared/domain";
import { formatValue } from "@shared/domain";
import { Badge, ListRow, StatusGlyph } from "../../ui";
import { attentionText, infoTag, statusText } from "./fieldText";

/** The row button's DOM id, so the phone can focus the row it came back from. */
export const fieldRowId = (fieldId: string) => `row-${fieldId}`;

type Props = {
  view: FieldView;
  /** Fade in on mount: only for a field that arrived after the stream caught up. */
  arrive: boolean;
  selected: boolean;
  /** Filtered out: kept mounted and hidden (ListRow plays its fade-in only once). */
  hidden: boolean;
  onSelect: (fieldId: string) => void;
};

/** One field in the list. Its view comes from the screen's claimViews, like every other field's. */
export function FieldRow({ view, arrive, selected, hidden, onSelect }: Props) {
  const value = formatValue(view.value_type, view.shown.value);
  const glyph = view.needsYou ? "attn" : view.status === "pending" ? "ring" : "done";
  const [first, ...more] = view.needsYou ? view.attention : [];
  const tag = first ? attentionText(first, view) : null;
  const info = first ? null : infoTag(view);

  return (
    <li hidden={hidden}>
      <ListRow
        id={fieldRowId(view.field_id)}
        arrive={arrive}
        glyph={<StatusGlyph kind={glyph} />}
        label={view.label}
        value={value ?? "Not found"}
        empty={value === null}
        tone={view.shown.by === "you" ? "you" : undefined}
        selected={selected}
        onSelect={() => onSelect(view.field_id)}
        aria-label={[view.label, value ?? "not found", statusText(view), tag ?? info?.text, more.length > 0 && `${more.length} more`]
          .filter(Boolean)
          .join(", ")}
        trailing={
          tag ? (
            <>
              <Badge shape="tag" tone="attn">{tag}</Badge>
              {more.length > 0 && <Badge shape="tag" tone="plain">+{more.length}</Badge>}
            </>
          ) : info ? (
            <Badge shape="tag" tone={info.tone}>{info.text}</Badge>
          ) : undefined
        }
      />
    </li>
  );
}
