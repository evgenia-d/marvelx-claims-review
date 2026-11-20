# Claims review: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

19 Nov 2026 · technical plan, written with superpowers:writing-plans (BRIEFING "Process" step 3).

**Goal:** A reviewer watches the fixture agent runs live, decides each extracted field (accept, correct, override, undo) through a small backend, and signs claims off, on laptop and phone.

**Architecture:** One Node process (Hono) owns the replay clock, the in-memory decisions and the queue. It streams run events per claim over SSE, and serves the queue, claim detail and decisions over REST. Browser and server share one Zod contract (`shared/contract/`) and one pure domain layer (`shared/domain/`: reducer, `fieldView`, status), so the merge rule "a human decision is never overwritten" exists once. In the browser, TanStack Query owns server data, a Zustand store owns run state built by the shared reducer, and the URL owns filters and the open field.

**Tech Stack:** Node 22+, TypeScript strict, Vite, React 19 + React Compiler, React Router, TanStack Query v5, Zustand, Tailwind v4, Zod 4, Hono + `@hono/node-server` + `@hono/zod-validator`, react-markdown, Vitest, Playwright (smoke tests and screenshots), tsx, ESLint. No headless UI library.

**Execution:** subagent-driven for every slice (superpowers:subagent-driven-development), Slice C included; C runs in its own worktree in parallel with B and A. Implementer model: Opus for B, A, D1, D2 (reducer, merge rule, API: costly if wrong); Sonnet for 0, C, E, F, G (well specified). Reviewers on Opus.

**Spec:** `plans/SPEC.md` (product rules and acceptance rows A1–A8, T1–T7; T8 retry and P1 priority filter cut by the owner on 19 Nov). Look and building blocks: `DESIGN.md`. Fixture format: `fixtures/README.md`.

## Global Constraints

- Every rule in `CLAUDE.md` "Hard rules" and the three `.claude/rules/` files applies to every task.
- Money is `{ amount: string, currency: string }` end to end. No `parseFloat`, `Number()` or arithmetic on `amount`; display via `Intl.NumberFormat(…).format(amount)` (string input, Node 22+ and current browsers).
- `fixtures/` is read-only. Our runs go in `fixtures/extra/`, same JSONL format.
- Confidence thresholds: Low under 0.60, Medium 0.60 to under 0.85, High 0.85 and above. Defined once, in `shared/domain/confidence.ts`.
- Error body everywhere: `{ "error": { "code": string, "message": string } }`. 400 invalid input, 404 unknown claim or field, 409 outdated agent version / completed claim / not ready, 500 bugs only.
- Tokens only (DESIGN.md). No raw hex, `rgb()` or Tailwind arbitrary values outside `web/src/index.css`.
- Breakpoint: phone layout below `lg` (1024 px). Phone controls 44 px high.
- Ports: server `8787`, web `5173`; Vite proxies `/api` to the server.
- No new dependency beyond the list in Slice 0 without asking.

## Review Focus

Inputs the spec implies but doesn't spell out, most likely to bite first. Each has a test in the task that owns the code.

1. **Replay restarted while a review screen is open.** Expected: the screen empties and replays from zero; no fields or decisions from the old replay mix in. Test: Slice A, "sends a reset event and closes the stream when the replay restarts"; Slice D2 store test "reset clears the claim's run state".
2. **Two fast clicks on one field** (Accept, then Undo, before the first save returns). Expected: saves run in order, last one wins, no flicker back. Test: Slice D2, decision mutations share `scope: { id: "decision:<claim>:<field>" }`; pure test "applies optimistic decisions in call order".
3. **The agent revises a field while the reviewer is typing a correction.** Expected: the input keeps its text and focus; the 409 on save keeps the text. Test: Slice D2 component test "keeps the typed value when the save is refused with 409" (needs Testing Library; see Slice 0 deps).
4. **A malformed or unexpected event** (unknown `type`, a revision for a `field_id` never extracted, a bad JSON line in an extra run). Expected: dropped, nothing crashes, the rest of the run applies. Tests: Slice B "ignores a revision for a field that was never extracted"; Slice D1 "parseRunEvent returns null for an unknown event type".
5. **A citation that can't be resolved** (unknown `document_id`, or `end` past the document's length). Expected: treated like no usable source ("Source not available"), never a crash or a wrong slice. Test: Slice B "citedText returns null when the offsets fall outside the document".

---

## The data contract (`shared/contract/`)

One file per concern; types are `z.infer`'d next to each schema and never redeclared. Fixture events are parsed with these schemas at server startup, so a schema bug fails fast in a test, not in the browser.

### `events.ts`: the fixture run events

```ts
export const Money = z.object({ amount: z.string().regex(/^-?\d+(\.\d+)?$/), currency: z.string().length(3) });
export const ValueType = z.enum(["text", "long_text", "money", "date", "time", "number", "boolean"]);
// field_revised carries no value_type, so the value is the loose union; fieldView pairs it with the extracted value_type.
export const FieldValue = z.union([z.string(), z.number(), z.boolean(), Money]).nullable();
export const Source = z.object({ document_id: z.string(), start: z.number().int().min(0), end: z.number().int().min(0) }).nullable();

const envelope = { seq: z.number().int().positive(), at_ms: z.number().int().min(0), claim_id: z.string() };
export const RunEvent = z.discriminatedUnion("type", [
  z.object({ ...envelope, type: z.literal("run_started"), payload: z.object({ started_at: z.iso.datetime({ offset: true }) }) }),
  z.object({ ...envelope, type: z.literal("step_started"), payload: z.object({ step_id: z.string(), label: z.string() }) }),
  z.object({ ...envelope, type: z.literal("step_finished"), payload: z.object({ step_id: z.string(), outcome: z.enum(["ok", "warning"]), note: z.string().optional() }) }),
  z.object({ ...envelope, type: z.literal("summary_delta"), payload: z.object({ text: z.string() }) }),
  z.object({ ...envelope, type: z.literal("field_extracted"), payload: z.object({ field_id: z.string(), label: z.string(), value: FieldValue, value_type: ValueType, confidence: z.number().min(0).max(1), source: Source }) }),
  z.object({ ...envelope, type: z.literal("field_revised"), payload: z.object({ field_id: z.string(), value: FieldValue, confidence: z.number().min(0).max(1), source: Source, reason: z.string() }) }),
  z.object({ ...envelope, type: z.literal("confidence_changed"), payload: z.object({ field_id: z.string(), confidence: z.number().min(0).max(1), reason: z.string() }) }),
  z.object({ ...envelope, type: z.literal("run_finished"), payload: z.object({ overall_confidence: z.number().min(0).max(1) }) }),
  z.object({ ...envelope, type: z.literal("run_failed"), payload: z.object({ step_id: z.string(), error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }) }) }),
]);
```

