// The claims service: builds queue items and claim detail from the replay and the decision store,
// and checks decisions and completion. Every derivation comes from @shared/domain, so the queue
// and the review screen can't disagree. Routes only translate the Result.
import type { ClaimDetail, ClaimStatus, Decision, DecisionInput, DecisionsResponse, QueueItem, QueueResponse } from "@shared/contract";
import { canComplete, claimStatus, claimViews, needsYouCount, queueCounts, valueMatchesType, type CompleteCheck } from "@shared/domain";
import type { Catalog, CatalogClaim } from "./catalog";
import { FIELD_GROUPS, NOT_CHECKED } from "./claimConfig";
import type { DecisionStore } from "./decisions";
import { fail, ok, type Result } from "./errors";
import type { Replay } from "./replay";

export type Deps = { catalog: Catalog; replay: Replay; store: DecisionStore; now: () => number };

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 } as const;
const iso = (ms: number) => new Date(ms).toISOString();

// Why "Complete review" is refused, in words. "completed" is answered as claim_completed instead.
function notReadyMessage(check: Extract<CompleteCheck, { ok: false }>): string {
  switch (check.reason) {
    case "not_started":
      return "The agent hasn't started on this claim yet.";
    case "agent_working":
      return "The agent is still working on this claim.";
    case "fields_left":
      return check.left === 1 ? "1 field still needs a decision." : `${check.left} fields still need a decision.`;
    case "completed":
      return "This claim's review is already complete.";
  }
}

export function createClaimsService({ catalog, replay, store, now }: Deps) {
  const claims = new Map(catalog.claims.map((c) => [c.claim_id, c]));
  const claimNotFound = (claimId: string) => fail(404, "claim_not_found", `There is no claim ${claimId}.`);
  const claimCompleted = () => fail(409, "claim_completed", "This claim's review is already complete.");

  // Everything derived for one claim at this moment.
  function snapshot(claim: CatalogClaim) {
    const run = replay.run(claim.claim_id);
    const decisions = store.list(claim.claim_id);
    const docs = Object.fromEntries(claim.documents.map((d) => [d.document_id, d.text]));
    const views = claimViews(run, Object.fromEntries(decisions.map((d) => [d.field_id, d])), docs);
    const completedAt = store.completedAt(claim.claim_id);
    return { run, decisions, views, completedAt };
  }

  function queueItem(claim: CatalogClaim): QueueItem {
    const { run, decisions, views, completedAt } = snapshot(claim);
    // The latest of: last event delivered, any current decision, completion. received_at before any.
    let latest = replay.lastDeliveredAt(claim.claim_id);
    for (const at of [...decisions.map((d) => d.at), completedAt]) {
      if (at === null) continue;
      const ms = Date.parse(at);
      if (latest === null || ms > latest) latest = ms;
    }
    return {
      id: claim.id,
      claim_id: claim.claim_id,
      claimant_name: claim.claimant_name,
      product: claim.product,
      priority: claim.priority,
      status: claimStatus(run.status, completedAt),
      run_failed: run.status === "failed",
      needs_you: needsYouCount(views),
      confidence: run.status === "finished" ? run.overall_confidence : null,
      received_at: claim.received_at,
      updated_at: latest === null ? claim.received_at : iso(latest),
      completed_at: completedAt,
    };
  }

  // A claim and one of its emitted fields, or the 404 that applies.
  function findField(claimId: string, fieldId: string) {
    const claim = claims.get(claimId);
    if (!claim) return claimNotFound(claimId);
    const field = replay.run(claimId).fields[fieldId];
    if (!field) return fail(404, "field_not_found", `Claim ${claimId} has no field ${fieldId} yet.`);
    return ok({ claim, field });
  }

  return {
    exists: (claimId: string): Result<null> => (claims.has(claimId) ? ok(null) : claimNotFound(claimId)),

    queue(status: ClaimStatus | undefined): QueueResponse {
      const items = [...claims.values()]
        .map(queueItem)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || Date.parse(a.received_at) - Date.parse(b.received_at));
      return { claims: status ? items.filter((i) => i.status === status) : items, counts: queueCounts(items) };
    },

    detail(claimId: string): Result<ClaimDetail> {
      const claim = claims.get(claimId);
      if (!claim) return claimNotFound(claimId);
      return ok({
        claim: queueItem(claim),
        documents: claim.documents,
        field_groups: FIELD_GROUPS[claimId] ?? [],
        not_checked: NOT_CHECKED[claimId] ?? {},
      });
    },

    decisions(claimId: string): Result<DecisionsResponse> {
      return claims.has(claimId) ? ok({ decisions: store.list(claimId) }) : claimNotFound(claimId);
    },

    decide(claimId: string, fieldId: string, input: DecisionInput): Result<Decision> {
      const found = findField(claimId, fieldId);
      if (!found.ok) return found;
      const { field } = found.value;
      if (input.action !== "accept" && !valueMatchesType(field.value_type, input.value))
        return fail(400, "invalid_value", `${field.label} needs a ${field.value_type.replace("_", " ")} value.`);
      if (store.completedAt(claimId) !== null) return claimCompleted();
      if (input.based_on !== field.version)
        return fail(409, "agent_revised", `The agent changed ${field.label} since you saw it. Check the new value and decide again.`);
      const decision: Decision = { ...input, claim_id: claimId, field_id: fieldId, at: iso(now()) };
      store.save(decision);
      return ok(decision);
    },

    undo(claimId: string, fieldId: string): Result<null> {
      const found = findField(claimId, fieldId);
      if (!found.ok) return found;
      if (store.completedAt(claimId) !== null) return claimCompleted();
      store.remove(claimId, fieldId);
      return ok(null);
    },

    complete(claimId: string): Result<QueueItem> {
      const claim = claims.get(claimId);
      if (!claim) return claimNotFound(claimId);
      const { run, views, completedAt } = snapshot(claim);
      const check = canComplete(run.status, views, completedAt);
      if (!check.ok) return check.reason === "completed" ? claimCompleted() : fail(409, "not_ready", notReadyMessage(check));
      store.complete(claimId, iso(now()));
      return ok(queueItem(claim));
    },

    restart() {
      replay.restart();
      store.clear();
    },
  };
}

export type ClaimsService = ReturnType<typeof createClaimsService>;
