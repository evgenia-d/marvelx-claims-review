// Server data for the review screen. Keys live in one place so invalidation (decisions, SSE reset)
// and later screens use exactly the same ones.
import { queryOptions, useQuery } from "@tanstack/react-query";
import { ClaimDetail, DecisionsResponse, type ClaimStatus } from "@shared/contract";
import { getJson } from "./http";

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
