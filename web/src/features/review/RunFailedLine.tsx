import type { ClaimDetail } from "@shared/contract";
import type { RunState } from "@shared/domain";
import { Alert, IconTriangle } from "../../ui";

type Props = {
  error: NonNullable<RunState["error"]>;
  /** Label of the failed step, if the run reached it. */
  stepLabel: string | undefined;
  notChecked: ClaimDetail["not_checked"];
};

/** Under the header of a failed run. No retry: runs can't be restarted from here. Model text, plain. */
export function RunFailedLine({ error, stepLabel, notChecked }: Props) {
  const missed = notChecked[error.step_id];
  return (
    <Alert layout="band" icon={<IconTriangle />}>
      {stepLabel ? (
        <>
          <span className="font-medium">{stepLabel} failed</span> · {error.message}
        </>
      ) : (
        <span className="font-medium">The run failed</span>
      )}
      {missed && <> Not checked: {missed}.</>}
    </Alert>
  );
}
