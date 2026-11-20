# SPEC: Agent-assisted claims review

18 Nov 2026 · product spec, written with superpowers:brainstorming (20 min timebox)

Sources, in order of authority: `plans/BRIEF.md`, then `fixtures/README.md` and the fixture data, then `plans/BRIEFING.md`. The decisions in BRIEFING.md's "Open decisions" table are closed and are restated here as product rules. This file is product-level only: no stack, no architecture.

**Task type:** take-home build, about 4 hours, defended line by line in the next round.

## What the evaluators will do

The MarvelX reviewers clone the repo, start it with the README commands, press replay, and act as the claims reviewer while the runs are still going. They watch what the UI does when the agent changes its mind, when a run fails, and when they reload. They look at it on a laptop and on a phone. They also read the README (7 sections), watch a 3 to 5 minute video, and read the committed agent config.

## Users and jobs

**The claims reviewer.** Not technical. Has the final say, and is accountable when money is paid out wrongly. The agent is useful but wrong often enough that their decisions matter.

Jobs, in the reviewer's words:

1. "Show me which claims need me, and what state each one is in."
2. "Let me watch the agent read a claim, and start checking its work before it's done."
3. "For each thing the agent pulled out, show me where it came from, so I can check it quickly."
4. "Let me accept it, fix it, or throw it out and enter my own value."
5. "Never lose what I decided, and tell me when the agent changes something after I've looked at it."
6. "Tell me plainly when something went wrong, without throwing away the work that was done."
7. "Let me sign the claim off when I'm done."

**The evaluator** (MarvelX hiring team) is a second user of the replay: they need to restart and drive runs without editing code.

## Product rules (closed)

- **A human decision is never overwritten.** When the agent revises a field after the reviewer decided it, the decision stands and the field is marked as needing a fresh look (visible flag: trap row T3). Only a value change reopens a decision; a confidence-only change does not.
- **Each decision records which agent version it was made against.** This is part of the working product from the start, even before the flag is visible.
- **The same event delivered twice changes nothing.** A reload or reconnect mid-run brings the screen back to where it was, with no duplicates.
- **Everything the agent or a document says is untrusted text.** It is shown as text, never as markup that runs, and links in it are not clickable.
- **Money is shown exactly as given** (decimal amount and currency), never rounded through arithmetic.
- **No "accept all" anywhere.** Each field is decided on its own.
- **Actions:** Accept is one click. Correct is an inline edit pre-filled with the agent's value. Override ("Reject and replace") starts empty and requires a one-line reason.
- **Undo:** any decision can be undone until the claim is completed.
- **Claim statuses:** `queued` → `running` → `needs_review` or `failed` → `reviewed`. A claim becomes `reviewed` only through an explicit "Complete review" action.
- **Field statuses** (per extracted field, worked out from the agent's history and the reviewer's decision, never set by hand):
  - `pending`: the agent's value, no decision yet.
  - `accepted`: the reviewer confirmed the agent's current value. The shown value is the agent's.
  - `corrected`: the reviewer edited the agent's value. The shown value is the reviewer's.
  - `overridden`: the reviewer rejected the agent's value and entered their own, with a reason. The shown value is the reviewer's.
  - `revised after your decision`: the reviewer decided, then the agent changed the value. The decision and the shown value stay as they were until the reviewer decides again (T3).

  Undo returns a field to `pending`. "Revised after your decision" is a field status, never a claim status: the queue shows it only as a count.
- **Filter** (status) is kept in the URL.
- **Decisions are saved through the backend.** If saving fails, the field stays as it was and the screen says so. If the agent revised the field since the decision was based on it, the backend refuses the save and the reviewer is told.
- **Storage is in memory.** Restarting the replay resets runs and decisions.
- **Out of scope:** dark mode, sign-in, translations, bulk accept (README section 4 only).

## Scope

