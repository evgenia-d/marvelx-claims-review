import { z } from "zod";

// A malformed id is a 400, a well-formed unknown one a 404.
export const ClaimParams = z.object({ claimId: z.string().regex(/^CLM-\d{4}-\d{6}$/) });
export const FieldParams = ClaimParams.extend({ fieldId: z.string().min(1) });

export type ClaimParams = z.infer<typeof ClaimParams>;
export type FieldParams = z.infer<typeof FieldParams>;
