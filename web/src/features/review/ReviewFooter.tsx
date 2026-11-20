import { useState } from "react";
import type { ClaimDetail } from "@shared/contract";
import { canComplete, type FieldView } from "@shared/domain";
import { useRunMeta } from "../../api/runStore";
import { Alert, IconTriangle, ProgressBar } from "../../ui";
import { decidedCount } from "./ClaimHeader";
import { CompleteReview } from "./CompleteReview";

type Props = { detail: ClaimDetail; views: FieldView[] };

/** Phone list screen: progress and Complete review, pinned to the bottom. The laptop has them in the header. */
export function ReviewFooter({ detail, views }: Props) {
  const { claim } = detail;
  const meta = useRunMeta(claim.claim_id);
  const decided = decidedCount(views);
  const check = canComplete(meta.status, views, claim.completed_at);
  const [completeFailed, setCompleteFailed] = useState<string | null>(null);
  if (views.length === 0 && claim.completed_at !== null) return null;

  return (
    <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-surface p-4">
      {completeFailed && (
        <Alert layout="box" icon={<IconTriangle />}>
          {completeFailed}
        </Alert>
      )}
      {views.length > 0 && (
        <ProgressBar value={decided} max={views.length} label="Fields decided" countLabel={`${decided} of ${views.length} decided`} />
      )}
      {claim.completed_at === null && (
        <CompleteReview claimId={claim.claim_id} check={check} onFailure={setCompleteFailed} stacked />
      )}
    </footer>
  );
}
