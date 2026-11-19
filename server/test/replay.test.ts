import { describe, expect, it } from "vitest";
import { DecisionsResponse, QueueResponse } from "@shared/contract";
import { fieldIds, json, makeApp } from "./helpers";

type App = ReturnType<typeof makeApp>["app"];
const statuses = async (app: App) => {
  const { claims } = QueueResponse.parse(await (await app.request("/api/queue")).json());
  return Object.fromEntries(claims.map((c) => [c.claim_id, c.status]));
};

describe("POST /api/replay/restart", () => {
  it("restart clears decisions and completion and starts runs at 0, 4 and 20 s", async () => {
    const { app, tick } = makeApp();
    tick(30000);
    for (const id of fieldIds("CLM-2026-004809"))
      await app.request(`/api/claims/CLM-2026-004809/fields/${id}/decision`, { method: "PUT", ...json({ action: "accept", based_on: 1 }) });
    expect((await app.request("/api/claims/CLM-2026-004809/complete", { method: "POST" })).status).toBe(200);

    expect((await app.request("/api/replay/restart", { method: "POST" })).status).toBe(204);

    const decisions = DecisionsResponse.parse(await (await app.request("/api/claims/CLM-2026-004809/decisions")).json());
    expect(decisions).toEqual({ decisions: [] });
    expect(await statuses(app)).toEqual({
      "CLM-2026-004817": "running",
      "CLM-2026-004809": "needs_review",
      "CLM-2026-004822": "queued",
      "CLM-2026-004830": "queued",
    });
    tick(4000);
    expect((await statuses(app))["CLM-2026-004822"]).toBe("running");
    tick(15999);
    expect((await statuses(app))["CLM-2026-004830"]).toBe("queued");
    tick(1);
    expect((await statuses(app))["CLM-2026-004830"]).toBe("running");
  });
});
