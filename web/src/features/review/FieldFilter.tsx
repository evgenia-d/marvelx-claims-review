import { SegmentedControl, StatusGlyph } from "../../ui";

export type FilterId = "needs_you" | "to_review" | "all";

type Props = {
  value: FilterId;
  onChange: (value: FilterId) => void;
  counts: Record<FilterId, number>;
};

const isFilter = (id: string): id is FilterId => id === "needs_you" || id === "to_review" || id === "all";

/** Filters the list. Never re-sorts it. */
export function FieldFilter({ value, onChange, counts }: Props) {
  return (
    <SegmentedControl
      label="Show fields"
      stretch
      value={value}
      onChange={(id) => {
        if (isFilter(id)) onChange(id);
      }}
      items={[
        { id: "needs_you", label: "Needs you", count: counts.needs_you, glyph: <StatusGlyph kind="attn" size={12} /> },
        { id: "to_review", label: "To review", count: counts.to_review },
        { id: "all", label: "All", count: counts.all },
      ]}
    />
  );
}