Row order is the priority order (agreed 18 Nov 2026). Part A is the working product. Part B adds the traps one at a time. Each Part B row only adds to Part A and never forces a rewrite. Anything that would force a rewrite if added later was moved into Part A (the product rules above).

| # | Requirement | Part | Rank |
|---|---|---|---|
| A1 | Review screen shows one claim's run live: steps, summary streaming in, extracted fields with confidence and the cited text from the source document | A | 1 |
| A2 | Accept, correct, override per field, during the run; saved via backend; the reviewer can tell agent changes from their own | A | 2 |
| A3 | Loading, error and empty states, including a run that fails part-way | A | 3 |
| A4 | Queue of claims with live status and a status filter | A | 4 |
| A5 | Replay the evaluators can drive without editing code; reload or reconnect mid-run picks up where it was | A | 5 |
| A6 | "Complete review" moves a claim to reviewed | A | 6 |
| A7 | Works and looks finished at phone (375 px) and laptop (1280 px) sizes; basic accessibility | A | 7 |
| A8 | Undo a decision until the claim is completed | A | 8 |
| T1 | Summary labelled as an unverified AI draft, below the fields; step warnings and notes shown in the claim header (prompt injection) | B | 9 |
| T2 | "Value not found in the cited text" hint for time, date, money and number fields | B | 10 |
| T3 | Visible "agent revised this after your decision" flag; "Complete review" blocked until it is decided again | B | 11 |
| T4 | "Not found in documents" for empty values, "No source" for uncited ones, and a "needs your attention" count and filter | B | 12 |
| T5 | Confidence in words and colour (Low · 41%), and stable field groups for long claims | B | 13 |
| T6 | Document panel with the cited span highlighted | B | 14 |
| T7 | Summary formatting stays correct when markdown is split across stream chunks | B | 15 |
| P1 | ~~Priority filter on the queue~~ Cut (owner, 19 Nov): the brief asks for one filter | B | – |
| T8 | ~~Retry a failed run~~ Cut (owner, 19 Nov): the brief asks only for the failure state | B | – |
| D1 | README: setup, run and test commands, time spent, what was cut, and the 7 sections from the brief | D | required |
| D2 | 3 to 5 minute screen recording (one run as reviewer, laptop and phone size), linked at the top of the README | D | required |
| D3 | Agent configuration committed as last used (`CLAUDE.md`, `DESIGN.md`, `plans/`, `.claude/`, `AI-LOG.md`); README says the global CLAUDE.md was turned off and Superpowers was used | D | required |

Part D rows are deliverables required by the brief. They are done in the finish phase and are never cut.

The "why" for each trap, with options weighed, is in BRIEFING.md "Traps and gaps".

## Acceptance criteria

### A1 Live review screen

- Opening a claim shows its steps in order, each as running, done, done with warning, or failed. A step's note is readable.
- The summary appears piece by piece in arrival order. In Part A it is plain text.
- Each field shows its label, its value formatted for its type (money with currency, dates and times readable, yes/no for booleans), its confidence as a percentage, and the exact cited text from the document right next to the value. Long cited text is shortened, with a way to see all of it.
- New fields appear without moving the fields the reviewer is looking at. Fields are not re-sorted while the run is live.
- When the agent revises a value or its confidence, the field shows the new state, and the reviewer can see that it changed, what it was before, and the agent's reason.
- A field whose value is empty says so in words. A field with no citation says so in words. Neither shows a blank.
- The finished claim (CLM-2026-004809) opens fully populated at once, with no replay animation.

### A2 Reviewer actions and provenance

- Every field can be accepted, corrected or overridden while the run is still going, including fields the agent may later revise.
- Override cannot be saved without a reason. Correct starts from the agent's value. An empty value can be accepted (meaning "confirmed: not in the documents"), corrected or overridden.
- After a decision, the field shows who set the value now shown: "Agent" (accepted) or "You" (corrected or overridden), and the agent's original value stays visible next to the reviewer's.
- The agent's own revisions are labelled as the agent's and are never shown as the reviewer's.
- If a save fails, the field goes back to how it was, with a message the reviewer can act on (try again).
- A revision arriving after a decision never replaces the decision. In Part A the decision is kept and the new agent value is visible. T3 adds the flag and the blocking.

