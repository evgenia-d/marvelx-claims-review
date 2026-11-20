import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { QueueQuery } from "@shared/contract";
import { useQueue } from "../../api/queries";
import { QueueFilters } from "./QueueFilters";
import { QueueHeader } from "./QueueHeader";
import { InvalidFilter, QueueLoading } from "./QueueStates";
import { QueueTable } from "./QueueTable";
import { parseQueueSearch, rememberQueueSearch, toQueueSearch } from "./search";

export function QueuePage() {
  const [params] = useSearchParams();
  const parsed = parseQueueSearch(params);
  const navigate = useNavigate();
  // A bad filter never reaches the API: say so and offer the way back.
  if (!parsed.ok) {
    return (
      <div className="min-h-screen bg-ground">
        <QueueHeader total={undefined} />
        <main>
          <InvalidFilter onShowAll={() => void navigate("/")} />
        </main>
      </div>
    );
  }
  return <QueueView query={parsed.query} />;
}

function QueueView({ query }: { query: QueueQuery }) {
  const [params, setSearchParams] = useSearchParams();
  const queue = useQueue(query);
  const search = params.toString();
  // The review screen's back button returns here, filter included.
  useEffect(() => rememberQueueSearch(search === "" ? "" : `?${search}`), [search]);
  const counts = queue.data?.counts.status;
  const total = counts && Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="min-h-screen bg-ground">
      <QueueHeader total={total} />
      <main className="flex flex-col gap-4 p-4 lg:p-6">
        <QueueFilters query={query} counts={counts} total={total} onChange={(q) => setSearchParams(toQueueSearch(q))} />
        {queue.data ? (
          // Between a filter change and its answer the old rows stay, dimmed.
          <div aria-busy={queue.isPlaceholderData} className={queue.isPlaceholderData ? "opacity-60" : undefined}>
            <QueueTable claims={queue.data.claims} />
          </div>
        ) : (
          <QueueLoading />
        )}
      </main>
    </div>
  );
}
