// Claim-level derivations: claim status, whether "Complete review" is allowed, queue status counts.
import { ClaimStatus, type QueueItem, type QueueResponse } from "@shared/contract";
import type { FieldView } from "./fieldView";
import type { RunState } from "./run";

const BY_RUN: Record<RunState["status"], ClaimStatus> = {
  not_started: "queued",
  running: "running",
  finished: "needs_review",
  failed: "failed",
};

// "reviewed" is reached only through Complete review, whatever the run did.
export function claimStatus(run: RunState["status"], completedAt: string | null): ClaimStatus {
  return completedAt !== null ? "reviewed" : BY_RUN[run];
}

export type CompleteCheck =
  | { ok: true }
  | { ok: false; reason: "not_started" | "agent_working" | "fields_left" | "completed"; left: number };

// Every field the run has emitted so far must carry a current decision. A failed run can be
// completed once the fields it produced are decided.
export function canComplete(run: RunState["status"], views: FieldView[], completedAt: string | null): CompleteCheck {
  if (completedAt !== null) return { ok: false, reason: "completed", left: 0 };
  const left = views.filter((v) => v.status === "pending" || v.status === "revised_after_decision").length;
  if (run === "not_started") return { ok: false, reason: "not_started", left };
  if (run === "running") return { ok: false, reason: "agent_working", left };
  if (left > 0) return { ok: false, reason: "fields_left", left };
  return { ok: true };
}

// Claims per status over the whole queue. Every status is present, zeros included
// (z.record over an enum requires them all).
export function queueCounts(items: QueueItem[]): QueueResponse["counts"] {
  const status = Object.fromEntries(ClaimStatus.options.map((k) => [k, 0])) as Record<ClaimStatus, number>;
  for (const item of items) status[item.status] += 1;
  return { status };
}
