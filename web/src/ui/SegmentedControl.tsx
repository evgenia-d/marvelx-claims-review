import type { ReactNode } from "react";
import { cx, focusRing } from "./cx";

export type SegmentedItem = {
  id: string;
  label: string;
  count?: number;
  glyph?: ReactNode;
};

export type SegmentedControlProps = {
  /** Names the group for screen readers. */
  label: string;
  items: SegmentedItem[];
  value: string;
  onChange: (id: string) => void;
};

export function SegmentedControl({ label, items, value, onChange }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-md bg-subtle p-0.5">
      {items.map((item) => {
        const pressed = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(item.id)}
            className={cx(
              "inline-flex h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-medium lg:h-7",
              focusRing,
              pressed ? "bg-surface text-ink shadow-lift" : "text-ink-2 hover:text-ink",
            )}
          >
            {item.glyph}
            {item.label}
            {item.count !== undefined && (
              <span className="font-mono text-xs text-ink-3">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
