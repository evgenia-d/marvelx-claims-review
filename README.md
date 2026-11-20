# MarvelX claims review

**Video (3–5 min):** [demo.mp4](demo.mp4), one run played through as a reviewer, on a laptop-sized and a phone-sized window.

A claims reviewer watches an AI agent work through a claim live, checks each extracted field against the highlighted source, and accepts, corrects or rejects it, even while the run is still going. A small Hono backend replays the fixture runs over SSE and stores the decisions.

## Setup, run, test

Needs Node 22 or later. `npm run test:e2e` also needs Google Chrome installed (Playwright drives the system Chrome; no browser download).

```sh
npm install
npm run dev          # API on http://localhost:8787, web app on http://localhost:5173 (open this one)
```

| Command | What it does |
|---|---|
| `npm run replay` | Restarts the whole replay: every run starts again at its scheduled offset and all decisions are cleared. Needs `npm run dev` running. The queue screen has the same thing as a "Restart replay" button (dev only). |
| `npm test` | Vitest: domain, contract, backend (fake clock, no server) and a few component tests |
| `npm run test:e2e` | Playwright smoke tests and 375 / 1280 px screenshots in `e2e/screenshots/`. Starts its own dev servers, so ports 8787 and 5173 must be free. |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint plus `scripts/check-tokens.mjs` (no raw colours or Tailwind arbitrary values in `web/src`) |

**Replay.** The clock starts when the server starts. 4817 starts at 0 s (about 103 s long), 4822 at 4 s (fails at "Look up policy" about 32 s in), 4830 at 20 s; 4809 is already finished. `npm run replay` always restarts the whole replay, at normal speed: there is no speed control and no per-claim restart. Every tab sees the same clock; reloading mid-run continues where the run is.

**API** (all under `/api`; one error shape, `{ "error": { "code", "message" } }`):

- `GET /queue?status=` returns the queue. An unknown status or any other parameter gives a 400.
- `GET /claims/:claimId` returns the claim detail and documents. A malformed id gives a 400, an unknown one a 404.
- `GET /claims/:claimId/events` is the run as SSE (resumes from `Last-Event-ID`).
- `GET /claims/:claimId/decisions`, `PUT` / `DELETE /claims/:claimId/fields/:fieldId/decision` read, save and undo decisions. A 409 means the agent changed the field since you saw it.
- `POST /claims/:claimId/complete` completes the review. `POST /replay/restart` restarts the replay.

**Time spent:** about 7 h. Roughly 2.5 h on the spec and design, 3 h on the build, and 1.5 h on the final review, fixes, this README and the video.

## What I cut

- **Retry a failed run (T8).** 4822 shows the failure and what wasn't checked. There is no Retry button, rather than one that fails again.
- **Priority filter (P1).** The brief asks for one filter; status is it. Priority still shows on every row and sets the sort order.
- **Phone document sheet (T6 on phone).** On a phone the cited text shows inline under the value. The whole document with the highlight is laptop only.
- **Collapsible field groups with per-group counts.** Groups are plain headings in a fixed order.
- **Keeping past decisions.** A new decision replaces the last one, and undo removes it. There is no decision history and no "History" view.
- **From the design** (`DESIGN.md`, "Cut for time"): keyboard shortcuts, a custom phone filter menu (it is a native `<select>`), queue column sorting, a Skip button, and the `/dev/ui` showcase page.
- Out of scope: dark mode, sign-in, translations, bulk accept.

**Known limitations**

- **Dates cited without a year.** On 4822, "Discovered 20 Sep 2026" shows "not found in the cited text" against "On Sunday 20 September". The cited text has no year, so it can't confirm the year (`shared/domain/citation.ts`). I left that as the cautious answer; the cited text is right there to judge.
- **"Step warning" reason.** It is tied to the step that extracted the field. In the fixtures, the only warning step (4817 "Assess liability") extracts no field, so the warning shows in the claim header and the step line but flags no field.
- **One frame after a decision.** When a save succeeds and the screen moves to the next field, the old field can paint as decided for one frame (about 8 ms) first. The decision (TanStack Query cache) and the open field (the URL, React Router) are two owners, and the cache update reaches React a few ms before the router's. I measured it and left it. Removing it means writing the cache only after the router has committed the new field. That most likely needs `RouterProvider` from `react-router/dom`, so that `flushSync` works.
- **One reviewer per claim.** Decisions and completion aren't pushed to other tabs. A tab that missed a completion gets the server's "already complete" message when it tries to save, and then turns read-only.

**Assumptions**

- **Confidence bands:** Low under 0.60, Medium 0.60 to under 0.85, High 0.85 and above. Shown in words and colour ("Low · 41%"). They are defined once, in `shared/domain/confidence.ts`.
- **"Not found in the cited text" (T2):**
  - It checks time, date, money and number fields only. Text and yes/no have no single right way to be written.
  - It reads the numbers and dates out of the cited span and compares them with the agent's value as stored:
    - money and numbers with thousands commas removed (`€ 3,605.80` matches `3605.80`);
    - times and ISO dates as written;
    - dates also in the form "1 March 2026".
  - It never builds a regex from agent text. A miss says "not found in the cited text", never "wrong".
