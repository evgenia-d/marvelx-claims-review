import type { ReactNode } from "react";
import { cx, focusRing } from "./cx";

export type ListRowProps = {
  glyph: ReactNode;
  label: string;
  value: ReactNode;
  /** The value is a placeholder: italic and grey. */
  empty?: boolean;
  tone?: "you";
  trailing?: ReactNode;
  selected?: boolean;
  /** Fade the row in (a row that just appeared). */
  arrive?: boolean;
  onSelect: () => void;
  "aria-label": string;
};

export function ListRow({
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
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cx(
        "flex h-13 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-subtle lg:h-10",
        focusRing,
        selected && "shadow-selected",
        arrive && "animate-arrive motion-reduce:animate-none",
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
