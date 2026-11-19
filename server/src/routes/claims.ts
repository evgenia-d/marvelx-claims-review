import { Hono } from "hono";
import type { ClaimsService } from "../claims";
import { sendFailure } from "../errors";
import { validClaimParams } from "./validate";

export const claimRoutes = (service: ClaimsService) =>
  new Hono()
    .get("/claims/:claimId", validClaimParams, (c) => {
      const result = service.detail(c.req.valid("param").claimId);
      return result.ok ? c.json(result.value) : sendFailure(c, result);
    })
    .post("/claims/:claimId/complete", validClaimParams, (c) => {
      const result = service.complete(c.req.valid("param").claimId);
      return result.ok ? c.json(result.value) : sendFailure(c, result);
    });
