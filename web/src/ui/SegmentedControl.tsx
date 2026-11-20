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
  /** Fill the container: full width, equal-width segments. */
  stretch?: boolean;
};

export function SegmentedControl({ label, items, value, onChange, stretch = false }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} className={cx("gap-0.5 rounded-md bg-subtle p-0.5", stretch ? "flex w-full" : "inline-flex")}>
      {items.map((item) => {
        const pressed = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(item.id)}
            className={cx(
              "inline-flex h-11 items-center gap-1.5 rounded-sm text-sm font-medium whitespace-nowrap lg:h-7",
              stretch ? "flex-1 justify-center px-2" : "px-3",
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
