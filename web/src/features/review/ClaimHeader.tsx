import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import type { ClaimDetail, QueueItem } from "@shared/contract";
import { canComplete, claimStatus, type FieldView } from "@shared/domain";
import { useConnection, useRunMeta } from "../../api/runStore";
import { Alert, Busy, IconBack, IconButton, IconTriangle, ProgressBar, SkeletonBar } from "../../ui";
import { CompleteReview } from "./CompleteReview";
import { RunStatusChip } from "./RunStatusChip";

type Props = { detail: ClaimDetail; views: FieldView[] };

const DECIDED: FieldView["status"][] = ["accepted", "corrected", "overridden"];

/** Claim id, claimant, run status, current step, how many fields are decided, and Complete review. */
export function ClaimHeader({ detail, views }: Props) {
  const { claim } = detail;
  const meta = useRunMeta(claim.claim_id);
  const connection = useConnection(claim.claim_id);
  const status = claimStatus(meta.status, claim.completed_at);
  const current = meta.status === "running" ? meta.steps.findLast((s) => s.state === "running") : undefined;
  const decided = views.filter((v) => DECIDED.includes(v.status)).length;
  const check = canComplete(meta.status, views, claim.completed_at);
  const [completeFailed, setCompleteFailed] = useState<string | null>(null);

  return (
    <ClaimHeaderFrame
      claim={claim}
      status={
        <>
          <RunStatusChip status={status} />
          {connection === "reconnecting" && (
            <span className="flex items-center gap-1.5 text-sm text-ink-3">
              <Busy />
              Reconnecting…
            </span>
          )}
        </>
      }
      step={current && <p className="min-w-0 truncate text-base text-ink-3">{current.label}</p>}
      end={
        <>
          {views.length > 0 && (
            <div className="w-60 shrink-0">
              <ProgressBar
                value={decided}
                max={views.length}
                label="Fields decided"
                countLabel={`${decided} of ${views.length} decided`}
              />
            </div>
          )}
          {/* Once completed, the "Reviewed" chip says it; the button has nothing left to do. */}
          {claim.completed_at === null && (
            <CompleteReview claimId={claim.claim_id} check={check} onFailure={setCompleteFailed} />
          )}
        </>
      }
      below={
        completeFailed && (
          <div className="px-4 pb-2">
            <Alert layout="box" icon={<IconTriangle />}>
              {completeFailed}
            </Alert>
          </div>
        )
      }
    />
  );
}

type FrameProps = {
  /** The claim, or undefined while its detail is loading (bars stand in for id and claimant). */
  claim: QueueItem | undefined;
  /** Run status chip and connection; announced politely. */
  status: ReactNode;
  /** The current step, which truncates first. */
  step?: ReactNode;
  /** Progress and Complete review, pushed to the end. */
  end: ReactNode;
  below?: ReactNode;
};

/**
 * The header's layout, shared with the loading skeleton so loading -> content changes only the
 * insides and nothing moves. One line from xl: the current step truncates first. Narrower, the row
 * wraps rather than overflow.
 */
export function ClaimHeaderFrame({ claim, status, step, end, below }: FrameProps) {
  const navigate = useNavigate();
  return (
    <header className="border-b border-line bg-surface">
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 xl:flex-nowrap">
        <IconButton label="Back to queue" icon={<IconBack />} onClick={() => navigate("/")} tooltipAlign="start" />
        {claim ? (
          <>
            <h1 className="shrink-0 font-mono text-md font-medium text-ink">{claim.claim_id}</h1>
            <p className="shrink-0 text-md text-ink-2">
              {claim.claimant_name} · <span className="capitalize">{claim.product}</span>
            </p>
          </>
        ) : (
          <>
            <SkeletonBar className="h-4 w-32 shrink-0" />
            <SkeletonBar className="h-4 w-40 shrink-0" />
          </>
        )}
        {/* Polite: status changes and reconnects are announced, never focused. */}
        <div aria-live="polite" className="flex items-center gap-2">
          {status}
        </div>
        {step}
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 xl:flex-nowrap">{end}</div>
      </div>
      {below}
    </header>
  );
}
