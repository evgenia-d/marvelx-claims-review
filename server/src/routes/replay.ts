import { Hono } from "hono";
import type { ClaimsService } from "../claims";

// Restarts every run from zero and clears decisions and completions (npm run replay).
export const replayRoutes = (service: ClaimsService) =>
  new Hono().post("/replay/restart", (c) => {
    service.restart();
    return c.body(null, 204);
  });
