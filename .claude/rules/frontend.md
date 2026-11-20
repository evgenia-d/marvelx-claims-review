---
paths:
  - "web/**"
---

# Frontend rules

## State: one owner per piece

- **Server data** (queue, documents, decisions): TanStack Query only.
- **URL** (queue filters, open claim, open citation): React Router search params, parsed with the Zod schema from `shared/contract/`. An invalid param shows a message, never a crash.
- **Run state** (steps, summary, field history): a Zustand store in `web/src/api/`, fed by SSE, built by the reducer in `shared/domain/`. The UI never edits it. The reducer keeps unchanged fields as the same objects, so selectors don't re-render untouched rows.
- **Local** (`useState`): only inputs being edited and open/closed UI.
- Never copy one owner's data into another (no `useState` seeded from a query, no URL mirrored in state).

## Derive, don't store

- Field status, attention reasons, counts and claim status are computed with `shared/domain/` functions at render time. Never stored, never synced.
- No `useEffect` to compute or sync data. Effects are only for external systems (the SSE subscription), and always clean up.

## Layers

- `features/` imports from `api/`, `ui/` and `shared/`. It never calls `fetch` or `EventSource` directly.
- `ui/` has no claim, field or decision concepts. Props in, markup out.
- Types come from `shared/contract/` (`z.infer`). Never redeclare an API type by hand.

## TypeScript

- No `any`, no non-null `!` on data from the network.
- Events and statuses are discriminated unions; `switch` statements end with an exhaustive `never` check.

## React and performance

- Follow the Rules of React (pure render, no mutation); the React Compiler depends on it and the hooks lint rules enforce it.
- No hand-written `memo`, `useMemo` or `useCallback` unless a measurement shows the compiler isn't enough.
- Each field row subscribes to its own field only (selector on the run store). A summary chunk must not re-render the field list.
- Keys are stable ids (`field_id`, step id), never array indexes.
- New fields never reorder or shift fields already on screen while a run is live.
- Decisions wait for the server: while a save is in flight the field's decision buttons are blocked (`aria-disabled`) and the tapped one shows `Busy`; on success the server's decision is written into the cache. A failed save changes nothing on screen. A 409 shows "The agent changed this while you were deciding" and keeps what the reviewer typed.

## Untrusted text

- Model and document text renders as React text nodes.
- Summary markdown goes through `react-markdown` with raw HTML off and links rendered as plain text.

## Platform first

- Money: `Intl.NumberFormat` on the decimal string. Dates and times: `Intl.DateTimeFormat`; relative times: `Intl.RelativeTimeFormat`.
- Live connection: native `EventSource` (it reconnects and sends `Last-Event-ID` on its own).

## UI and accessibility basics

- Read `DESIGN.md` first. Tokens only, no raw hex, no arbitrary values.
- Phone vs laptop: behaviour (push vs replace, which screen, where buttons go) reads `useIsLaptop()` from `ui/`; purely visual differences stay `lg:` classes.
- Semantic elements, labelled inputs, visible focus ring, nothing that relies on colour alone.
- Status changes go to a polite live region; live updates never steal focus or reset a field being edited.
- One error boundary per route, so a crash doesn't blank the whole screen.
