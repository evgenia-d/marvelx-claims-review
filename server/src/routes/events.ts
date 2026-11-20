// Per-claim SSE. On connect: every due event (after Last-Event-ID when it is from this replay),
// then one `event: synced` to say the backlog is done; then, every 200 ms, the newly due ones.
// Fixture duplicates are sent as the file has them (the reducer drops them by seq).
// A replay restart ends the stream with `event: reset`, so the browser starts the claim over.
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { LastEventId, type RunEvent } from "@shared/contract";
import type { ClaimsService } from "../claims";
import type { Replay } from "../replay";
import { sendFailure } from "../errors";
import { validClaimParams } from "./validate";

const POLL_MS = 200;
const HEARTBEAT_EVERY = 15_000 / POLL_MS; // polls between `: hb` comments

// See LastEventId in shared/contract/routes.ts for why the replay id is part of the event id.
const eventId = (replayId: string, event: RunEvent) => `${replayId}.${event.seq}`;

export const eventRoutes = (service: ClaimsService, replay: Replay) =>
  new Hono().get("/claims/:claimId/events", validClaimParams, (c) => {
    const { claimId } = c.req.valid("param");
    const exists = service.exists(claimId);
    if (!exists.ok) return sendFailure(c, exists);
    const header = c.req.header("Last-Event-ID");

    return streamSSE(c, async (stream) => {
      let open = true;
      stream.onAbort(() => {
        open = false;
      });
      const replayId = replay.replayId();
      const send = (event: RunEvent) => stream.writeSSE({ id: eventId(replayId, event), event: "run", data: JSON.stringify(event) });
      const reset = () => stream.writeSSE({ event: "reset", data: "{}" });
      await stream.write(`retry: 2000\n\n`);

      // No header: from the start. Same replay: resume after its seq. Unreadable or another
      // replay's id: the browser's run state belongs to a replay that is gone, so it starts over.
      let after = 0;
      if (header !== undefined) {
        const parsed = LastEventId.safeParse(header);
        if (!parsed.success || parsed.data.replay !== replayId) {
          await reset();
          return;
        }
        after = parsed.data.seq;
      }

      // Index into the due list, not seq: a live duplicate (seq 42 again) is still delivered.
      const first = replay.due(claimId);
      let sent = first.length;
      for (const event of first.filter((e) => e.seq > after)) await send(event);
      // The backlog is done, even when it was empty: the browser can show the run as it is now
      // instead of each catch-up step. No `id:`, so it never moves the browser's Last-Event-ID.
      await stream.writeSSE({ event: "synced", data: "{}" });

      for (let polls = 1; open; polls++) {
        await stream.sleep(POLL_MS);
        if (!open) break;
        if (replay.replayId() !== replayId) {
          await reset();
          break;
        }
        const due = replay.due(claimId);
        for (const event of due.slice(sent)) await send(event);
        sent = due.length;
        if (polls % HEARTBEAT_EVERY === 0) await stream.write(": hb\n\n");
      }
    });
  });
