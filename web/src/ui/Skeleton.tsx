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
        <SkeletonBar key={bar.id} className={cx("h-4", bar.width)} />
      ))}
    </div>
  );
}

const radius = { bar: "rounded-sm", pill: "rounded-full", box: "rounded-md" } as const;

export type SkeletonBarProps = {
  /** Height and width (and layout, e.g. shrink-0), as token classes. */
  className: string;
  /** bar: a line of text; pill: a chip; box: a button or input. */
  shape?: keyof typeof radius;
};

/**
 * One placeholder block, hidden from screen readers. For a skeleton shaped like the content it
 * stands for; pair it with one `Skeleton` (or another role="status") that says what is loading.
 */
export function SkeletonBar({ className, shape = "bar" }: SkeletonBarProps) {
  return <div aria-hidden="true" className={cx("bg-subtle animate-live motion-reduce:animate-none", radius[shape], className)} />;
}
