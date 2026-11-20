// Reviewer decisions: saved optimistically, one field at a time.
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Decision, DecisionsResponse, QueueItem, type DecisionInput } from "@shared/contract";
import { sendJson } from "./http";
import { claimPath, queryKeys } from "./queries";

// A field has at most one decision: a new one replaces it.
export const withDecision = (list: Decision[], d: Decision): Decision[] => [...list.filter((x) => x.field_id !== d.field_id), d];

export const withoutDecision = (list: Decision[], fieldId: string): Decision[] => list.filter((x) => x.field_id !== fieldId);

const decisionPath = (claimId: string, fieldId: string) =>
  `${claimPath(claimId)}/fields/${encodeURIComponent(fieldId)}/decision`;

// Decide and undo of one field share this key and scope: the scope runs them one after another in
// call order, the key lets onError count them.
const fieldMutation = (claimId: string, fieldId: string) => ({
  mutationKey: ["decision", claimId, fieldId] as const,
  scope: { id: `decision:${claimId}:${fieldId}` },
});

type Snapshot = { previous: DecisionsResponse | undefined };

function useOptimisticField<TInput, TResult>(
  claimId: string,
  fieldId: string,
  mutationFn: (input: TInput) => Promise<TResult>,
  write: (list: Decision[], input: TInput) => Decision[],
) {
  const queryClient = useQueryClient();
  const key = queryKeys.decisions(claimId);
  const { mutationKey, scope } = fieldMutation(claimId, fieldId);
  // The scope runs a field's mutations one at a time, so any other pending one is a later click.
  // The settling mutation still counts as pending in onError/onSettled (query-core dispatches its
  // result after the callbacks), so 1 means "no later click".
  const isNewest = () => queryClient.isMutating({ mutationKey, exact: true }) === 1;

  return useMutation({
    mutationKey,
    scope,
    mutationFn,
    // Runs at call time, even while an earlier click of this field is still saving, so the screen
    // shows the clicks in the order they were made.
    onMutate: async (input): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DecisionsResponse>(key);
      if (previous) queryClient.setQueryData<DecisionsResponse>(key, { decisions: write(previous.decisions, input) });
      return { previous };
    },
    onError: (_error, _input, snapshot) => {
      // Restore only if no later click on this field is waiting. Otherwise the snapshot would erase
      // that click; the refetch then comes from the last mutation's onSettled.
      if (snapshot?.previous && isNewest()) queryClient.setQueryData(key, snapshot.previous);
    },
    // Refetching while a later click is queued could bring back this mutation's result over the
    // later click's optimistic write, so only the newest one refetches decisions.
    onSettled: () => invalidate(queryClient, isNewest() ? [key, queryKeys.allQueues()] : [queryKeys.allQueues()]),
  });
}

const invalidate = (queryClient: QueryClient, keys: readonly (readonly string[])[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useDecide(claimId: string, fieldId: string) {
  return useOptimisticField(
    claimId,
    fieldId,
    (input: DecisionInput) => sendJson("PUT", decisionPath(claimId, fieldId), input, Decision),
    // The server sets the real `at`; this one only shows the pill until the refetch.
    (list, input) => withDecision(list, { ...input, claim_id: claimId, field_id: fieldId, at: new Date().toISOString() }),
  );
}

export function useUndo(claimId: string, fieldId: string) {
  return useOptimisticField<void, void>(
    claimId,
    fieldId,
    () => sendJson("DELETE", decisionPath(claimId, fieldId), undefined, null),
    (list) => withoutDecision(list, fieldId),
  );
}

// Not optimistic: completing locks the claim, so the screen waits for the server to agree.
// On a 409 (not_ready, claim_completed) the claim is refetched too, so the button shows why.
export function useComplete(claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson("POST", `${claimPath(claimId)}/complete`, undefined, QueueItem),
    onSettled: () =>
      invalidate(queryClient, [queryKeys.claim(claimId), queryKeys.decisions(claimId), queryKeys.allQueues()]),
  });
}