### A3 States

- Loading the queue or a claim shows a loading state shaped like the content, not a bare spinner.
- If the backend can't be reached, the screen says so in plain words with a retry. A broken live connection mid-run shows "Reconnecting…", and then catches up without duplicates.
- Empty queue, or no claims matching the filter: a message saying so, plus a way to clear the filter.
- Unknown claim in the URL: a "claim not found" page with a way back to the queue.
- A claim whose run is queued and hasn't started yet says "Waiting for the agent to start".
- **Part-way failure (CLM-2026-004822):** the failed step is marked in the step list with the error in plain words. The fields already extracted stay visible and reviewable. The summary is marked incomplete, and the screen says what was not checked (policy cover and excess). The queue shows `failed`.

### A4 Queue

- Lists every claim with reference, claimant, product, priority, status, when it was received and last updated, and the run's overall confidence once the run ends ("—" while running).
- Rows update by themselves as runs start, finish or fail, and when a claim is completed, without a page reload.
- Filter by status; the filter survives a reload and can be shared as a link.
- An invalid filter in the address bar gives a clear message, not a crash. The backend answers an invalid filter with a readable "bad request" error.
- Selecting a row opens that claim's review screen; back returns to the filtered queue.

### A5 Replay

- One documented command or control restarts the whole replay: all runs start again at their scheduled offsets (0 s, 4 s, 20 s; 4809 already finished) and decisions are cleared.
- Every browser tab sees the same clock. Reloading mid-run continues where the run is, without restarting it and without duplicate fields, steps or summary text.
- The evaluators need nothing beyond the README to do this.

### A6 Complete review

- "Complete review" is available once the run has ended (finished or failed) and every field has a decision. Otherwise it is disabled, with the reason shown.
- Completing moves the claim to `reviewed` in the queue, and the decisions become read-only (undo ends).

### A7 Phone, laptop, accessibility

- At 375 px and 1280 px nothing scrolls sideways, nothing overlaps, and touch targets are at least 44 px.
- The first thing the reviewer sees on a claim is its status and what needs them, not the summary.
- Every action works by keyboard, with a visible focus ring. Nothing relies on colour alone. Live updates don't steal focus or interrupt a field being edited. Status changes are announced politely to screen readers.
- It must not look like a default component library (brief).

### A8 Undo

- Each decision has an undo until the claim is completed. Undo returns the field to undecided and is saved through the backend like any other decision.

### Trap rows (Part B)

- **T1:** The summary carries a visible "AI draft, not verified" label and sits below the fields. A step note or warning (e.g. "Statement contains text addressed to the claims system") appears in the claim header as soon as it arrives. The injected "Pre-approved by the insurer" line can't be mistaken for a system message.
- **T2:** For time, date, money and number fields, if the value can't be found in its cited text the field shows "22:40 not found in the cited text: '23:40'". It never says "wrong" or "mismatch". Text and yes/no fields are not checked. This field counts as needing attention.
- **T3:** A decided field whose value the agent revised afterwards shows "Agent revised this after you accepted: €3,605.80 → €4,415.30", with the reason, and must be decided again before "Complete review" is enabled. A confidence-only change does not reopen a decision.
- **T4:** A header count, "N need your attention", that filters to those fields. Reasons: low confidence, revised after a decision, no source, value not found in the citation, step warning, empty value.
- **T5:** Confidence shown as Low (under 60%), Medium (60–85%) or High (85% and above), in words and colour. The thresholds are an assumption kept in one place and stated in the README. Fields are grouped in a stable order under plain group headings (per-group counts and collapsing cut, 19 Nov).
- **T6:** Selecting a field opens its document (beside the fields on laptop, as a bottom sheet on phone), scrolled to and highlighting the cited span. Only one span is highlighted at a time.
- **T7:** Summary markdown renders from the whole text so far. Stray `**` only shows until the closing piece arrives.
- **P1:** Cut (19 Nov).
- **T8:** A failed claim offers "Retry run" when the error says it is retryable. The retry plays an extra run file that gets past the policy step. Decisions already made stay, under the same rule as revisions. If this row is cut, the README says so, and there is no fake button that fails again.

