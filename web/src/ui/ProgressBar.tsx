export type ProgressBarProps = {
  value: number;
  max: number;
  /** Names the bar for screen readers. */
  label: string;
  /** Text beside the bar. Defaults to "value / max". */
  countLabel?: string;
};

export function ProgressBar({ value, max, label, countLabel }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-you" style={{ width: `${percent}%` }} />
      </div>
      <span className="shrink-0 font-mono text-xs text-ink-3">{countLabel ?? `${value} / ${max}`}</span>
    </div>
  );
}
