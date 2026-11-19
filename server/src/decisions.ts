// The decision store: one current decision per field (a new one replaces it) and the completion
// time per claim. In memory now; a database would implement the same interface.
import type { Decision } from "@shared/contract";

export interface DecisionStore {
  list(claimId: string): Decision[];
  get(claimId: string, fieldId: string): Decision | undefined;
  save(decision: Decision): void;
  remove(claimId: string, fieldId: string): void;
  complete(claimId: string, at: string): void;
  completedAt(claimId: string): string | null;
  clear(): void;
}

export function createMemoryDecisionStore(): DecisionStore {
  const decisions = new Map<string, Map<string, Decision>>(); // claim_id → field_id → decision
  const completed = new Map<string, string>();
  const forClaim = (claimId: string) => decisions.get(claimId) ?? new Map<string, Decision>();

  return {
    list: (claimId) => [...forClaim(claimId).values()],
    get: (claimId, fieldId) => forClaim(claimId).get(fieldId),
    save(decision) {
      decisions.set(decision.claim_id, forClaim(decision.claim_id).set(decision.field_id, decision));
    },
    remove(claimId, fieldId) {
      decisions.get(claimId)?.delete(fieldId);
    },
    complete(claimId, at) {
      completed.set(claimId, at);
    },
    completedAt: (claimId) => completed.get(claimId) ?? null,
    clear() {
      decisions.clear();
      completed.clear();
    },
  };
}
