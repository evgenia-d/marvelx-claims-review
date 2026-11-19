import { describe, expect, it } from "vitest";
import { QueueResponse, type QueueItem } from "@shared/contract";
import { errorOf, makeApp } from "./helpers";

async function queue(app: ReturnType<typeof makeApp>["app"], query = "") {
  const res = await app.request(`/api/queue${query}`);
  expect(res.status).toBe(200);
  return QueueResponse.parse(await res.json());
}

const item = (claims: QueueItem[], claimId: string) => {
  const found = claims.find((c) => c.claim_id === claimId);
  if (!found) throw new Error(`${claimId} not in queue`);
  return found;
};

describe("GET /api/queue", () => {
  it("returns all four claims sorted by priority then received", async () => {
    const { app } = makeApp();
    const { claims } = await queue(app);
    expect(claims.map((c) => c.claim_id)).toEqual([
      "CLM-2026-004817", // high
      "CLM-2026-004809", // normal, received 17 Sep
      "CLM-2026-004822", // normal, received 21 Sep
      "CLM-2026-004830", // low
    ]);
  });

  it("filters by status", async () => {
    const { app } = makeApp();
    const { claims } = await queue(app, "?status=needs_review");
    expect(claims.map((c) => c.claim_id)).toEqual(["CLM-2026-004809"]);
  });

  it("400 with a readable message for status=done", async () => {
    const { app } = makeApp();
    const res = await app.request("/api/queue?status=done");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "invalid_query", message: "Unknown status 'done'. Use one of: queued, running, needs_review, failed, reviewed." },
    });
  });

  it("400 for an unknown param", async () => {
    const { app } = makeApp();
    const res = await app.request("/api/queue?priority=high");
    expect(res.status).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe("invalid_query");
    expect(error.message).toContain("priority");
  });

  it("4817 is running at 0 ms", async () => {
    const { app } = makeApp();
    expect(item((await queue(app)).claims, "CLM-2026-004817").status).toBe("running");
  });

  it("4822 is queued before its run starts and running at tick(4000)", async () => {
    const { app, tick } = makeApp();
    expect(item((await queue(app)).claims, "CLM-2026-004822").status).toBe("queued");
    tick(3999);
    expect(item((await queue(app)).claims, "CLM-2026-004822").status).toBe("queued");
    tick(1);
    expect(item((await queue(app)).claims, "CLM-2026-004822").status).toBe("running");
  });

  it("4809 is needs_review with confidence 0.95 at once", async () => {
    const { app } = makeApp();
    const c = item((await queue(app)).claims, "CLM-2026-004809");
    expect(c).toMatchObject({ status: "needs_review", confidence: 0.95, run_failed: false, completed_at: null });
    // Preloaded: updated when its last event was delivered, started_at + 16 450 ms.
    expect(c.updated_at).toBe(new Date(Date.parse("2026-09-17T15:02:55+02:00") + 16450).toISOString());
  });

  it("4822 is failed with run_failed and confidence null after tick(4000 + 31750)", async () => {
    const { app, tick } = makeApp();
    tick(4000 + 31750);
    expect(item((await queue(app)).claims, "CLM-2026-004822")).toMatchObject({
      status: "failed",
      run_failed: true,
      confidence: null,
    });
  });

  it("counts every status, zeros included", async () => {
    const { app } = makeApp();
    const { counts } = await queue(app, "?status=running");
    expect(counts.status).toEqual({ queued: 2, running: 1, needs_review: 1, failed: 0, reviewed: 0 });
  });
});
