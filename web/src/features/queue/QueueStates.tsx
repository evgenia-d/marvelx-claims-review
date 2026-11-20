import type { ClaimStatus } from "@shared/contract";
import { ApiFailure } from "../../api/http";
import { Button, IconRetry, Message, SkeletonBar } from "../../ui";
import { STATUS_LABEL } from "./QueueFilters";

const ROWS = ["a", "b", "c", "d"];

/** Shaped like the rows, so claims fill in without the page moving. */
export function QueueLoading() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Loading claims</span>
      {ROWS.map((id) => (
        <div key={id} className="flex h-13 items-center gap-6 rounded-lg border border-line bg-surface px-4 max-lg:h-28 max-lg:flex-col max-lg:items-start max-lg:justify-center max-lg:gap-3">
          <SkeletonBar className="h-4 w-36" />
          <SkeletonBar className="h-4 w-28" />
          <SkeletonBar className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function InvalidFilter({ onShowAll }: { onShowAll: () => void }) {
  return (
    <Message
      headline="That filter doesn't exist"
      body="The link names a status or filter this queue doesn't have. Show all claims to start again."
      action={
        <Button variant="secondary" autoFocus onClick={onShowAll}>
          Show all claims
        </Button>
      }
    />
  );
}

/** In the table's place, so the filters above stay put. */
function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface">{children}</div>;
}

export function QueueEmpty() {
  return (
    <Panel>
      <Message headline="No claims in the queue" body="New claims appear here as they arrive." />
    </Panel>
  );
}

/** Not focused automatically: it appears while the reviewer is using the filters. */
export function NoMatch({ status, onClear }: { status: ClaimStatus; onClear: () => void }) {
  return (
    <Panel>
      <Message
        headline="No claims match"
        body={`No claims with status ${STATUS_LABEL[status]}.`}
        action={
          <Button variant="primary" onClick={onClear}>
            Clear filter
          </Button>
        }
      />
    </Panel>
  );
}

/** The first queue request failed: say so, with a way to try again. */
export function QueueUnavailable({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const unreachable = error instanceof ApiFailure && error.status === 0;
  return (
    <Message
      error
      headline={unreachable ? "Can't reach the server" : "Couldn't load the queue"}
      body={unreachable || !error ? "Check your connection, then try again." : error.message}
      action={
        <Button variant="primary" autoFocus icon={<IconRetry />} onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
