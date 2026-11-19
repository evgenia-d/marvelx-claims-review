// zValidator wrappers that answer a Zod failure with our error shape and a readable message.
import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import { ClaimParams, ClaimStatus, FieldParams, QueueQuery } from "@shared/contract";
import { describeIssues, sendError } from "../errors";

const CLAIM_ID_HINT = "Claim ids look like CLM-2026-004817.";

export const validQuery = zValidator("query", QueueQuery, (result, c) => {
  if (result.success) return;
  const messages = result.error.issues.map((issue) => {
    if (issue.code === "unrecognized_keys")
      return `Unknown query parameter ${issue.keys.map((k) => `'${k}'`).join(", ")}. The queue takes only: status.`;
    if (issue.path[0] === "status")
      return `Unknown status '${c.req.query("status")}'. Use one of: ${ClaimStatus.options.join(", ")}.`;
    return issue.message;
  });
  return sendError(c, 400, "invalid_query", messages.join(" "));
});

function validParams<S extends z.ZodType>(schema: S) {
  return zValidator("param", schema, (result, c) => {
    if (result.success) return;
    const field = result.error.issues[0]?.path[0];
    const message =
      field === "claimId" ? `'${c.req.param("claimId")}' is not a claim id. ${CLAIM_ID_HINT}` : describeIssues(result.error);
    return sendError(c, 400, "invalid_id", message);
  });
}
export const validClaimParams = validParams(ClaimParams);
export const validFieldParams = validParams(FieldParams);

export function validJson<S extends z.ZodType>(schema: S) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) return sendError(c, 400, "invalid_body", describeIssues(result.error));
  });
}
