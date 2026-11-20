import { Busy } from "../../ui";

/** Shown beside the run chip while the stream is down; the last state stays on screen. */
export function Reconnecting() {
  return (
    <span className="flex items-center gap-1.5 text-sm text-ink-3">
      <Busy />
      Reconnecting…
    </span>
  );
}
