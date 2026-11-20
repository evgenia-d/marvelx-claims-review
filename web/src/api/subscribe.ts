// The one effect on the review screen: the claim's SSE stream feeding the run store.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseRunEvent } from "./events";
import { claimPath, queryKeys } from "./queries";
import { useRunStore } from "./runStore";

export function useRunSubscription(claimId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { apply, reset, setConnection } = useRunStore.getState();
    let source: EventSource | null = null;

    const open = () => {
      // A new EventSource sends no Last-Event-ID, so the server replays every due event from the
      // start. Clearing first means a run state kept from an earlier replay (the screen was left and
      // reopened after `npm run replay`) can't swallow the new replay's events as seen seqs.
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
      // The replay restarted. The old EventSource would reconnect with a stale id and be reset again,
      // so close it and start a fresh one; claim detail and decisions were reset on the server too.
      es.addEventListener("reset", () => {
        es.close();
        void queryClient.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.decisions(claimId) });
        open();
      });
      // CONNECTING: the browser retries on its own. CLOSED: it gave up (e.g. a 404 answered with JSON).
      es.onerror = () => setConnection(claimId, es.readyState === EventSource.CLOSED ? "closed" : "reconnecting");
    };

    open();
    return () => {
      source?.close();
      setConnection(claimId, "closed");
    };
  }, [claimId, queryClient]);
}
