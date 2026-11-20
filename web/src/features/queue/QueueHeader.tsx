import { Busy } from "../../ui";
import { ReplayControl } from "./ReplayControl";

/** Title, the live marker, and (once the queue is in) how many claims there are. */
export function QueueHeader({ total }: { total: number | undefined }) {
  return (
    <header className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2 lg:px-6">
      <h1 className="font-serif text-xl tracking-tight text-ink">Claims queue</h1>
      <span className="flex items-center gap-1.5 text-base text-ink-3">
        <Busy />
        Live
      </span>
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