### `claims.ts`: queue and claim detail (ours)

```ts
export const ClaimStatus = z.enum(["queued", "running", "needs_review", "failed", "reviewed"]);
export const Priority = z.enum(["high", "normal", "low"]);

export const QueueItem = z.object({
  id: z.string(), claim_id: z.string(), claimant_name: z.string(), product: z.string(), priority: Priority,
  status: ClaimStatus,
  run_failed: z.boolean(),                 // stays true after a failed run is reviewed (SPEC assumptions)
  needs_you: z.number().int().min(0),      // fields needing attention, from fieldView
  confidence: z.number().min(0).max(1).nullable(), // overall_confidence once the run finished, else null
  received_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
});

// strictObject: an unknown param is a 400, not silently ignored.
export const QueueQuery = z.strictObject({ status: ClaimStatus.optional() });
export const QueueResponse = z.object({
  claims: z.array(QueueItem),              // sorted: priority high → low, then oldest received_at
  counts: z.object({                       // claims per status, over the whole queue, zeros included
    status: z.record(ClaimStatus, z.number().int()),
  }),
});

export const DocumentMeta = z.object({ document_id: z.string(), title: z.string(), kind: z.string() });
export const ClaimDetail = z.object({
  claim: QueueItem,
  documents: z.array(DocumentMeta.extend({ text: z.string() })),   // small; one request, slice in the browser
  field_groups: z.array(z.object({ name: z.string(), field_ids: z.array(z.string()) })),
  not_checked: z.record(z.string(), z.string()),                    // step_id → "policy cover and excess"
});
```

`field_groups` and `not_checked` are our product config, not fixture data: `server/src/claimConfig.ts`, copied from the groups in `plans/design/gen/proto.py`. A field not in any group goes into a trailing "Other" group in arrival order; the browser builds it with `groupFields(groups, fieldOrder)` from `shared/domain/`, because fields arrive after the detail is fetched.

### `decisions.ts`

```ts
// based_on = the field's agent version the reviewer saw (see "Agent version" below).
const BasedOn = z.number().int().positive();
const OverrideReason = z.string().trim().min(1).max(200);   // one definition for input and stored record
export const DecisionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), based_on: BasedOn }),
  z.object({ action: z.literal("correct"), based_on: BasedOn, value: FieldValue }),
  z.object({ action: z.literal("override"), based_on: BasedOn, value: FieldValue, reason: OverrideReason }),
]);
// Stored record: same per-action shape as DecisionInput (owner, 2026-11-19), so an override always
// has a reason, an accept never carries a value, and `switch (d.action)` narrows the type.
const decisionMeta = {
  claim_id: z.string(), field_id: z.string(),
  based_on: BasedOn,
  at: z.iso.datetime({ offset: true }),    // set by the server
};
export const Decision = z.discriminatedUnion("action", [
  z.object({ ...decisionMeta, action: z.literal("accept") }),
  z.object({ ...decisionMeta, action: z.literal("correct"), value: FieldValue }),
  z.object({ ...decisionMeta, action: z.literal("override"), value: FieldValue, reason: OverrideReason }),
]);
export const DecisionsResponse = z.object({ decisions: z.array(Decision) });
export const ApiError = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
```

`correct` and `override` values are checked against the field's `value_type` by the server (`valueMatchesType(valueType, value)` in `shared/domain/values.ts`), because the body alone can't know the type. Mismatch → 400 `invalid_value`.

### `routes.ts`

Path params `ClaimParams = { claimId: z.string().regex(/^CLM-\d{4}-\d{6}$/) }`, `FieldParams = ClaimParams + { fieldId: z.string().min(1) }`. A malformed id is a 400, a well-formed unknown one a 404.

## The state model

**Agent version.** Per field, starts at 1 on `field_extracted`, +1 on each `field_revised` whose value differs (deep-equal: money compares `amount` and `currency` strings). `confidence_changed` and a same-value revision never move it. Each decision stores `based_on`; a decision is current while `based_on === field.version`.

| Owner | Holds | Where |
|---|---|---|
| Server replay | per-claim timeline, clock, `replayId` (new on every process start and restart) | `server/src/replay.ts` |
| Server store | current decision per field, `completed_at` per claim | `server/src/decisions.ts` |
| Run state (browser) | `RunState` per claim, from `applyEvent`; never edited by the UI | Zustand, `web/src/api/runStore.ts` |
| Server data (browser) | queue (polled every 2 s while the queue page is open), claim detail, decisions (optimistic) | TanStack Query, `web/src/api/queries.ts` |
| URL | `/?status=`, `/claims/:claimId?field=<field_id>` | React Router + Zod |
| Local | the open decision form's draft, open sections, field filter (Needs you / To review / All) | `useState` |
| Derived | field status, shown value, attention, counts, claim status, can-complete | `shared/domain/`, at render time |

**Why the queue polls and the run streams (owner, 19 Nov):** a queue row's `updated_at` and `needs_you` change with almost every agent event (4817: 111 events in 103 s), so a push signal would fire about once a second while runs are live: more requests than a 2 s poll, for a summary page where 2 s is fresh enough. Polling needs no server loop, no change detection and no timing tests, and keeps one long-lived connection per tab (HTTP/1.1 allows 6 per origin across tabs). The run stream stays SSE: there fields must appear the moment the agent emits them, data flows one way, and `EventSource` reconnects on its own. TanStack Query pauses the poll in a hidden tab, and the reviewer's own decisions refetch the queue at once. The queue item is computed by the server with the same domain functions as the review screen, so the two can't disagree.

### `shared/domain/` signatures (Slice B owns them)

