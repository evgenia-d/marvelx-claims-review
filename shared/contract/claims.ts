import { z } from "zod";

export const ClaimStatus = z.enum(["queued", "running", "needs_review", "failed", "reviewed"]);
export const Priority = z.enum(["high", "normal", "low"]);

export const QueueItem = z.object({
  id: z.string(), claim_id: z.string(), claimant_name: z.string(), product: z.string(), priority: Priority,
  status: ClaimStatus,
  run_failed: z.boolean(), // stays true after a failed run is reviewed (SPEC assumptions)
  needs_you: z.number().int().min(0), // fields needing attention, from fieldView
  confidence: z.number().min(0).max(1).nullable(), // overall_confidence once the run finished, else null
  received_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
});

// strictObject: an unknown param (including the cut ?priority=) is a 400, not silently ignored.
export const QueueQuery = z.strictObject({ status: ClaimStatus.optional() });
export const QueueResponse = z.object({
  claims: z.array(QueueItem), // sorted: priority high -> low, then oldest received_at
  // claims per status, over the whole queue, zeros included
  counts: z.object({ status: z.record(ClaimStatus, z.number().int()) }),
});

export const DocumentMeta = z.object({ document_id: z.string(), title: z.string(), kind: z.string() });
export const ClaimDetail = z.object({
  claim: QueueItem,
  documents: z.array(DocumentMeta.extend({ text: z.string() })), // small; one request, slice in the browser
  field_groups: z.array(z.object({ name: z.string(), field_ids: z.array(z.string()) })),
  not_checked: z.record(z.string(), z.string()), // step_id -> "policy cover and excess"
});

export type ClaimStatus = z.infer<typeof ClaimStatus>;
export type Priority = z.infer<typeof Priority>;
export type QueueItem = z.infer<typeof QueueItem>;
export type QueueQuery = z.infer<typeof QueueQuery>;
export type QueueResponse = z.infer<typeof QueueResponse>;
export type DocumentMeta = z.infer<typeof DocumentMeta>;
export type ClaimDetail = z.infer<typeof ClaimDetail>;
