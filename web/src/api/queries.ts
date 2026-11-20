// Server data for the review screen. Keys live in one place so invalidation (decisions, SSE reset)
// and later screens use exactly the same ones.
import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClaimDetail, DecisionsResponse, QueueResponse, type ClaimStatus, type QueueQuery } from "@shared/contract";
import { getJson, sendJson } from "./http";

export const queryKeys = {
  queue: (status?: ClaimStatus) => ["queue", status ?? "all"] as const,
  allQueues: () => ["queue"] as const, // prefix of every queue key: invalidates all filters at once
  claim: (claimId: string) => ["claim", claimId] as const,
  decisions: (claimId: string) => ["decisions", claimId] as const,
};

export const claimPath = (claimId: string) => `/claims/${encodeURIComponent(claimId)}`;

const claimQuery = (claimId: string) =>
  queryOptions({
    queryKey: queryKeys.claim(claimId),
    queryFn: ({ signal }) => getJson(claimPath(claimId), ClaimDetail, signal),
  });

export const useClaim = (claimId: string) => useQuery(claimQuery(claimId));

export const useDecisions = (claimId: string) =>
  useQuery({
    queryKey: queryKeys.decisions(claimId),
    queryFn: ({ signal }) => getJson(`${claimPath(claimId)}/decisions`, DecisionsResponse, signal),
  });

// Module-level, so the select keeps one identity and TanStack Query re-runs it only when the claim changes.
const documentTexts = (detail: ClaimDetail): Record<string, string> =>
  Object.fromEntries(detail.documents.map((d) => [d.document_id, d.text]));

// The document text by document_id, for citedText() and the document panel. Shares the claim request.
export const useDocuments = (claimId: string) =>
  useQuery({ ...claimQuery(claimId), select: documentTexts });

// The queue polls: no queue stream (see plans/PLAN.md "Why the queue polls"). While the filter
// changes, the previous list stays on screen instead of flashing a skeleton.
export const useQueue = (q: QueueQuery) =>
  useQuery({
    queryKey: queryKeys.queue(q.status),
    queryFn: ({ signal }) => {
      const search = new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();
      return getJson(search ? `/queue?${search}` : "/queue", QueueResponse, signal);
    },
    placeholderData: keepPreviousData,
    refetchInterval: 2000,
  });

// Dev control: restart every run from zero. Everything cached is stale afterwards, so reset it all.
export function useRestartReplay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson("POST", "/replay/restart", undefined, null),
    onSuccess: () => queryClient.resetQueries(),
  });
}
