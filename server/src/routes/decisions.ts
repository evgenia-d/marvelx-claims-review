import { Hono } from "hono";
import { DecisionInput } from "@shared/contract";
import type { ClaimsService } from "../claims";
import { sendFailure } from "../errors";
import { validClaimParams, validFieldParams, validJson } from "./validate";

const FIELD_DECISION = "/claims/:claimId/fields/:fieldId/decision";

export const decisionRoutes = (service: ClaimsService) =>
  new Hono()
    .get("/claims/:claimId/decisions", validClaimParams, (c) => {
      const result = service.decisions(c.req.valid("param").claimId);
      return result.ok ? c.json(result.value) : sendFailure(c, result);
    })
    .put(FIELD_DECISION, validFieldParams, validJson(DecisionInput), (c) => {
      const { claimId, fieldId } = c.req.valid("param");
      const result = service.decide(claimId, fieldId, c.req.valid("json"));
      return result.ok ? c.json(result.value) : sendFailure(c, result);
    })
    .delete(FIELD_DECISION, validFieldParams, (c) => {
      const { claimId, fieldId } = c.req.valid("param");
      const result = service.undo(claimId, fieldId);
      return result.ok ? c.body(null, 204) : sendFailure(c, result);
    });
