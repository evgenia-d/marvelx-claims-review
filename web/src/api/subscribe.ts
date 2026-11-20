// The one effect on the review screen: the claim's SSE stream feeding the run store.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ClaimDetail } from "@shared/contract";
import { parseRunEvent } from "./events";
import { claimPath, queryKeys } from "./queries";
import { useRunStore } from "./runStore";

export function useRunSubscription(claimId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { apply, reset, markSynced, setConnection } = useRunStore.getState();
    let source: EventSource | null = null;

    const open = () => {
      // A new EventSource sends no Last-Event-ID, so the server replays every due event from the
      // start, then `synced`. Clearing first means a run state kept from an earlier replay (the screen
      // was left and reopened after `npm run replay`) can't swallow the new replay's events as seen
      // seqs, and the screen waits for this stream's backlog. EventSource's own reconnects don't
      // come through here, so they keep synced.
      reset(claimId);
      setConnection(claimId, "connecting");
      const es = new EventSource(`/api${claimPath(claimId)}/events`);
      source = es;

      es.onopen = () => setConnection(claimId, "live");
      es.addEventListener("run", (e) => {
        const event = parseRunEvent(e.data);
        if (!event) return;
        if (event.claim_id !== claimId) {
          console.warn(`Dropped a run event for ${event.claim_id} on the ${claimId} stream.`);
          return;
        }
        apply(claimId, event);
      });
      // The connect backlog is done: the screen can show the run as it is, in one step.
      es.addEventListener("synced", () => markSynced(claimId));
      // The replay restarted. The old EventSource would reconnect with a stale id and be reset again,
      // so close it and start a fresh one. Decisions and completion were cleared on the server too,
      // and the new backlog can beat their refetch, so the old ones must not stay on screen meanwhile:
      // decisions are dropped from the cache (none is the truth after a restart), and the claim detail
      // keeps its fixture data with completed_at cleared. Resetting the claim query instead would put
      // the whole screen back to "claim pending" and open the stream a second time.
      es.addEventListener("reset", () => {
        es.close();
        queryClient.setQueryData<ClaimDetail>(queryKeys.claim(claimId), (old) =>
          old && { ...old, claim: { ...old.claim, completed_at: null } },
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
        void queryClient.resetQueries({ queryKey: queryKeys.decisions(claimId) });
        open();
      });
      // CONNECTING: the browser retries on its own. CLOSED: it gave up (e.g. a 404 answered with JSON).
      es.onerror = () => setConnection(claimId, es.readyState === EventSource.CLOSED ? "closed" : "reconnecting");
    };

    open();
    // Leaving clears the run too: a revisit (or StrictMode's second mount) starts from an empty,
    // unsynced store, so it never renders the last visit's run, perhaps from a replay that is gone.
    return () => {
      source?.close();
      reset(claimId);
      setConnection(claimId, "closed");
    };
  }, [claimId, queryClient]);
}
