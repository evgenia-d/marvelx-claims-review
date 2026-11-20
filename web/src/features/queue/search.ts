// The queue's filters live in the URL. QueueQuery is the one definition of what a valid filter is.
import { QueueQuery } from "@shared/contract";

export type QueueSearch = { ok: true; query: QueueQuery } | { ok: false };

export function parseQueueSearch(params: URLSearchParams): QueueSearch {
  const parsed = QueueQuery.safeParse(Object.fromEntries(params));
  return parsed.success ? { ok: true, query: parsed.data } : { ok: false };
}

// An empty filter is left out, so "All" is a clean "/".
export function toQueueSearch(q: QueueQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q.status) params.set("status", q.status);
  return params;
}

// The review screen's back buttons return to the queue as the reviewer left it. Router state would
// be lost when the review screen rewrites its own ?field=, so the last valid queue search is kept
// here, and in sessionStorage so a reload of the review screen still goes back to the same filter.
const STORAGE_KEY = "queue-search";
let lastSearch = readStored();

function readStored(): string {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY) ?? "";
    return parseQueueSearch(new URLSearchParams(stored)).ok ? stored : "";
  } catch {
    return "";
  }
}

export function rememberQueueSearch(search: string): void {
  if (!parseQueueSearch(new URLSearchParams(search)).ok) return;
  lastSearch = search;
  try {
    sessionStorage.setItem(STORAGE_KEY, search);
  } catch {
    // Storage blocked: the in-memory copy still works until a reload.
  }
}

export const queuePath = (): string => `/${lastSearch}`;