```ts
// run.ts
type StepState = "running" | "ok" | "warning" | "failed";
type Step = { step_id: string; label: string; state: StepState; note: string | null };
type FieldEntry = { seq: number; kind: "extracted" | "revised" | "confidence"; value: FieldValue; confidence: number;
                    source: Source; reason: string | null; version: number };
type FieldState = { field_id: string; label: string; value_type: ValueType; step_id: string | null; // step running when extracted
                    version: number; current: FieldEntry; history: FieldEntry[] };
type RunState = { claim_id: string; status: "not_started" | "running" | "finished" | "failed";
                  started_at: string | null; seen: ReadonlySet<number>; last_seq: number;
                  steps: Step[]; summary: string; fields: Record<string, FieldState>; field_order: string[];
                  overall_confidence: number | null;
                  error: { step_id: string; code: string; message: string; retryable: boolean } | null };
function initialRunState(claimId: string): RunState;
function applyEvent(state: RunState, event: RunEvent): RunState;      // same object back if seq seen
function applyEvents(state: RunState, events: RunEvent[]): RunState;

// values.ts
function sameValue(a: FieldValue, b: FieldValue): boolean;
function valueMatchesType(t: ValueType, v: FieldValue): boolean;      // null matches every type

// citation.ts
function citedText(docs: Record<string, string>, source: Source): string | null;
function citationCheck(t: ValueType, v: FieldValue, cited: string | null): "found" | "not_found" | "not_checked";

// confidence.ts
function confidenceLevel(c: number): "low" | "medium" | "high";

// fieldView.ts
type FieldStatus = "pending" | "accepted" | "corrected" | "overridden" | "revised_after_decision";
type Attention = "low_confidence" | "revised_after_decision" | "no_source" | "not_in_citation" | "step_warning" | "empty_value";
type FieldContext = { cited: string | null; stepOutcome: StepState | null };
type FieldView = { field_id: string; label: string; value_type: ValueType; status: FieldStatus;
                   shown: { value: FieldValue; by: "agent" | "you" };
                   agent: FieldEntry;                                      // latest agent entry
                   decidedOn: FieldEntry | null;                           // agent entry the decision was made against
                   previous: { value: FieldValue; reason: string | null } | null; // before the last value change
                   decision: Decision | null; citation: "found" | "not_found" | "not_checked";
                   attention: Attention[]; needsYou: boolean };
function fieldView(field: FieldState, decision: Decision | undefined, ctx: FieldContext): FieldView;

// status.ts
function claimStatus(run: RunState["status"], completedAt: string | null): ClaimStatus;
type CompleteCheck = { ok: true } | { ok: false; reason: "not_started" | "agent_working" | "fields_left"; left: number };
function canComplete(run: RunState["status"], views: FieldView[], completedAt: string | null): CompleteCheck;
function queueCounts(items: QueueItem[], q: QueueQuery): QueueResponse["counts"];

// format.ts (Intl only; locale "en-IE")
function formatValue(t: ValueType, v: FieldValue): string | null;     // null → caller shows "Not found"
function formatMoney(m: Money): string;                                // {"4415.30","EUR"} → "€4,415.30"
function formatDate(iso: string): string;                              // "2026-09-13" → "13 Sep 2026", no TZ shift
function formatInstant(iso: string): string;                           // "10:06" in the browser's zone
```

**Merge rule (`fieldView`).** No decision → `pending`, shown = agent's latest. `decision.based_on < field.version` → `revised_after_decision`, shown = the decision's value (`accept` → the agent value of the entry with `version === based_on`), `by` stays the decision's. Otherwise `accepted` (shown agent, by agent) / `corrected` / `overridden` (shown decision value, by you). Undo deletes the decision, so the field is `pending` again and the flag goes with it.

