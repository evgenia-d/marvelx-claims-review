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
- Component tests only for risky UI logic (e.g. rollback after a failed save). Query by role and label; `data-testid` only when nothing accessible fits.
- End-to-end, if we add it: a few critical paths plus 375 and 1280 px screenshots. Each run stays fast: use a short run from `fixtures/extra/`, not the 103 s fixture run.
- Ask before adding a test dependency (Testing Library, Playwright).
