import { describe, expect, it } from "vitest";
import { ClaimDetail } from "@shared/contract";
import { errorOf, makeApp } from "./helpers";

describe("GET /api/claims/:claimId", () => {
  it("404 claim_not_found for CLM-2026-999999", async () => {
    const { app } = makeApp();
    const res = await app.request("/api/claims/CLM-2026-999999");
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("claim_not_found");
  });

  it("400 for a malformed id", async () => {
    const { app } = makeApp();
    const res = await app.request("/api/claims/4817");
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("invalid_id");
  });

  it("detail includes documents with text, groups and not_checked", async () => {
    const { app } = makeApp();
    const res = await app.request("/api/claims/CLM-2026-004822");
    expect(res.status).toBe(200);
    const detail = ClaimDetail.parse(await res.json());
    expect(detail.claim.claim_id).toBe("CLM-2026-004822");
    expect(detail.documents.map((d) => d.document_id)).toEqual(["plumber-report-004822", "claimant-statement-004822"]);
    expect(detail.documents.every((d) => d.text.length > 0)).toBe(true);
    expect(detail.field_groups.map((g) => g.name)).toEqual(["Incident", "Repair", "Contents"]);
    expect(detail.not_checked).toEqual({ lookup_policy: "policy cover and excess" });
  });
});
