import { useRestartReplay } from "../../api/queries";
import { Button } from "../../ui";

/** Dev only: restarts every run from zero. The server endpoint is always on (npm run replay uses it). */
export function ReplayControl() {
  const restart = useRestartReplay();
  return (
    <Button variant="secondary" aria-disabled={restart.isPending} onClick={() => !restart.isPending && restart.mutate()}>
      Restart replay
    </Button>
  );
}
