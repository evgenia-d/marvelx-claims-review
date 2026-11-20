import { Alert, Badge, IconTriangle } from "../../ui";

export type SaveFailure = "failed" | "refused";

/**
 * After a failed save. "failed": the decision was rolled back (network, 5xx, 400). "refused": the
 * server answered 409 because the agent revised the field; what the reviewer typed stays.
 */
export function SaveFailed({ kind }: { kind: SaveFailure }) {
  if (kind === "refused") {
    return (
      <Alert
        layout="box"
        icon={<IconTriangle />}
        action={
          <Badge shape="tag" tone="outline">
            Decide again
          </Badge>
        }
      >
        The agent changed this while you were deciding. Please decide again.
      </Alert>
    );
  }
  return (
    <Alert layout="box" icon={<IconTriangle />}>
      Couldn't save. Try again
    </Alert>
  );
}
