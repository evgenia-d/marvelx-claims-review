import { Hono } from "hono";
import type { ClaimsService } from "../claims";
import { validQuery } from "./validate";

export const queueRoutes = (service: ClaimsService) =>
  new Hono().get("/queue", validQuery, (c) => c.json(service.queue(c.req.valid("query").status)));
