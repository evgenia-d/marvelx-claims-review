import { describe, expect, it } from "vitest";
import { Decision, DecisionsResponse, QueueItem, QueueResponse } from "@shared/contract";
import { errorOf, fieldIds, json, makeApp } from "./helpers";

type App = ReturnType<typeof makeApp>["app"];
const C4809 = "CLM-2026-004809";
const C4817 = "CLM-2026-004817";
const C4822 = "CLM-2026-004822";
const decisionUrl = (claimId: string, fieldId: string) => `/api/claims/${claimId}/fields/${fieldId}/decision`;
const put = (app: App, claimId: string, fieldId: string, body: unknown) =>
  app.request(decisionUrl(claimId, fieldId), { method: "PUT", ...json(body) });
const del = (app: App, claimId: string, fieldId: string) => app.request(decisionUrl(claimId, fieldId), { method: "DELETE" });
const complete = (app: App, claimId: string) => app.request(`/api/claims/${claimId}/complete`, { method: "POST" });

// 4809 and 4822 never revise a field, so every field is still at agent version 1.
async function acceptAll(app: App, claimId: string) {
  for (const id of fieldIds(claimId)) expect((await put(app, claimId, id, { action: "accept", based_on: 1 })).status).toBe(200);
}

describe("decisions", () => {
  it("saves an accept against the current version", async () => {
    const { app } = makeApp();
    const res = await put(app, C4809, "repair_cost", { action: "accept", based_on: 1 });
    expect(res.status).toBe(200);
    expect(Decision.parse(await res.json())).toEqual({
      action: "accept", claim_id: C4809, field_id: "repair_cost", based_on: 1, at: new Date(0).toISOString(),
    });
    const list = DecisionsResponse.parse(await (await app.request(`/api/claims/${C4809}/decisions`)).json());
    expect(list.decisions.map((d) => d.field_id)).toEqual(["repair_cost"]);
  });

  it("409 agent_revised when based_on is outdated", async () => {
    const { app, tick } = makeApp();
    tick(54000); // total_incl_vat revised to 4415.30 at 53.8 s: version 2
    const res = await put(app, C4817, "total_incl_vat", { action: "accept", based_on: 1 });
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("agent_revised");
    expect((await put(app, C4817, "total_incl_vat", { action: "accept", based_on: 2 })).status).toBe(200);
  });

  it("404 field_not_found for a field not yet emitted", async () => {
    const { app } = makeApp();
    const res = await put(app, C4817, "total_incl_vat", { action: "accept", based_on: 1 });
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("field_not_found");
  });

  it("404 claim_not_found for an unknown claim", async () => {
    const { app } = makeApp();
    const res = await put(app, "CLM-2026-999999", "repair_cost", { action: "accept", based_on: 1 });
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("claim_not_found");
  });

  it("400 when an override has no reason", async () => {
    const { app } = makeApp();
    const res = await put(app, C4809, "plate", { action: "override", based_on: 1, value: "XX-123-Y" });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("invalid_body");
  });

  it("400 invalid_body for malformed JSON", async () => {
    const { app } = makeApp();
    const res = await app.request(decisionUrl(C4809, "plate"), {
      method: "PUT", headers: { "content-type": "application/json" }, body: "{",
    });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("invalid_body");
  });

  it("400 invalid_value for a string on a money field", async () => {
    const { app } = makeApp();
    const res = await put(app, C4809, "repair_cost", { action: "correct", based_on: 1, value: "412.00" });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("invalid_value");
  });

  it("undo returns 204 and the field has no decision", async () => {
    const { app } = makeApp();
    await put(app, C4809, "repair_cost", { action: "accept", based_on: 1 });
    expect((await del(app, C4809, "repair_cost")).status).toBe(204);
    expect((await del(app, C4809, "repair_cost")).status).toBe(204);
    const list = DecisionsResponse.parse(await (await app.request(`/api/claims/${C4809}/decisions`)).json());
    expect(list.decisions).toEqual([]);
  });

  it("undo is 404 field_not_found for a field not yet emitted", async () => {
    const { app } = makeApp();
    const res = await del(app, C4817, "total_incl_vat");
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("field_not_found");
  });

  it("409 claim_completed after completion, for save and undo", async () => {
    const { app } = makeApp();
    await acceptAll(app, C4809);
    expect((await complete(app, C4809)).status).toBe(200);
    const save = await put(app, C4809, "repair_cost", { action: "accept", based_on: 1 });
    expect(save.status).toBe(409);
    expect((await errorOf(save)).code).toBe("claim_completed");
    const undo = await del(app, C4809, "repair_cost");
    expect(undo.status).toBe(409);
    expect((await errorOf(undo)).code).toBe("claim_completed");
    const again = await complete(app, C4809);
    expect(again.status).toBe(409);
    expect((await errorOf(again)).code).toBe("claim_completed");
  });

  it("complete is 409 not_ready while running and with pending fields", async () => {
    const { app } = makeApp();
    const running = await complete(app, C4817);
    expect(running.status).toBe(409);
    expect(await running.json()).toEqual({
      error: { code: "not_ready", message: "The agent is still working on this claim." },
    });
    await put(app, C4809, "repair_cost", { action: "accept", based_on: 1 });
    const pending = await complete(app, C4809);
    expect(pending.status).toBe(409);
    expect(await pending.json()).toEqual({ error: { code: "not_ready", message: "6 fields still need a decision." } });
  });

  it("complete moves the queue item to reviewed and keeps run_failed", async () => {
    const { app, tick } = makeApp();
    tick(4000 + 31750);
    await acceptAll(app, C4822);
    const res = await complete(app, C4822);
    expect(res.status).toBe(200);
    expect(QueueItem.parse(await res.json())).toMatchObject({
      claim_id: C4822, status: "reviewed", run_failed: true, completed_at: new Date(35750).toISOString(),
    });
    const queue = QueueResponse.parse(await (await app.request("/api/queue?status=reviewed")).json());
    expect(queue.claims.map((c) => c.claim_id)).toEqual([C4822]);
  });
});
