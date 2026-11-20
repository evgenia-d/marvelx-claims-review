import { cx, focusRing } from "./cx";

/** "Show all" / "Show less". On phone it is a real 44 high, so its box and focus ring overlap nothing. */
export function ClampToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cx(
        "inline-flex items-center rounded-sm text-sm font-medium text-ink-2 hover:text-ink max-lg:h-11 lg:mt-1",
        focusRing,
      )}
    >
      {expanded ? "Show less" : "Show all"}
    </button>
  );
}
