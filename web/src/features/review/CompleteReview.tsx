import { useId } from "react";
import type { CompleteCheck } from "@shared/domain";
import { useComplete } from "../../api/decisions";
import { ApiFailure } from "../../api/http";
import { Button } from "../../ui";

type Blocked = Extract<CompleteCheck, { ok: false }>;

// Short tail on the button, and the sentence beside it that says why.
function blockedText(check: Blocked): { tail: string; reason: string } {
  switch (check.reason) {
    case "not_started":
      return { tail: "not started", reason: "The agent hasn't started this claim yet" };
    case "agent_working":
      return { tail: "agent working", reason: "Available when the agent has finished" };
    case "fields_left":
      return {
        tail: `${check.left} left`,
        reason: check.left === 1 ? "1 field still needs a decision" : `${check.left} fields still need a decision`,
      };
    case "completed":
      return { tail: "done", reason: "This review is completed" };
    default: {
      const never: never = check.reason;
      return never;
    }
  }
}

type Props = {
  claimId: string;
  check: CompleteCheck;
  /** The failure to show (the header shows it below its row), or null when a new attempt starts. */
  onFailure: (message: string | null) => void;
  /** Phone footer: the button takes the full width, with its reason under it. */
  stacked?: boolean;
};

/** Moves the claim to reviewed. Blocked (never `disabled`) with the reason as visible text. */
export function CompleteReview({ claimId, check, onFailure, stacked = false }: Props) {
  const reasonId = useId();
  const complete = useComplete(claimId);

  const blocked = check.ok ? null : blockedText(check);
  const submit = () => {
    if (complete.isPending) return;
    onFailure(null);
    // A 409 (not_ready, claim_completed) carries the server's reason; the refetch then updates the button.
    complete.mutate(undefined, {
      onError: (e) => onFailure(e instanceof ApiFailure && e.status === 409 ? e.message : "Couldn't save. Try again"),
    });
  };

  return (
    <div className={stacked ? "flex min-w-0 flex-col gap-1" : "flex min-w-0 items-center gap-2"}>
      {blocked ? (
        <>
          <Button variant="secondary" className={stacked ? "w-full" : "shrink-0"} aria-disabled aria-describedby={reasonId}>
            Complete review · {blocked.tail}
          </Button>
          <p id={reasonId} className={stacked ? "min-w-0 text-center text-sm text-ink-3" : "min-w-0 text-sm text-ink-3"}>
            {blocked.reason}
          </p>
        </>
      ) : (
        <Button variant="primary" className={stacked ? "w-full" : "shrink-0"} onClick={submit}>
          Complete review
        </Button>
      )}
    </div>
  );
}
