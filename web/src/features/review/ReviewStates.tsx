import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ApiFailure } from "../../api/http";
import { Button, IconBack, IconButton, IconRetry, Message } from "../../ui";
import { queuePath } from "../queue/search";

/** A minimal header bar, the look of the claim header's, so a full-page state keeps the way back. */
function StateFrame({ title, children }: { title: ReactNode; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="flex min-h-14 items-center gap-3 px-4 py-2">
          <IconButton label="Back to queue" icon={<IconBack />} onClick={() => navigate(queuePath())} tooltipAlign="start" />
          {title}
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}

export function ClaimNotFound({ claimId }: { claimId: string }) {
  const navigate = useNavigate();
  return (
    <StateFrame title={<h1 className="font-serif text-xl tracking-tight text-ink">Claims queue</h1>}>
      <Message
        headline="Claim not found"
        body={`There is no claim ${claimId}.`}
        action={
          <Button variant="secondary" autoFocus onClick={() => navigate(queuePath())}>
            Back to queue
          </Button>
        }
      />
    </StateFrame>
  );
}

/** The claim request failed and it isn't a 404: no server, or a server error. */
export function ClaimUnavailable({ claimId, error, onRetry }: { claimId: string; error: Error | null; onRetry: () => void }) {
  const unreachable = error instanceof ApiFailure && error.status === 0;
  return (
    <StateFrame title={<h1 className="font-mono text-md font-medium text-ink">{claimId}</h1>}>
      <Message
        error
        headline={unreachable ? "Can't reach the server" : "Couldn't load the claim"}
        body={unreachable || !error ? "Check your connection, then try again." : error.message}
        action={
          <Button variant="primary" autoFocus icon={<IconRetry />} onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </StateFrame>
  );
}

export function WaitingForAgent() {
  return <Message headline="Waiting for the agent to start" body="Fields appear here as the agent reads the documents." />;
}
