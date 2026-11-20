import { formatInstant } from "@shared/domain";

/** Replaces the decision buttons once the review is completed. */
export function ReadOnlyNote({ completedAt }: { completedAt: string }) {
  return <p className="text-sm text-ink-3">Read-only · review completed {formatInstant(completedAt)}</p>;
}