- **Accept after a decision.** Accept is blocked after any decision. To go back to the agent's value: Undo, then Accept.
- **Complete review** needs the run to have ended (finished or failed) and every field it emitted to be decided. A failed run can be completed; the queue keeps a "run failed" marker.

## 1. State and data contract

The run, the decisions and the queue have different owners, and nothing is copied from one to another.

- **The run** is the fixture event stream. The server replays it on a clock (`server/src/replay.ts`) and streams it per claim over SSE (`server/src/routes/events.ts`). In the browser, a Zustand store (`web/src/api/runStore.ts`) folds the events with the reducer in `shared/domain/run.ts`. The same reducer runs on the server. It ignores a `seq` it has seen, so 4817's seq 42 arriving twice changes nothing. Event ids are `<replayId>.<seq>`: a reconnect resumes after the last one, and a reconnect from an old replay gets `reset`.
- **Decisions** live on the server (`server/src/decisions.ts`, in memory behind a small store interface) and in the TanStack Query cache in the browser (`web/src/api/decisions.ts`). A decision waits for the server: while it saves, that field's buttons are blocked; on success the server's decision goes into the cache and the screen moves to the next field in one render. I started optimistic and changed it at the end: the optimistic write painted the old field as decided just before the next field opened, so the phone screen jumped twice per decision. A failed save now leaves the field exactly as it was.
- **The merge** happens in one function, `fieldView()` (`shared/domain/fieldView.ts`): agent history plus decision gives the shown value, the field status, who set it, and the reasons it needs you. A human decision is never overwritten. If the agent changes the value after you decided, the field becomes "revised after your decision": your value stays, and the field must be decided again before you can complete the review.
- **The queue** (`GET /api/queue`, polled every 2 s) is built on the server from the same `claimViews()`. So "N need you" in the queue and on the claim screen can't disagree.
- **The URL** owns the status filter (`?status=`) and the open field (`?field=`). Status, counts and attention are derived at render, never stored.

The contract is Zod schemas in `shared/contract/`, imported by both server and web. The fixture events are parsed with them at server start. A decision carries `based_on`: the field's agent version you saw. The version moves only when the agent's value changes, so a confidence-only change doesn't reopen your decision. The server refuses a decision whose `based_on` is out of date with a 409, which is how "the agent changed this while you were deciding" is caught. Decisions are a discriminated union, so an override always has a reason and an accept never carries a value. Money is `{ amount: string, currency }` end to end and is only ever formatted, never parsed.

## 2. Design decisions

1. **Status and "what needs you" first, the summary last.** The claim header gives the run's status and "N need your attention". The field list puts orange tags where a field needs you: low confidence, no source, not found in the cited text, empty, revised after your decision. The agent's summary sits below, labelled "AI draft · not verified". 4817's statement carries a "pre-approved by the insurer" line, and the summary repeats it. It must never read as a system message.
2. **Yours vs the agent's at a glance.** A blue tint and a pill ("You · corrected") mark a value you set. The agent's value stays visible next to it, and the agent's own changes read "Agent changed it: X → Y" with its reason. A solid blue fill means a button, a tint means your decision. The design rounds kept those two looks apart on purpose (`AI-LOG.md`).
3. **Confidence in words, evidence next to the value.** "Low · 41%" in words and colour, never a bare 0.41. On a laptop the source document sits beside the field with the cited span highlighted (`DocumentPanel.tsx`). On a phone the cited text sits under the value (`CitedText.tsx`). Values are sized by type, not length, so a revision never moves the layout.

**What I'd watch a real reviewer do first:** work through a live claim like 4817 at their own pace. I'd look for two things: whether they get through it efficiently, and where they hesitate or misread the screen. For example, do they understand "Agent revised this after you accepted" and why sign-off is blocked? Do the orange tags make them check the source, or do they learn to skip them? Those moments are where the interface needs to become more intuitive. I'd want to see them before trusting the screen.

## 3. What the agent did and what I did

I used Claude Code throughout. Every rework is in `AI-LOG.md`. Two examples:

- **Accept after a correction** (20 Nov). Following `DESIGN.md`, the agent kept "Accept" live after a correction. Clicking it replaced my corrected value with the agent's, so one click silently threw a correction away. Now Accept is blocked after any decision, and going back to the agent's value is Undo, then Accept.
- **The citation check** (19 Nov). `shared/domain/citation.ts` first wrote the agent's value out in every format a document might use (Intl number and date forms) and searched the text with a regex built from it, about 62 lines. I asked why we needed all those formatters, and we inverted it: read the numbers out of the cited text and compare. That is about 25 lines, with no Intl and no regex built from agent text.

