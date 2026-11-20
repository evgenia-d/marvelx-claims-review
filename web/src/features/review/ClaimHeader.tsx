import { useNavigate } from "react-router";
import type { ClaimDetail } from "@shared/contract";
import { claimStatus, type FieldView } from "@shared/domain";
import { useConnection, useRunMeta } from "../../api/runStore";
import { Busy, IconBack, IconButton, ProgressBar } from "../../ui";
import { RunStatusChip } from "./RunStatusChip";

type Props = { detail: ClaimDetail; views: FieldView[] };

const DECIDED: FieldView["status"][] = ["accepted", "corrected", "overridden"];

/** Claim id, claimant, run status, current step and how many fields are decided. */
export function ClaimHeader({ detail, views }: Props) {
  const navigate = useNavigate();
  const { claim } = detail;
  const meta = useRunMeta(claim.claim_id);
  const connection = useConnection(claim.claim_id);
  const status = claimStatus(meta.status, claim.completed_at);
  const current = meta.status === "running" ? meta.steps.findLast((s) => s.state === "running") : undefined;
  const decided = views.filter((v) => DECIDED.includes(v.status)).length;

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface px-4 py-2">
      <IconButton label="Back to queue" icon={<IconBack />} onClick={() => navigate("/")} tooltipAlign="start" />
      <h1 className="font-mono text-md font-medium text-ink">{claim.claim_id}</h1>
      <p className="text-md text-ink-2">
        {claim.claimant_name} · <span className="capitalize">{claim.product}</span>
      </p>
      {/* Polite: status changes and reconnects are announced, never focused. */}
      <div aria-live="polite" className="flex items-center gap-2">
        <RunStatusChip status={status} />
        {connection === "reconnecting" && (
          <span className="flex items-center gap-1.5 text-sm text-ink-3">
            <Busy />
            Reconnecting…
          </span>
        )}
      </div>
      {current && <p className="min-w-0 truncate text-base text-ink-3">{current.label}</p>}
      {views.length > 0 && (
        <div className="ml-auto w-60">
          <ProgressBar
            value={decided}
            max={views.length}
            label="Fields decided"
            countLabel={`${decided} of ${views.length} decided`}
          />
        </div>
      )}
    </header>
  );
}
