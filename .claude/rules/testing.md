# Testing rules

## What to test

- Test what hurts if wrong:
  - the event reducer: dedup by `seq`, revisions, failure part-way
  - `fieldView`: the merge rule, field statuses, attention reasons
  - status derivation
  - money and date formatting
  - the backend's validation, 400, 404 and 409 paths
- Use the fixture edge cases in `plans/SPEC.md` as test cases (e.g. CLM-2026-004817 seq 42 delivered twice).
- Don't test styling, markup structure, library behaviour, or what TypeScript already guarantees.

## How to write them

- Domain tests: plain Vitest, no React, small hand-built event lists. One behaviour per `it`, named as the rule ("keeps an accepted decision when the agent revises the value").
- Backend tests: Hono `app.request()` with a fake clock. No running server, no real waiting.
- Component tests only for risky UI logic (e.g. buttons blocked while a save is in flight). Query by role and label; `data-testid` only when nothing accessible fits.
- Component test files start with `// @vitest-environment jsdom` (the default is node). Use `fireEvent` and plain `expect`: user-event and jest-dom aren't installed.
- End-to-end (`e2e/`, system Chrome via `channel: "chrome"`, no `playwright install`): a few critical paths plus 375 and 1280 px screenshots. Every test restarts the replay first and stays under about 15 s: never wait for a run to finish; use a claim complete at start (4809) or assert on the first seconds of a live one (4817).
- Playwright and Testing Library are installed; user-event and jest-dom are not. Ask before adding any other test dependency.
