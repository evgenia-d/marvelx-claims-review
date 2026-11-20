import { Alert, Badge, IconTriangle } from "../../ui";

export type SaveFailure = "failed" | "refused" | { message: string };

/**
 * After a failed save. "failed": nothing was saved (network, 5xx); trying again can work. "refused": the
 * server answered 409 because the agent revised the field; what the reviewer typed stays. { message }:
 * another 4xx, nothing was saved; retrying can't work, so the server's message is shown as text.
 */
export function SaveFailed({ kind }: { kind: SaveFailure }) {
  if (typeof kind === "object") {
    return (
      <Alert layout="box" icon={<IconTriangle />}>
        {kind.message}
      </Alert>
    );
  }
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