**Accepted as is:** storing each decision with the agent version it was made against, and refusing a stale one with a 409. It came from the agent's research notes before the spec (`plans/BRIEFING.md`, "Revisions after the reviewer has acted") and I kept the idea as proposed. The one refinement came during the plan check: the version counts per field and moves only when the value changes (it started as the event `seq`), so a confidence-only change doesn't reopen a decision. I kept it because it is the smallest thing that makes "never overwrite a human decision" hold across a network round trip. It is tested on both sides (`shared/domain/fieldView.test.ts`, `server/test/decisions.test.ts`).

## 4. The next ticket: bulk accept above a confidence threshold

**Where it lands:**

- A new contract in `shared/contract/decisions.ts`.
- A server route next to `decide()` in `server/src/claims.ts`. It must run the same per-field checks: a `based_on` match, a claim that isn't completed, and an existing decision.
- The threshold from `shared/domain/confidence.ts`.
- A control in `web/src/features/queue/`.

**What they'll most likely get wrong:**

1. Accepting what the agent says now, rather than the version the reviewer saw. Without `based_on`, a value revised a second ago gets accepted unseen.
2. Overwriting decisions the reviewer already made. `store.save` replaces silently.
3. Treating confidence as the only signal. A 0.95 field can still be "not found in the cited text", have no source, or come from the statement with the injected text.
4. Accepting on claims whose runs are still going.

**What in the repo stops that:**

- The hard rule "No accept all" in `CLAUDE.md`. An agent has to stop and have it reopened.
- `fieldView()`'s `needsYou` and `attention` lists.
- The 409 on `based_on` and on completed claims.
- The merge-rule tests in `shared/domain/fieldView.test.ts`.

What doesn't stop it yet: no test forbids a bulk path from replacing an existing human decision. That is the first test I'd write for the ticket.

## 5. Something you didn't ask for

**The "not found in the cited text" check (T2).** The brief asks for a citation next to each value. It doesn't ask whether the value is actually in it. In 4817, `incident_time` says 22:40 and cites "23:40". With only the citation shown, the reviewer has to spot that themselves, 49 times per claim. So for times, dates, money and numbers, the screen says "22:40 not found in the cited text: '23:40'" and counts it as needing attention. It deliberately never says "wrong": the check is dumb string matching, and the reviewer judges.

## 6. Pushback

The scope doesn't fit four hours, so the timebox measures cutting, not building. A finished look on laptop and phone, a backend with validation, live replay, eight traps, tests, seven README sections and a video don't fit together. I spent about 7 hours and still cut. I'd keep the scope and say "about a day, tell us what you cut", or keep four hours and drop either the phone layout or the backend. Then everyone sizes the same job.

## 7. What next, and what I left out

**Next, in order:**

1. Push decisions and completion to other tabs and reviewers: a decision event on the run stream, plus a version on the decision itself, so two reviewers on one claim can't silently replace each other.
2. Cache the server's run fold per claim. Today every queue poll folds every run from zero, which is fine for 4 claims and not for 400. Then cache field views in the browser, so a field row re-renders only when its field changes.
3. Make the decision store async, with a conditional write (save only if `based_on` still matches) before swapping in a database.
4. Retry a failed run (T8), with an extra run file in `fixtures/extra/` that gets past the policy step.
5. The phone document sheet, then decision history.

**Left out on purpose:**

- Bulk accept (section 4).
- Keyboard shortcuts: everything works with Tab and Enter.
- Dark mode, sign-in, translations.
- A headless UI library: native elements covered what was left after the cuts.

## How this was built (agent configuration)

- **Global config off.** My global `~/.claude/CLAUDE.md` was turned off for this repo (renamed to `CLAUDE.md.off`). Its slice-by-slice PR workflow is too slow for four hours, and you can't see it. Everything the agent used is committed:
  - `CLAUDE.md`
  - `.claude/rules/` (frontend, backend, testing)
  - `.claude/agents/` (`slice-reviewer`, `final-reviewer`)
  - `DESIGN.md`
  - `plans/` (BRIEF, BRIEFING, SPEC, PLAN, design rounds)
  - `AI-LOG.md`
- **Process:** product spec (`plans/SPEC.md`) → design rounds on a design canvas (`plans/design/ROUNDS.md`, exported frames in `plans/design/export/`, tokens in `DESIGN.md`) → technical plan (`plans/PLAN.md`) → slices 0, B, A, C, D1, D2, E, F, G, each reviewed by `slice-reviewer` and by me before its commit. `final-reviewer` ran once, at the feature freeze.
- **Superpowers** (a Claude Code plugin, not repo files). The skills I used:
  - `brainstorming` for the spec;
  - `writing-plans` for the plan;
  - `subagent-driven-development` for every slice (Opus or Sonnet implementers per the plan, reviews on Opus);
  - `test-driven-development` for the domain logic.
- **Models:** Opus 5.5 for the spec, design, plan and reviews; Sonnet 5.5 for well-specified build slices.
