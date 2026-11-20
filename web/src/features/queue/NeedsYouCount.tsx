import { StatusGlyph } from "../../ui";
import { cx } from "../../ui/cx";

/** "7 need you", "1 needs you", "none need you" (for the row's spoken label). */
export const needsYouText = (count: number): string =>
  count === 0 ? "none need you" : `${count} ${count === 1 ? "needs" : "need"} you`;

/** Orange ! and the count; 0 is grey. Reads "7 need you". */
export function NeedsYouCount({ count }: { count: number }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 font-mono text-sm", count > 0 ? "text-attn" : "text-ink-3")}>
      {count > 0 && <StatusGlyph kind="attn" size={14} />}
      {count}
      <span className="font-sans max-lg:font-mono lg:sr-only">{count === 1 ? "needs" : "need"} you</span>
    </span>
  );
}
