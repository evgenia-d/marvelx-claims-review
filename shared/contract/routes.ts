import { z } from "zod";

// A malformed id is a 400, a well-formed unknown one a 404.
export const ClaimParams = z.object({ claimId: z.string().regex(/^CLM-\d{4}-\d{6}$/) });
export const FieldParams = ClaimParams.extend({ fieldId: z.string().min(1) });

export type ClaimParams = z.infer<typeof ClaimParams>;
export type FieldParams = z.infer<typeof FieldParams>;

// SSE event ids are `<replay id>.<seq>`. The replay id is random per server start and per replay
// restart, so a browser reconnecting with an id from an earlier replay (tsx reload, npm run replay)
// is told to start over instead of resuming by seq against a clock that went back to zero.
const EVENT_ID = /^([0-9a-f]{8})\.(\d+)$/;
export const LastEventId = z
  .string()
  .regex(EVENT_ID)
  .transform((id) => {
    const [, replay = "", seq = "0"] = EVENT_ID.exec(id) ?? [];
    return { replay, seq: parseInt(seq, 10) };
  });
export type LastEventId = z.infer<typeof LastEventId>;
