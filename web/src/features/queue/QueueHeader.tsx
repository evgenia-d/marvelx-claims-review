import { Busy } from "../../ui";
import { ReplayControl } from "./ReplayControl";

/** "live": the last poll worked. "reconnecting": rows are kept but the latest poll failed. "none": no answer yet. */
export type QueueLiveness = "live" | "reconnecting" | "none";

/** Title, the live marker, and (once the queue is in) how many claims there are. */
export function QueueHeader({ total, liveness }: { total: number | undefined; liveness: QueueLiveness }) {
  return (
    <header className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2 lg:px-6">
      <h1 className="font-serif text-xl tracking-tight text-ink">Claims queue</h1>
      {/* Polite: a lost connection is announced, never focused. */}
      <div aria-live="polite">
        {liveness !== "none" && (
          <span className="flex items-center gap-1.5 text-base text-ink-3">
            <Busy />
            {liveness === "live" ? "Live" : "Reconnecting…"}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-4">
        {import.meta.env.DEV && <ReplayControl />}
        {total !== undefined && (
          <p className="text-base text-ink-3">
            {total} {total === 1 ? "claim" : "claims"}
          </p>
        )}
      </div>
    </header>
  );
}