**Attention.** Reasons are always computed (they drive tags): `low_confidence` (Low), `revised_after_decision`, `no_source` (source null), `not_in_citation`, `step_warning` (the field's extracting step finished with `warning`), `empty_value` (null). `needsYou = attention.length > 0 && status ∈ {pending, revised_after_decision}`: a current decision answers the field.

**T2 matching (`citationCheck`).** Only `time`, `date`, `money`, `number`; others `not_checked`; null value, null cited, or a value of the wrong shape for its type → `not_checked`. The check reads numbers and dates out of the cited text and compares them to the value as written; it never formats the value or builds a regex from agent text.
- money `"1189.00"` and number `48213`: the numbers in the cited text, each read whole with thousands commas removed (`€ 1,189.00` → `1189.00`), must include the amount string or `String(n)`. So `4` is not found in `14.5 h`, and `1252.00` is not found in lines that only add up to it.
- time `"22:40"`: the cited text contains the string as is.
- date `"2026-09-13"`: the cited text contains `2026-09-13`, or a `D Month YYYY` date (`13 September 2026`, leading zero ignored). A date cited without its year (4822 `discovered_at`, "Sunday 20 September") is `not_found`: the year is unverified. Check this call.
- Only the English forms the fixture documents use (owner, 19 Nov). A value written another way shows as not found next to its cited text, which the reviewer can judge.

### Endpoints (`server/src/routes/`)

| Method + path | Body / query | Success | Errors |
|---|---|---|---|
| `GET /api/queue` | `QueueQuery` | 200 `QueueResponse` | 400 `invalid_query` ("Unknown status 'done'. Use one of: queued, running, …") |
| `GET /api/claims/:claimId` | | 200 `ClaimDetail` | 400, 404 `claim_not_found` |
| `GET /api/claims/:claimId/events` | header `Last-Event-ID` | SSE: `id: <replayId>.<seq>`, `event: run`, `data: RunEvent` JSON; `retry: 2000`; `: hb` every 15 s; `event: reset` then close on restart | 400, 404 (JSON, not a stream) |
| `GET /api/claims/:claimId/decisions` | | 200 `DecisionsResponse` | 400, 404 |
| `PUT /api/claims/:claimId/fields/:fieldId/decision` | `DecisionInput` | 200 `Decision` | 400 `invalid_body` / `invalid_value`, 404 `claim_not_found` / `field_not_found`, 409 `agent_revised` / `claim_completed` |
| `DELETE /api/claims/:claimId/fields/:fieldId/decision` | | 204 (also when there was none) | 404, 409 `claim_completed` |
| `POST /api/claims/:claimId/complete` | | 200 `QueueItem` | 404, 409 `not_ready` (message from `canComplete`) |
| `POST /api/replay/restart` | | 204 | |

**SSE delivery.** On connect: without `Last-Event-ID`, every due event in delivery order; with one from the current replay, those with `seq >` its seq; with one from another replay or process start (or unreadable), `event: reset` and close, so a tab that missed a restart (offline, or the server process restarted) starts over instead of mixing two replays (owner, 19 Nov). Then every 200 ms the newly due ones. The fixture's duplicate (seq 42 again at 56.7 s) is sent as the file has it; the reducer drops it. Resuming by `seq >` can skip a late duplicate, which is harmless. Stops writing on `stream.onAbort`.

**Clock.** `createReplay(catalog, now: () => number)`. `elapsed = now() - startedAt`. An event of a run segment is due when the segment's start is `null` (4809: preloaded) or `start + at_ms <= elapsed`. `updated_at` = the wall time the last due event was delivered (for 4809: `started_at` + its `at_ms`), or the last decision or completion if later.

---

## Slices

Order of work: **0 → B → A → C → D1 → D2 → E → F → G**, then Finish. A depends on B because the server computes queue status and `needs_you` with the shared domain. C only needs 0, so it can run in a parallel worktree while B and A are built.

| Slice | Needs | Spec rows | Done when (on top of CLAUDE.md "a slice is done when") |
|---|---|---|---|
| 0 Scaffold + contract | – | – | `npm run dev` serves a blank page with tokens and a `/api/health`; every fixture file parses with the contract |
| B Domain | 0 | merge rule, A1/A2 logic, T2–T5 logic, A6 logic | every test below green; no React or I/O import in `shared/` |
| A Backend | 0, B | A4/A5/A6/A8 backend | `npm run replay` restarts; 400/404/409 tested; SSE catch-up + resume tested with a fake clock |
| C UI primitives | 0 | look of A7 | the DESIGN.md primitives, checked where D1–G use them; token check passes |
| D1 Review, live read | B, A, C | A1, T1, T2, T4, T5, T6 (laptop), T7 | 4817 plays live at 1280 px, reload mid-run resumes, no row moves |
| D2 Review, decisions | D1 | A2, A6, A8, T3 | the BRIEFING checklist items on decisions pass by hand |
| E Queue | A, C, D2 | A4, A5 (control) | live rows, status filter in the URL, invalid filter message; Playwright smoke tests pass |
| F States | D2, E | A3 | every state in DESIGN `ReviewStates` / `QueueStates` reachable; 4822 failure |
| G Phone + access | F | A7 | 375 and 1280 px pass the A7 criteria; keyboard-only review of one claim |

---

### Slice 0: Scaffold and contract

**Files:**
- Create: `package.json`, `tsconfig.json` (+ `tsconfig.web.json`, `tsconfig.node.json`), `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `scripts/check-tokens.mjs`, `scripts/replay.mjs`
- Create: `web/index.html`, `web/src/main.tsx`, `web/src/index.css` (the `@theme` block from DESIGN.md verbatim, plus `@keyframes pulse`, `fade-in`)
- Create: `shared/contract/{events,claims,decisions,routes,index}.ts`
- Create: `server/src/index.ts` (serve on 8787, `GET /api/health` → `{ ok: true }`)
- Test: `shared/contract/contract.test.ts`
- Modify: `CLAUDE.md` "Commands" (propose as a diff, apply on approval)

**Interfaces:** Produces every schema and inferred type in "The data contract" above, exported from `shared/contract/index.ts`. Import alias `@shared/*` → `shared/*` in tsconfig, Vite and Vitest.

One `package.json` at the root, no workspaces: three folders, one install, one test runner. Splitting into workspaces later is mechanical.

- [ ] **Step 1: Ask the owner to approve the dependencies.** Runtime: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `zustand`, `zod`, `hono`, `@hono/node-server`, `@hono/zod-validator`, `react-markdown`. Dev: `vite`, `@vitejs/plugin-react`, `babel-plugin-react-compiler`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `tsx`, `concurrently`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `@types/react`, `@types/react-dom`, `@types/node`. Test: `@testing-library/react` + `jsdom` (two component tests: Review Focus 3, rollback), `@playwright/test` (Chromium only; Slice E). All approved with the plan on 2026-11-19. No headless UI library (owner, 2026-11-19): every primitive is native, the tooltip included.
- [ ] **Step 2: Install and write configs.** Scripts: `dev` (`concurrently` server + web), `dev:server` (`tsx watch server/src/index.ts`), `dev:web` (`vite`), `typecheck` (`tsc -b`), `lint` (`eslint . && node scripts/check-tokens.mjs`), `test` (`vitest run`), `test:e2e` (`playwright test`), `replay` (`node scripts/replay.mjs`: `fetch` POST `http://localhost:8787/api/replay/restart`, prints "Replay restarted"). `engines.node >= 22`. ESLint: `react-hooks` recommended (compiler rules on), `no-restricted-globals: parseFloat`, `no-restricted-syntax` for `JSXAttribute[name.name='dangerouslySetInnerHTML']` and `CallExpression[callee.name='Number']`, with one file override for `shared/domain/values.ts`, where `parseInput` turns a `number`-type input into a number (never money). `check-tokens.mjs` fails on `-\[`, `#[0-9a-fA-F]{3,8}\b` or `rgb\(` in `web/src/**/*.{ts,tsx}`.
- [ ] **Step 3: Write the failing contract test**

```ts
it("parses every event of every fixture run", () => {
  for (const file of fixtureRunFiles()) // fixtures/runs/*.jsonl + fixtures/extra/*.jsonl
    for (const line of nonEmptyLines(file)) expect(RunEvent.safeParse(JSON.parse(line)).success).toBe(true);
});
it("rejects an unknown event type", () => expect(RunEvent.safeParse({ seq: 1, at_ms: 0, claim_id: "x", type: "run_paused", payload: {} }).success).toBe(false));
it("keeps money amounts as strings", () => expect(Money.parse({ amount: "4415.30", currency: "EUR" }).amount).toBe("4415.30"));
it("rejects an unknown queue param", () => expect(QueueQuery.safeParse({ sort: "x" }).success).toBe(false));
it("requires a reason to override", () => expect(DecisionInput.safeParse({ action: "override", based_on: 1, value: "x", reason: "  " }).success).toBe(false));
```

- [ ] **Step 4: Run** `npm test -- shared/contract`. Expected: FAIL (modules missing). **Step 5:** write the schemas. **Step 6:** `npm test -- shared/contract` PASS; `npm run typecheck && npm run lint` clean; `npm run dev` shows a blank page on the `ground` colour and `curl localhost:5173/api/health` returns `{"ok":true}`.
- [ ] **Step 7:** slice-reviewer, owner review, commit when told: `chore: scaffold and shared contract`.

### Slice B: Domain

**Files:** Create `shared/domain/{run,values,citation,confidence,fieldView,status,format,index}.ts`. Test: one `*.test.ts` beside each.

**Interfaces:** Consumes the contract. Produces the signatures in "`shared/domain/` signatures" above. `applyEvent` keeps untouched `FieldState` objects and the `steps` array identical (`===`) so row selectors don't re-render.

Test helpers in `shared/domain/test-events.ts`: `extracted(seq, field_id, value, overrides?)`, `revised(seq, field_id, value, reason?)`, `confidence(seq, field_id, c)`, `stepStarted`, `stepFinished`, `delta`, `finished`, `failed` building valid `RunEvent`s.

- [ ] **Step 1: Write the failing reducer tests** (`run.test.ts`):
  - "applies the same seq once": `extracted(3)`, `revised(42, "total", m("4415.30"))` twice → `fields.total.history.length === 2`, `version === 2`, and the second apply returns the identical state object.
  - "keeps fields in arrival order": `field_order` equals extraction order after a revision.
  - "does not move the version on a same-value revision" and "does not move the version on a confidence change", while `current.confidence` updates and the reason is in `history`.
  - "records the running step on an extracted field" (`step_id`).
  - "ignores a revision for a field that was never extracted": state unchanged except `seen`.
  - "marks the failed step and keeps extracted fields": `failed(31, "lookup_policy", …)` → step state `failed`, `status === "failed"`, `error.retryable === true`, fields intact.
  - "appends summary deltas in seq order of arrival".
  - "keeps untouched fields as the same objects after an event".
  - "replays CLM-2026-004817 to 49 fields with two revisions" (reads the fixture file): `total_incl_vat.version === 2`, `liability_assessment.version === 2`, `overall_confidence === 0.61`, `estimated_payable.current.source === null`.
  - "a second run_started after a failure sets the run back to running and clears the error" (T8).
- [ ] **Step 2:** run, expect FAIL; implement `run.ts` + `values.ts`; run, PASS.
- [ ] **Step 3: Write the failing `fieldView` tests** (`fieldView.test.ts`), one rule each:
  - "is pending with the agent's value when there is no decision".
  - "keeps an accepted decision when the agent revises the value": accept `based_on: 1` on total 3605.80, then revision 4415.30 → `status === "revised_after_decision"`, `shown.value.amount === "3605.80"`, `shown.by === "agent"`, `agent.value.amount === "4415.30"`, `needsYou === true`.
  - "keeps a corrected value when the agent revises" → shown is the reviewer's, `by: "you"`.
  - "does not reopen a decision on a confidence-only change".
  - "shows the value before the last change and the agent's reason" (`previous`).
  - "lists no_source, empty_value, low_confidence, step_warning and not_in_citation" (one `it` each).
  - "a current decision clears needsYou but keeps the tags".
- [ ] **Step 4: Write the failing `citation`, `confidence`, `status`, `format` tests** with fixture values:
  - citation found: time "23:40" in "23:40"; date "2026-09-13" in "13 September 2026"; money "3605.80" in "Estimated total incl. VAT: € 3,605.80"; number 48213 in "Mileage on arrival: 48,213 km"; number 4 in "Courtesy car 4 days".
  - citation not_found: time "22:40" in "23:40"; money "1252.00" in the three parts lines; number 4 in "14.5 h"; date "2026-09-20" in "On Sunday 20 September at about 22:30".
  - citation not_checked: text values, null values, null cited.
  - "citedText returns null when the offsets fall outside the document" and "for an unknown document".
  - confidenceLevel: 0.59 → low, 0.60 → medium, 0.849 → medium, 0.85 → high.
  - claimStatus: not_started → queued, running → running, finished → needs_review, failed → failed, any + completedAt → reviewed.
  - canComplete: running → `agent_working`; finished with 2 pending → `fields_left, left: 2`; one `revised_after_decision` counts as left; failed with all decided → ok; completed → not ok.
  - queueCounts: counts every status over the whole queue, zeros included (P1 cut, 19 Nov).
  - formatMoney `{"4415.30","EUR"}` → "€4,415.30"; `{"-12.50","EUR"}` → "-€12.50"; `{"1000000.00","GBP"}` → "£1,000,000.00"; formatDate "2026-09-13" → "13 Sep 2026" in any `TZ`; formatValue boolean true → "Yes"; null → null.
- [ ] **Step 5:** run FAIL → implement → `npm test -- shared/domain` PASS, typecheck, lint.
- [ ] **Step 6:** slice-reviewer, owner review, commit when told: `feat(domain): run reducer, fieldView and status`.

### Slice A: Backend

**Files:**
- Create: `server/src/catalog.ts` (`loadCatalog(root: string): Catalog`: claims, documents with text, runs parsed with `RunEvent`, extra runs; throws on a bad fixture line with file and line number)
- Create: `server/src/claimConfig.ts` (field groups, `not_checked: { "CLM-2026-004822": { lookup_policy: "policy cover and excess" } }`)
- Create: `server/src/replay.ts`, `server/src/decisions.ts`, `server/src/claims.ts` (service), `server/src/app.ts`, `server/src/routes/{queue,claims,events,decisions,replay}.ts`, `server/src/errors.ts`
- Modify: `server/src/index.ts` (real clock, `createApp`)
- Test: `server/test/{queue,claims,events,decisions,replay}.test.ts`

**Interfaces:**
- `createReplay(catalog, now: () => number): Replay` with `due(claimId): RunEvent[]`, `run(claimId): RunState` (folded with `applyEvents`), `lastDeliveredAt(claimId): number | null`, `replayId(): string`, `restart(): void`.
- `interface DecisionStore { list(claimId); get(claimId, fieldId); save(d: Decision); remove(claimId, fieldId); complete(claimId, at); completedAt(claimId); clear() }` + `createMemoryDecisionStore()`. `save` replaces the field's decision; old decisions are not kept.
- `createApp({ catalog, replay, store, now }): Hono`. Test helper `makeApp(t0 = 0)` returns `{ app, tick(ms) }` with a fake clock.
- Service returns `Result<T> = { ok: true; value: T } | { ok: false; status: 400 | 404 | 409; code: string; message: string }`; routes only translate it.

- [ ] **Step 1: Write the failing tests:**
  - queue: "returns all four claims sorted by priority then received"; "filters by status"; "400 with a readable message for status=done"; "400 for an unknown param"; "4817 is queued at 0 ms before its first event and running after tick(100)"; "4809 is needs_review with confidence 0.95 at once"; "4822 is failed with run_failed and confidence null after tick(4000 + 31750)"; "counts every status, zeros included".
  - claims: "404 claim_not_found for CLM-2026-999999"; "400 for a malformed id"; "detail includes documents with text, groups and not_checked".
  - decisions: "saves an accept against the current version"; "409 agent_revised when based_on is outdated" (accept total_incl_vat `based_on: 1` after tick past 53.8 s); "404 field_not_found for a field not yet emitted"; "400 when an override has no reason"; "400 invalid_value for a string on a money field"; "undo returns 204 and the field has no decision"; "409 claim_completed after completion, for save and undo"; "complete is 409 not_ready while running and with pending fields"; "complete moves the queue item to reviewed and keeps run_failed".
  - events: "sends every due event with its seq as id"; "resumes after Last-Event-ID"; "sends the duplicate seq 42 as the fixture has it"; "returns 404 JSON for an unknown claim"; "sends a reset event and closes the stream when the replay restarts". Read the SSE body with a reader until the expected count, then `cancel()`; use `vi.useFakeTimers()` for the 200 ms loop.
  - replay: "restart clears decisions and completion and starts runs at 0, 4 and 20 s".
- [ ] **Step 2:** run, expect FAIL. **Step 3:** implement catalog → replay → store → service → routes. **Step 4:** `npm test -- server` PASS; `npm run dev:server`, then `curl -i 'localhost:8787/api/queue?status=done'` → 400 with the message; `curl -N localhost:8787/api/claims/CLM-2026-004817/events` streams; `npm run replay` prints "Replay restarted".
- [ ] **Step 5:** slice-reviewer, owner review, commit when told: `feat(server): replay, queue, events and decisions API`.

### Slice C: UI primitives

**Files:** Create `web/src/ui/{Button,IconButton,Badge,StatusGlyph,SegmentedControl,Select,ProgressBar,ListRow,Disclosure,ValueBox,TextInput,Alert,Message,Skeleton,Tooltip,Highlight,Busy,Table}.tsx`, `web/src/ui/icons.tsx` (inline SVG: check, bang, triangle, chevron, pencil, swap, undo, back, arrow), `web/src/ui/index.ts`. No `/dev/ui` showcase page (cut 19 Nov): primitives are checked on the screens that use them.

**Interfaces:** Exactly the 18 primitives (19 minus `CollapsibleHeader`, cut 19 Nov), variants and access rules in DESIGN.md "`web/src/ui/`: primitives". Variant props are string unions named for looks (`tone`, `variant`, `size`, `layout`). Key signatures later slices rely on:
- `Button({ variant: "primary" | "secondary", icon?, children, ...button })`: a plain button, no Tooltip (owner, 20 Nov). A blocked action passes `aria-disabled="true"`: the button stays focusable and ignores clicks and form submits. The reason is shown by the caller (CompleteReview: visible text beside the button), never `disabled`.
- `Badge({ shape: "tag" | "pill", tone: "attn" | "you" | "plain" | "outline" | "label", icon?, children })`
- `StatusGlyph({ kind: "ring" | "done" | "attn" | "error", size?: 12 | 14 })`
- `ListRow({ glyph, label, value, empty?: boolean, tone?: "you", trailing?, selected?: boolean, arrive?: boolean, onSelect, "aria-label" })`
- `ValueBox({ tone: "default" | "tint" | "muted", size: "num" | "text" | "long", children })`; `TextInput` takes the same `size`.
- `SegmentedControl({ label, items: { id, label, count?, glyph? }[], value, onChange })`: a labelled group of `button`s with `aria-pressed`, as DESIGN.md says; Tab moves between them, no arrow-key handling.
- `Tooltip({ content, align?: "start" | "end", children })`: used by `IconButton` only (owner, 20 Nov). Shows on hover and focus, hides on Escape (anywhere), blur and mouseleave; placed under the trigger with no gap (so the pointer can move onto it); `align` set by the caller ("end" for header buttons on the right). The bubble is `role="tooltip"` and `aria-hidden`, because the IconButton's `aria-label` already says the same text. No collision logic, no library.
- `Alert({ layout: "box" | "band", icon?, action?: ReactNode, children })`; `Message({ headline, body, action?: ReactNode, error?: boolean })`. `action` is a slot: the caller passes the `Button` (and `autoFocus` on it for a page-level message; never for an inline empty state). Owner, 20 Nov.

Everything is native, no headless library: `Select` is `<select>` (the phone's own picker), `Disclosure` is `<details>`, `ProgressBar` is a `div` with `role="progressbar"`, `Table` is `table`, and the hidden "Loading…" text uses `sr-only`.

Not built (DESIGN cut list): keyboard shortcuts and kbd hints, the phone bottom sheet, a custom select, sortable table headers, Skip, History. Cut 19 Nov: `CollapsibleHeader`, collapsible field groups and their per-group counts, the `/dev/ui` page.

- [ ] **Step 1:** build each primitive with every variant and state in the DESIGN table.
- [ ] **Step 2: Check:** `npm run lint` (token check) clean, typecheck clean. Visual and keyboard checks (2 px focus ring, reduced motion stops `Busy` and `Skeleton`, compare with `plans/design/export/` G-blocks) happen in D1–G where each primitive is used.
- [ ] **Step 3:** slice-reviewer, owner review, commit when told: `feat(ui): primitives from DESIGN.md`.

No unit tests here: the testing rules exclude styling and markup.

### Slice D1: Review screen, live read

**Files:**
- Create: `web/src/api/{http,events,runStore,queries,subscribe}.ts`
- Create: `web/src/features/review/{ReviewPage,ReviewLayout,ClaimHeader,RunStatusChip,AgentStepLine,AgentSteps,FieldFilter,FieldSection,FieldRow,FieldCard,AgentLine,DocumentPanel,EvidenceNote,SummaryView}.tsx`, `web/src/features/review/useFieldViews.ts`
- Modify: `web/src/main.tsx` (QueryClient, router: `/`, `/claims/:claimId`; one error boundary per route)
- Test: `web/src/api/events.test.ts`, `web/src/api/runStore.test.ts`

**Interfaces:**
- `http.ts`: `getJson<T>(path, schema): Promise<T>` and `sendJson`; non-2xx → throws `ApiFailure { status, code, message }` (parsed with `ApiError`), network → `ApiFailure { status: 0, code: "unreachable" }`.
- `events.ts`: `parseRunEvent(data: string): RunEvent | null` (bad JSON or schema → `null` + `console.warn`).
- `runStore.ts`: `useRunStore` with `runs: Record<string, RunState>`, `connection: Record<string, "connecting" | "live" | "reconnecting" | "closed">`, actions `apply(claimId, event)`, `reset(claimId)`, `setConnection`. Selectors: `useRunField(claimId, fieldId)`, `useRunMeta(claimId)` (status, steps, error, overall_confidence), `useFieldOrder(claimId)`, `useSummary(claimId)`.
- `subscribe.ts`: `useRunSubscription(claimId)`: the one effect; opens `EventSource('/api/claims/:id/events')`, `run` → `apply`, `reset` → `reset(claimId)` + invalidate the claim's queries + `close()` the old EventSource and open a new one (a new EventSource sends no `Last-Event-ID`; the old one would reconnect with the stale id and be reset again, every 2 s); `onerror` → `reconnecting`; cleanup closes.
- `queries.ts`: `useClaim(claimId)`, `useDecisions(claimId)`, `useDocuments(claimId)` (a `select` on the claim query → `Record<document_id, text>`).
- `useFieldViews(claimId)`: `FieldView` per field from run store + decisions + documents.
- Header status: `claimStatus(useRunMeta(claimId).status, claim.completed_at)`, the same function the server uses for the queue.

- [ ] **Step 1: Write the failing tests:** "parseRunEvent returns null for an unknown event type"; "parseRunEvent returns null for bad JSON"; "apply drops a duplicate seq and returns the same claim state"; "reset clears the claim's run state"; "a summary delta does not change the fields object" (`===`).
- [ ] **Step 2:** run FAIL → implement `api/` → PASS.
- [ ] **Step 3: Build the screen** to DESIGN.md `review/` rows: three panes at `lg`; `FieldSection`s from `field_groups` in config order, rows in group order, a row appears in its slot when its field arrives (`arrive`), never re-sorted; `FieldFilter` filters only; the open field comes from `?field=` (first field needing you by default, set with `replace`); `FieldCard` read-only parts (name, tags, value via `formatValue` or "Not found", `AgentLine`, before → after when `previous`); `DocumentPanel` slices `text` with the source, one `Highlight`, scrolls it into view when the open field changes, `EvidenceNote` for `not_found` and no source; `SummaryView` below the fields with react-markdown (`skipHtml`, `allowedElements: ["p","strong","em","ul","ol","li","br","code"]`, `unwrapDisallowed`), tag "AI draft · not verified"; `ClaimHeader` shows the latest step note in `AgentStepLine` as soon as it arrives (T1).
- [ ] **Step 4: Check by hand** at 1280 px after `npm run replay`: 4817 rows arrive in place; `incident_time` shows 22:40 with "23:40" highlighted and the evidence note; `total_incl_vat` shows the before → after at 53.8 s with one history entry; the "Pre-approved" text renders inside the summary as plain text; reload at about 60 s resumes without duplicates; 4809 opens complete at once. typecheck, lint, test green.
- [ ] **Step 5:** slice-reviewer, owner review, commit when told: `feat(review): live review screen`.

### Slice D2: Review screen, decisions

**Files:**
- Create: `web/src/api/decisions.ts` (mutations + pure helpers), `web/src/features/review/{DecisionPill,DecisionButtons,DecisionForm,FieldDetails,SaveFailed,ReadOnlyNote,CompleteReview}.tsx`
- Modify: `FieldCard.tsx`, `ClaimHeader.tsx`
- Test: `web/src/api/decisions.test.ts`; if Testing Library was approved, `web/src/features/review/FieldCard.test.tsx`

**Interfaces:**
- Pure: `withDecision(list: Decision[], d: Decision): Decision[]`, `withoutDecision(list, fieldId): Decision[]`.
- `useDecide(claimId, fieldId)` and `useUndo(claimId, fieldId)`: TanStack mutations, `scope: { id: \`decision:${claimId}:${fieldId}\` }` (serial per field), `onMutate` snapshot + optimistic write with `at: new Date().toISOString()`, `onError` restore, `onSettled` invalidate decisions and queue. `useComplete(claimId)`.
- `FieldCard` owns `draft: { mode: "correct" | "override"; value: string; reason: string } | null` in `useState`; cleared only on success, so a 409 or failed save leaves the text in place. Correct opens with the agent's value formatted for input (money: the amount string), override opens empty. Input parsing back to `FieldValue` by `value_type` is `parseInput(t, raw)` in `shared/domain/values.ts` (money keeps the typed string after validating `^\d+(\.\d{1,2})?$`; add its tests to `values.test.ts`).

- [ ] **Step 1: Write the failing tests:** "applies optimistic decisions in call order" (accept then undo → no decision); "withDecision replaces the field's previous decision"; `parseInput`: money "4415.3" → `{ amount: "4415.3", currency }` unchanged string, "4,415.30" rejected, boolean "yes"/"no", number "14.5". With Testing Library: "rolls back and says Couldn't save when the save fails"; "keeps the typed value when the save is refused with 409".
- [ ] **Step 2:** run FAIL → implement → PASS.
- [ ] **Step 3: Build** `DecisionButtons` per state (pending: Accept primary · Correct · Reject; decided: Correct · Reject + Undo; revised after you: Use new (primary, accepts the new version) · Keep mine (saves the shown value against the new `based_on`: a kept accept becomes `correct` with the previously accepted value (a stored accept has no value: use `view.decidedOn.value` from `fieldView()`, never a lookup in the UI), a correct or override is re-sent unchanged; re-sending an accept would accept the agent's new value) · Correct · Reject), `DecisionPill`, "Blocks sign-off" and "Changed after you" tags, `SaveFailed` with the two messages from DESIGN.md, `CompleteReview` with the `canComplete` reason ("· agent working", "· not started", "· 36 left" + tooltip), `ReadOnlyNote` after completion. No decision buttons on rows; no accept-all.
- [ ] **Step 4: Check by hand** (BRIEFING checklist): accept `total_incl_vat` before 53.8 s → after the revision the decision stays, the field reads "Agent revised this after you accepted: €3,605.80 → €4,415.30" and Complete is blocked; a confidence change doesn't reopen; stop the server and accept → rollback with "Couldn't save"; undo returns to Not decided; complete 4809 → read-only, queue shows reviewed.
- [ ] **Step 5:** slice-reviewer, owner review, commit when told: `feat(review): decisions, undo and complete`.

### Slice E: Queue

**Files:** Create `web/src/features/queue/{QueuePage,QueueHeader,QueueFilters,PriorityMark,NeedsYouCount,QueueTable,QueueRow,ReplayControl}.tsx`, `web/src/features/queue/search.ts`. Modify `web/src/api/queries.ts` (`useQueue(q: QueueQuery)`, `placeholderData: keepPreviousData`, `refetchInterval: 2000`; no queue stream, see "Why the queue polls"). Test: `web/src/features/queue/search.test.ts`.

**Interfaces:** `parseQueueSearch(params: URLSearchParams): { ok: true; query: QueueQuery } | { ok: false }` using `QueueQuery`; `toQueueSearch(q): URLSearchParams` drops empty values. `useRestartReplay()` mutation → POST restart, then `queryClient.resetQueries()`.

- [ ] **Step 1: Failing tests:** "parses status"; "returns not ok for status=done"; "drops empty filters when writing the URL".
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3: Build** to DESIGN.md `queue/`: table at `lg`, the same row as a card below; the reference is the one link (to `/claims/:id`, back returns to the filtered queue); confidence "—", "— run failed", "High 95%"; "Sorted by priority, then oldest received."; `SegmentedControl` filters at `lg`, native `Select` below; `ReplayControl` (a secondary `Button` "Restart replay") in the header when `import.meta.env.DEV`.
- [ ] **Step 4: Playwright smoke tests.** Create `playwright.config.ts` (Chromium; `webServer: npm run dev`, `reuseExistingServer: false`; `workers: 1`, tests share one server) and `e2e/smoke.spec.ts`; `beforeEach` POSTs `/api/replay/restart`. No short run file: the tests use 4809 (complete at once) and the first seconds of 4817, so each run stays under about 15 s (this replaces testing.md's "short run from `fixtures/extra/`"; propose that rule-file edit with the slice). Tests, queried by role and label:
  - "queue lists four claims and 4809 needs review"
  - "an invalid status filter shows the message and a way back" (`/?status=done` → "That filter doesn't exist", "Show all claims")
  - "accepting a field on 4809 survives a reload" (open 4809, accept `repair_cost`, reload, pill reads "You · accepted")
  - "fields of 4817 arrive while the run is live" (open 4817, first row visible within 5 s)
  - "unknown claim shows Claim not found"
  - `e2e/screenshots.spec.ts`: queue, 4809 review and 4817 review at 375 × 812 and 1280 × 800, saved to `e2e/screenshots/` (gitignored) for review in Slice G. Not compared to baselines: live data makes pixel diffs flaky.

  Run: `npx playwright install chromium` once, then `npm run test:e2e`. Expected: all pass.
- [ ] **Step 5: Check by hand:** rows go queued → running → needs review / failed without reload; `?status=done` shows "That filter doesn't exist" + "Show all claims"; filters survive reload; restart from the button and from `npm run replay` both reset the queue.
- [ ] **Step 6:** slice-reviewer, owner review, commit when told: `feat(queue): live queue with filters and e2e smoke tests`.

### Slice F: States

**Files:** Create `web/src/features/review/{ReviewStates,RunFailedLine,Reconnecting}.tsx`, `web/src/features/queue/QueueStates.tsx`. Modify `ReviewPage`, `QueuePage`, `SummaryView` ("AI draft · incomplete" on a failed run), `FieldSection` (a "Not checked" section from `not_checked` on a failed run).

- [ ] **Step 1: Build** every state in DESIGN.md `ReviewStates` and `QueueStates` with its exact wording; skeletons shaped like the rows; "Waiting for the agent to start" for a queued run; `Reconnecting` from `connection === "reconnecting"` in a polite live region, last state kept; claim 404 → "Claim not found" + "Back to queue"; `ApiFailure.status === 0` → "Can't reach the server" + "Try again" (`refetch`). `RunFailedLine` per DESIGN, with no retry button (T8 cut; README says so).
- [ ] **Step 2: Check by hand:** 4822 fails at about 35.75 s: failed step marked, 9 fields reviewable, summary marked incomplete, "Not checked: policy cover and excess", queue `failed`; stop the server mid-run → "Reconnecting…", restart it → catches up without duplicates; `/claims/CLM-2026-999999` → not found; empty filter result → "No claims match" + "Clear filter".
- [ ] **Step 3:** typecheck, lint, test green; slice-reviewer, owner review, commit when told: `feat: loading, error and failure states`.

### Slice G: Phone and accessibility

**Files:** Create `web/src/features/review/{PhoneActionBar,CitedText}.tsx`. Modify `ReviewLayout` (below `lg`: the list is the screen; `?field=` opens the field full screen with back, previous / next), `FieldCard`, `ClaimHeader` (two lines, progress and Complete in the footer), any component that fails the checks below.

- [ ] **Step 1: Build** the phone layout from DESIGN.md: push navigation driven by `?field=` (back = history back), `PhoneActionBar` sticky 48 px with the same buttons, `CitedText` inline under the value with the document title and "Show all". No document sheet (cut; README says so).
- [ ] **Step 2: Check** (run `npm run test:e2e`, then read `e2e/screenshots/`; add a 4822-failed screenshot) at 375 and 1280 px on queue, 4817 at about 70 s, 4822 failed, 4809 completed: no sideways scroll, no overlap, controls ≥ 44 px on phone; first thing on a claim is status and what needs you; full keyboard pass (Tab, Enter, Escape closes the form) with a visible ring; nothing by colour alone; live updates don't move focus or reset an open form; landmarks per `ReviewLayout`; screen reader hears status changes politely.
- [ ] **Step 3:** typecheck, lint, test green; slice-reviewer, owner review, commit when told: `feat: phone layout and accessibility pass`.

### Finish (Part D, never cut)

- [ ] `final-reviewer` agent at feature freeze; fix or consciously skip its findings.
- [ ] Clean clone: `npm install && npm run dev`, `npm run replay`, `npm test`, all from the README only.
- [ ] README (D1): setup, run, test and replay commands, time spent, what was cut (DESIGN cut list, phone document sheet, anything cut from T-rows), the confidence thresholds, the T2 matching rule, replay restarts the whole replay at normal speed (no speed or per-claim control), `npm run test:e2e`, the 7 sections. D3: global CLAUDE.md turned off, Superpowers skills used.
- [ ] Record the video (D2) and link it at the top of the README.

Already cut (owner, 19 Nov): T8 retry, P1 priority filter, the `/dev/ui` page, collapsible field groups with per-group counts, keeping past decisions. The README lists them. If time runs short, cut next: motion polish. Never cut the merge rule, inline citations, the failure state or the phone layout.
