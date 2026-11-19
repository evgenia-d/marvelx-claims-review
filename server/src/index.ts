import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadCatalog } from "./catalog";
import { createMemoryDecisionStore } from "./decisions";
import { createReplay } from "./replay";

const port = 8787;
const now = () => Date.now();
const catalog = loadCatalog(join(import.meta.dirname, "..", "..", "fixtures"));
const app = createApp({ catalog, replay: createReplay(catalog, now), store: createMemoryDecisionStore(), now });

serve({ fetch: app.fetch, port }, () => console.log(`Server listening on http://localhost:${port}`));
