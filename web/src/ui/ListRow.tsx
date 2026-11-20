import { useState, type ReactNode } from "react";
import { cx, focusRing } from "./cx";

export type ListRowProps = {
  id?: string;
  glyph: ReactNode;
  label: string;
  value: ReactNode;
  /** The value is a placeholder: italic and grey. */
  empty?: boolean;
  tone?: "you";
  trailing?: ReactNode;
  selected?: boolean;
  /** Fade the row in once, on mount (a row that just appeared). */
  arrive?: boolean;
  onSelect: () => void;
  "aria-label": string;
};

export function ListRow({
  id,
  glyph,
  label,
  value,
  empty = false,
  tone,
  trailing,
  selected = false,
  arrive = false,
  onSelect,
  "aria-label": ariaLabel,
}: ListRowProps) {
  // A CSS animation restarts when a hidden (display: none) row is shown again, so once it has
  // played the class comes off: showing the row later doesn't fade it in a second time.
  const [arrived, setArrived] = useState(false);
  return (
    <button
      id={id}
      type="button"
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setArrived(true);
      }}
      className={cx(
        "flex h-13 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-subtle lg:h-10",
        focusRing,
        selected && "bg-surface shadow-selected",
        arrive && !arrived && "animate-arrive motion-reduce:animate-none",
      )}
    >
      <span className="flex shrink-0 items-center">{glyph}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs text-ink-3">{label}</span>
        <span
          className={cx(
            "truncate font-mono text-md lg:text-sm",
            empty ? "text-ink-3 italic" : tone === "you" ? "text-you" : "text-ink",
          )}
        >
          {value}
        </span>
      </span>
      {trailing !== undefined && <span className="flex shrink-0 items-center gap-1">{trailing}</span>}
    </button>
  );
}
