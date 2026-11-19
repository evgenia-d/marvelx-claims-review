import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createClaimsService, type Deps } from "./claims";
import { sendError } from "./errors";
import { claimRoutes } from "./routes/claims";
import { decisionRoutes } from "./routes/decisions";
import { eventRoutes } from "./routes/events";
import { queueRoutes } from "./routes/queue";
import { replayRoutes } from "./routes/replay";

export function createApp(deps: Deps) {
  const service = createClaimsService(deps);
  return new Hono()
    .basePath("/api")
    .get("/health", (c) => c.json({ ok: true }))
    .route("/", queueRoutes(service))
    .route("/", claimRoutes(service))
    .route("/", eventRoutes(service, deps.replay))
    .route("/", decisionRoutes(service))
    .route("/", replayRoutes(service))
    .notFound((c) => sendError(c, 404, "not_found", `No route for ${c.req.method} ${c.req.path}.`))
    .onError((err, c) => {
      // The JSON validator throws a 400 for a body that isn't JSON; everything else is a bug.
      if (err instanceof HTTPException && err.status === 400) return sendError(c, 400, "invalid_body", err.message);
      console.error(err);
      return sendError(c, 500, "internal_error", "Something went wrong on the server.");
    });
}
