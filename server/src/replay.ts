// The replay clock. Each claim's run is a segment that starts `start_after_ms` after the replay
// starts (null: preloaded, every event due at once). Time is an input, so tests use a fake clock.
import type { RunEvent } from "@shared/contract";
import { applyEvents, initialRunState, type RunState } from "@shared/domain";
import type { Catalog } from "./catalog";

export interface Replay {
  /** Events due now, in delivery order (fixture duplicates included). */
  due(claimId: string): RunEvent[];
  /** The due events folded with the shared reducer. */
  run(claimId: string): RunState;
  /** Wall time (epoch ms) the last due event was delivered, or null before the run starts. */
  lastDeliveredAt(claimId: string): number | null;
  /** Random per server start and per restart, so a stream or a resume header can tell its replay is gone. */
  replayId(): string;
  restart(): void;
}

export function createReplay(catalog: Catalog, now: () => number): Replay {
  const claims = new Map(catalog.claims.map((c) => [c.claim_id, c]));
  let startedAt = now();
  // 8 hex chars: enough to tell replays apart, short enough to read in an event id.
  const newId = () => crypto.randomUUID().slice(0, 8);
  let replayId = newId();

  function due(claimId: string): RunEvent[] {
    const claim = claims.get(claimId);
    if (!claim) return [];
    const start = claim.start_after_ms;
    if (start === null) return claim.events;
    const elapsed = now() - startedAt;
    return claim.events.filter((e) => start + e.at_ms <= elapsed);
  }

  return {
    due,
    run: (claimId) => applyEvents(initialRunState(claimId), due(claimId)),
    lastDeliveredAt(claimId) {
      const last = due(claimId).at(-1);
      const claim = claims.get(claimId);
      if (!last || !claim) return null;
      if (claim.start_after_ms !== null) return startedAt + claim.start_after_ms + last.at_ms;
      // Preloaded: delivered in the past, when the recorded run happened.
      const first = claim.events[0];
      return first?.type === "run_started" ? Date.parse(first.payload.started_at) + last.at_ms : null;
    },
    replayId: () => replayId,
    restart() {
      startedAt = now();
      replayId = newId();
    },
  };
}
