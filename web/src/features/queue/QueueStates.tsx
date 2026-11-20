import { Button, Message, SkeletonBar } from "../../ui";

// Slice F adds the other queue states (empty, no match, unreachable) here.

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
