---
paths:
  - "server/**"
  - "shared/**"
---

# Backend and shared rules

## Shared

- `shared/contract/` holds the Zod schemas for every request, response and event. Types are `z.infer`'d from them; nothing is declared twice.
- `shared/domain/` is pure TypeScript: no React, no Hono, no I/O, no `Date.now()` inside logic (time is passed in). Both server and web use it.

## Routes

- Routes are thin: validate, call a module, shape the response. No business logic in a handler.
- Validate every input (query, params, body) with `@hono/zod-validator` and the schemas from `shared/contract/`.
- One error shape everywhere: `{ error: { code, message } }`, with a message a person can read.
- Status codes: 400 invalid input, 404 unknown claim, 409 decision based on an outdated agent version, 500 only for real bugs.

## Replay and events

- The replay clock is its own module and takes the current time as an input, so tests use a fake clock and never wait.
- The clock starts when the server starts; `npm run replay` (POST /api/replay/restart, always on: evaluators use it) resets runs and decisions.
- SSE via Hono `streamSSE`: every event carries `id: <replayId>.<seq>`; on reconnect, resume after `Last-Event-ID` only if it is from the current replay, else send `reset` and close. Send a heartbeat comment, and stop writing when the client disconnects.
- Backend tests build the app with `makeApp(t0)` from `server/test/helpers.ts` → `{ app, tick(ms) }`; SSE tests read the body with `vi.useFakeTimers()` and `cancel()` when done.
- Fixture files are read, never written. Our own runs live in `fixtures/extra/` in the same format.

## Storage

- Decisions sit behind a small store interface (get, list by claim, save, undo). In memory now; swapping in a database must not change the routes.
- The server checks a decision's `based_on` agent version against the current one using `shared/domain/`, and refuses with 409 if it's outdated.

## Dev setup

- Vite proxies `/api` to the server; no CORS configuration.
