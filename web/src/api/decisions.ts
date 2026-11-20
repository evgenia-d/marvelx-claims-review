// Reviewer decisions: one field at a time, written only after the server answers OK. While a save
// is in flight the field's decision buttons are blocked (FieldCard), so there is nothing to queue.
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Decision, DecisionsResponse, QueueItem, type DecisionInput } from "@shared/contract";
import { ApiFailure, sendJson } from "./http";
import { claimPath, queryKeys } from "./queries";

// A field has at most one decision: a new one replaces it.
export const withDecision = (list: Decision[], d: Decision): Decision[] => [...list.filter((x) => x.field_id !== d.field_id), d];

export const withoutDecision = (list: Decision[], fieldId: string): Decision[] => list.filter((x) => x.field_id !== fieldId);

const decisionPath = (claimId: string, fieldId: string) =>
  `${claimPath(claimId)}/fields/${encodeURIComponent(fieldId)}/decision`;

const invalidate = (queryClient: QueryClient, keys: readonly (readonly string[])[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

// Completed elsewhere (another tab): refetch the claim so the screen turns read-only.
const refetchClaimIfCompleted = (queryClient: QueryClient, claimId: string, error: Error) => {
  if (error instanceof ApiFailure && error.status === 409 && error.code === "claim_completed") {
    void queryClient.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
  }
};

// The server's answer is the truth: it is written into the cache as it arrived, with no refetch of
// the decisions that could race it. The queue's needs_you counts change, so those are refetched.
function writeDecisions(queryClient: QueryClient, claimId: string, write: (list: Decision[]) => Decision[]) {
  queryClient.setQueryData<DecisionsResponse>(queryKeys.decisions(claimId), (old) => ({ decisions: write(old?.decisions ?? []) }));
  void queryClient.invalidateQueries({ queryKey: queryKeys.allQueues() });
}

export function useDecide(claimId: string, fieldId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DecisionInput) => sendJson("PUT", decisionPath(claimId, fieldId), input, Decision),
    onSuccess: (decision) => writeDecisions(queryClient, claimId, (list) => withDecision(list, decision)),
    onError: (error) => refetchClaimIfCompleted(queryClient, claimId, error),
  });
}

export function useUndo(claimId: string, fieldId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson("DELETE", decisionPath(claimId, fieldId), undefined, null),
    onSuccess: () => writeDecisions(queryClient, claimId, (list) => withoutDecision(list, fieldId)),
    onError: (error) => refetchClaimIfCompleted(queryClient, claimId, error),
  });
}

// Completing locks the claim, so the screen waits for the server to agree (as decisions do).
// On a 409 (not_ready, claim_completed) the claim is refetched too, so the button shows why.
export function useComplete(claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson("POST", `${claimPath(claimId)}/complete`, undefined, QueueItem),
    onSettled: () =>
      invalidate(queryClient, [queryKeys.claim(claimId), queryKeys.decisions(claimId), queryKeys.allQueues()]),
  });
}
