// What the queue page shows, decided from the query alone so it can be tested without React.
import type { QueueResponse } from "@shared/contract";
import { ApiFailure } from "../../api/http";
import type { QueueLiveness } from "./QueueHeader";

export type QueueState = "loading" | "unreachable" | "failed" | "empty" | "no_match" | "rows";

type Input = {
  data: QueueResponse | undefined;
  error: Error | null;
  /** The rows are the previous filter's, kept until this filter's answer arrives. */
  isPlaceholderData?: boolean;
};

export function queueState({ data, error, isPlaceholderData = false }: Input): QueueState {
  // Data wins over an error: a failing poll keeps the last rows.
  if (data) {
    const total = Object.values(data.counts.status).reduce((sum, n) => sum + n, 0);
    if (total === 0) return "empty";
    if (data.claims.length > 0) return "rows";
    // Stale rows being empty says nothing about this filter: wait rather than name it wrongly.
    return isPlaceholderData ? "loading" : "no_match";
  }
  if (!error) return "loading";
  return error instanceof ApiFailure && error.status === 0 ? "unreachable" : "failed";
}

/** "Live" only while polls succeed; rows kept through a failing poll say "Reconnecting…". */
export function queueLiveness({ data, isError }: { data: QueueResponse | undefined; isError: boolean }): QueueLiveness {
  if (!data) return "none";
  return isError ? "reconnecting" : "live";
}
