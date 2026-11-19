# Design research: AI extraction reviewed by a person

Done in design round 1 (2026-11-18) to check our directions against how real products handle "an AI reads documents, a person approves each value". Sources are mostly vendor docs and product write-ups; vendor numbers are their own claims.

## What similar products do

| Pattern | Who | How it works | What we took |
|---|---|---|---|
| Validation station | [UiPath](https://docs.uipath.com/document-understanding/automation-suite/2024.10/classic-user-guide/data-extraction-validation-overview), [Rossum](https://knowledge-base.rossum.ai/docs/document-validation-screen-in-rossum), [Hyperscience](https://help.hyperscience.ai/v42/docs/what-is-supervision), Affinda | Fields beside the document, cited spot highlighted both ways. Unconfirmed vs confirmed values look different (dashed vs filled, no tick vs tick). Enter confirms and moves to the next field. Only low-confidence fields are routed to a person. | Field beside its source; dashed = agent value not decided, solid = decided; keyboard "decide and go to next". |
| Exception routing with reasons | [CCC Intelligent Reinspection](https://www.nasdaq.com/press-release/ccc-launches-cccr-intelligent-reinspection-help-auto-insurers-review-repair-estimates), [Ramp](https://support.ramp.com/ramp-accounting-agent-enablement-daily-use-admin-guide), [Sprout.ai](https://sprout.ai/resource/explainable-ai-in-claims-why-audit-ready-decisioning-matters-more-than-automation-alone/) | Reason codes on every flag, a "why" behind every suggestion, similar work grouped. | A short reason tag on every problem ("Low 38%", "Not in source", "Changed after you"). |
| Warning | [Tractable](https://www.repairerdrivennews.com/2019/05/28/tractable-shares-lessons-from-photo-estimate-a-i-use/) | Its AI flagged 22% of estimates; adjusters often didn't act on the flags. | Flags must be visible without opening anything and must block sign-off where the spec says so. |
| Draft you sign | [Abridge](https://hitconsultant.net/2025/08/21/abridge-outlines-approach-to-eliminating-ai-hallucinations-in-clinical-notes/), [Guidewire](https://www.guidewire.com/products/technology/guidewire-cloud-platform-releases) claim summaries | Clinician edits an AI-drafted note; each sentence links to its source; then signs. | "Use new / Keep mine" wording for a value the agent changed after the reviewer decided. |
| Review grid | [Harvey review tables](https://developers.harvey.ai/guides/review_tables) | Citations per cell, verify or flag per cell. | Rejected as the main layout (direction A): rows all look equal. |
| Change review | [Cursor](https://docs.cursor.com/agent/review) | Keep or undo each AI change, "next change" navigation. | Side-by-side "yours vs agent's new value". |
| List-detail | Email clients, Linear, Superhuman ([pattern write-up](https://www.saasui.design/blog/saas-list-detail-master-detail-ux-patterns)) | Persistent compact list (rows ~36–40 px) plus one open item; J/K to move. | The layout of direction G. |

## Icons and labels

Icon-only buttons are often misread; one test cited by [UserTesting](https://www.usertesting.com/blog/user-friendly-ui-icons/) found people predicted what an icon does 88% of the time with labels and 60% without. Our reviewers are not technical and are accountable for payouts, so decision buttons get an icon plus one word; navigation and secondary actions can be icon-only with a tooltip.

## Why G

Every field needs its own decision (spec A6: "Complete review" needs the run ended and every field decided; no accept-all). So the fastest workflow is one key per routine field with the evidence already on screen, and full attention on the 7–10 problems. G gives that: the list is the overview and never re-sorts, problems stay pinned even in collapsed sections, the open field shows value and citation together, and deciding opens the next field. Rejected options and why: see the round 1 row in `ROUNDS.md`.
