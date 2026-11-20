import { cx } from "./cx";

const bars = [
  { id: "long", width: "w-full" },
  { id: "medium", width: "w-3/4" },
  { id: "short", width: "w-1/2" },
] as const;

export type SkeletonProps = {
  /** Number of bars, 1 to 3. */
  lines?: 1 | 2 | 3;
  /** The hidden text screen readers hear. Say what is loading, e.g. "Loading claim". */
  label?: string;
};

export function Skeleton({ lines = 3, label = "Loading…" }: SkeletonProps) {
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      {bars.slice(0, lines).map((bar) => (
        <div
          key={bar.id}
          aria-hidden="true"
          className={cx("h-4 rounded-sm bg-subtle animate-live motion-reduce:animate-none", bar.width)}
        />
      ))}
    </div>
  );
}
