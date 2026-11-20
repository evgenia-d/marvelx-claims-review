import type { Priority } from "@shared/contract";
import { cx } from "../../ui/cx";

const LEVEL: Record<Priority, { word: string; bars: number }> = {
  high: { word: "High", bars: 3 },
  normal: { word: "Normal", bars: 2 },
  low: { word: "Low", bars: 1 },
};

const BARS = [
  { id: "short", x: 0, y: 8, h: 4 },
  { id: "middle", x: 5, y: 4, h: 8 },
  { id: "tall", x: 10, y: 0, h: 12 },
];

/** Three bars and the word, so it never relies on shape alone. High is bold ink, never orange. */
export function PriorityMark({ priority }: { priority: Priority }) {
  const { word, bars } = LEVEL[priority];
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-base", priority === "high" ? "font-semibold text-ink" : "text-ink-2")}>
      <svg viewBox="0 0 13 12" width={13} height={12} aria-hidden="true" focusable="false" className="shrink-0">
        {BARS.map((bar, i) => (
          <rect key={bar.id} x={bar.x} y={bar.y} width={3} height={bar.h} rx={1} className={i < bars ? "fill-ink" : "fill-line-strong"} />
        ))}
      </svg>
      {word}
    </span>
  );
}