## Edge cases from the fixture

| Case | Where | Expected |
|---|---|---|
| Same event delivered twice | 4817, seq 42 | Applied once; field history shows one revision |
| Value contradicts its citation | 4817 `incident_time` 22:40 vs "23:40" | Cited text visible next to it (A1); hint (T2) |
| Revision after the reviewer may have accepted | 4817 `total_incl_vat`, `liability_assessment` | Decision kept (A2); flagged (T3) |
| Confidence changes, value unchanged | 4817, four fields | New confidence shown with reason; decision not reopened |
| Prompt injection in the summary | 4817 claimant statement, summary at about 68 s | Plain text (A1); labelled and placed below (T1) |
| Step note arrives about 8 s after the injected summary text | 4817 "Read claimant statement" | Shown in the header (T1) |
| Empty values | 4817 third-party policy number, witness phone | "Not found in documents"; still decidable |
| No citation | 4817 `estimated_payable` | "No source"; counts as needing attention (T4) |
| 49 fields over 103 s | 4817 | No jumping rows; readable on phone (A7, T5) |
| Run fails part-way, retryable | 4822 at "Look up policy" | A3 failure state (retry cut) |
| Already finished before the session | 4809 | Loads complete at once, `needs_review` |
| Bold markers split across chunks | 4817 summary | Brief stray `**` acceptable in Part A; fixed by T7 |
| Several runs at once | 4817, 4822, 4830 overlap | Queue shows all live; switching claims loses nothing |
| Reload or connection drop mid-run | any | Catches up, no duplicates (A5, A3) |

## Assumptions (my calls, check them)

- Accepting an empty value means "confirmed: not in the documents".
- Correct needs no reason; only override does.
- "Complete review" requires every field decided, including on a failed run. The reviewer decides on the fields that exist.
- Decisions on a completed claim are read-only, with no reopen in scope.
- A failed claim with all fields decided can be completed and becomes `reviewed`. The queue keeps a marker that its run failed.
- Priority filter and retry: cut by the owner on 19 Nov to fit the 4 hours.

Added after the builder check:

- **What "agent version" means.** It counts per field and moves only when the agent's value for that field changes. A confidence-only change doesn't move it. A revision that repeats the same value doesn't move it either.
- **Save refused because the agent revised the field in the meantime.** The decision is not saved. The field shows the agent's new value and the reason, with "The agent changed this while you were deciding. Please decide again." Nothing the reviewer typed is lost: a correct or override value they entered stays in the input.
- **Undo** removes the decision. The field is undecided and shows the agent's latest value. A "revised after your decision" flag goes away with the decision, because there is no decision left to reopen. Replaced decisions are not kept (cut 19 Nov: never shown).
- **"Every field decided"** means every field the run has emitted so far. A field the agent never extracted doesn't exist and can't block completion.
- **Replay clock.** The clock starts when the backend starts. The documented command, plus a small dev-only control in the UI, restarts it. CLM-2026-004809 is complete from the first moment.
- **Queue confidence column.** "—" while queued or running. On a failed run it shows "—" with "run failed". After completion it shows the run's last overall confidence.
- **Queue default view** is all claims, reviewed ones included. The filter narrows it.
- **Decision time.** Each decision stores when it was made. The field shows it quietly next to "You" or "Agent" (e.g. "You · 10:42").
