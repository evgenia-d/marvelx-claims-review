import { join } from "node:path";
import { ApiError } from "@shared/contract";
import { createApp } from "../src/app";
import { loadCatalog } from "../src/catalog";
import { createMemoryDecisionStore } from "../src/decisions";
import { createReplay } from "../src/replay";

export const fixturesRoot = join(import.meta.dirname, "..", "..", "fixtures");
export const catalog = loadCatalog(fixturesRoot);

// A fresh app on a fake clock. tick(ms) moves the replay clock; nothing waits for real time.
export function makeApp(t0 = 0) {
  let t = t0;
  const now = () => t;
  const replay = createReplay(catalog, now);
  const store = createMemoryDecisionStore();
  const app = createApp({ catalog, replay, store, now });
  return { app, tick: (ms: number) => void (t += ms) };
}

export const json = (body: unknown) => ({
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function fieldIds(claimId: string): string[] {
  const claim = catalog.claims.find((c) => c.claim_id === claimId);
  return (claim?.events ?? []).flatMap((e) => (e.type === "field_extracted" ? [e.payload.field_id] : []));
}

// The error body of a failed response, checked against the one error shape.
export const errorOf = async (res: Response) => ApiError.parse(await res.json()).error;
