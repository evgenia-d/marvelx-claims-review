# Design

The look and the building blocks for the web app. Source: the **Current design** page of the [design canvas](https://claude.ai/artifact/KzLVs4ZfXXT9wp7TuYqK8z) (frames exported to `plans/design/export/`), its token sheet `G-tokens` and block list `G-blocks` (generator: `plans/design/gen/tokens.py`). History and owner feedback: `plans/design/ROUNDS.md`. Never build from the Superseded page (A–F, `G-card-routine`, `G-card-slots`).

## Hard rule: tokens only

- Every colour, size, space, radius and shadow comes from the `@theme` block below. **No raw hex, no `rgb()`, no Tailwind arbitrary values (`[...]`)** in components. The only raw values in the app live in that block.
- Spacing and heights use the steps listed here, nothing between them (no `p-2.5`, no `h-4.5`).
- A value the design needs but this file lacks is added here first, with a line on what it is for. Never a one-off.

## Direction: G, list-detail ("Inbox")

Chosen in round 1 over six others (A ledger table, B triage cards, C source-led, D one field at a time, E proofread the file, F deck). Why: the list is the overview, one field is open beside it, the source document on the right. It is the fastest legal workflow: every field must be decided, a routine field takes one key with its evidence on screen, problems stay pinned even in collapsed sections, and nothing moves while the run is live. The others failed on: problems lost among equal rows (A), two views (B), source before status (C), too much text (D), two taps per decision (E), an unclear overview (F).

- **Review, laptop (1280 × 800):** three panes that scroll on their own: field list `320px`, open field (fluid), source document `400px`. One-line claim header, one-line agent step line under it.
- **Review, phone (375):** the list is the main screen. A row opens the field full screen with back, previous / next and a sticky bottom action bar. The cited text shows inline under the value; the whole document is laptop only.
- **Queue (round 4, option A "work list"):** a table on laptop, one card per claim on phone (one component, two layouts), a status filter in the URL (priority filter cut 19 Nov; priority still shows in each row). Fixed sort: priority, then oldest received.
- **Breakpoint:** phone layout below `lg` (1024 px), laptop layout from `lg`.

**Cut for time (2026-11-19, owner):** keyboard shortcuts and their hints (J/K/A/C/R/S/U); the phone document bottom sheet (spec T6 on phone, say so in the README); the phone filter menu (native `<select>` instead); queue column sorting; the Skip button; the History disclosure. Canvas frames still draw these; this list wins. Everything stays reachable with Tab and Enter and shows the focus ring.

Owner rules that shape everything:

- **One meaning per colour.** Orange = needs you (and real errors). Blue = you: **solid blue fill** = the action you press; **blue tint + blue border** = what you decided. A state is never a solid fill. Everything else is navy or blue-grey. State is never colour alone (glyph or words too).
- **Less text.** Tags, not sentences. Long content (agent's reason, history) sits in closed disclosures.
- **Decide only in the open field.** No decision buttons on rows. **No "accept all"** anywhere.
- **No dashed lines** anywhere (dashed reads as "empty slot"). No confidence colours or meters.
- **Value size follows the field's type, never its length,** so a revision never resizes a value.
- **No saving state.** A decision shows at once; a failed save rolls back with a message.
- Type: **serif** only for the open field's name and state headlines; **Inter** for sentences and controls; **mono** for values, amounts, IDs, scores, citations, the document, tags and uppercase section labels. Never mono for running text.

## Tokens (`web/src/index.css`)

Canvas names map 1:1 to these, with the `--color-`, `--text-`, `--radius-`, `--shadow-` prefixes Tailwind v4 needs. One rename: `--bg` → `--color-ground` (so the class is `bg-ground`, not `bg-bg`). `--primary` and `--you` are the same blue on purpose: two names so the rule "fill = press, tint = yours" reads in code.

```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --text-*: initial;
  --shadow-*: initial;
  --radius-*: initial;
  --spacing: 4px;

  /* Ground, back to front */
  --color-ground: #F4F6FA;      /* page, panes, document panel, secondary-button hover */
  --color-surface: #FFFFFF;     /* header, open field, cards, inputs, undecided value box */
  --color-subtle: #E9EDF5;      /* hover, segment track, grey tags, "Not decided" pill, skeleton */
  /* Lines */
  --color-line: #DFE4EE;        /* dividers, pane and card edges */
  --color-line-strong: #C3CBDA; /* control edges: value box, secondary button, input */
  /* Ink */
  --color-ink: #0F1D3A;         /* names, values, headlines; also the selected-row ring */
  --color-ink-2: #3E4A66;       /* sentences, agent line, icon buttons */
  --color-ink-3: #5A6580;       /* labels, counts, meta, grey ring glyph */
  /* Action: press this (solid fill only) */
  --color-primary: #2B5BDB;
  --color-primary-hover: #2149B8;
  --color-on-primary: #FFFFFF;
  /* You: this is yours (tint + border, never a solid fill for a state) */
  --color-you: #2B5BDB;         /* your values, pill text, check glyph, progress */
  --color-on-you: #FFFFFF;      /* the check inside the blue circle */
  --color-you-tint: #EAF0FD;
  --color-you-line: #BDD0F7;
  /* Needs you */
  --color-attn: #A24B00;        /* ! glyph, orange tags and counts, alert text, notes */
  --color-attn-tint: #FCF0E2;
  --color-attn-line: #EEC89E;
  /* Evidence and focus */
  --color-cite: #F9E3A1;        /* cited-text highlight in the document */
  --color-focus: #0F1D3A;       /* 2px ring, 2px offset */

  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Source Serif 4", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --text-xs: 11px;   --text-xs--line-height: 14px;   /* row labels, tags, counts, kbd, eyebrow */
  --text-sm: 12px;   --text-sm--line-height: 16px;   /* agent line, pills, chips, step notes, row values, quotes */
  --text-base: 13px; --text-base--line-height: 18px; /* body, buttons, details summaries */
  --text-md: 14px;   --text-md--line-height: 20px;   /* claim ID, long-text values, messages, phone row value */
  --text-lg: 18px;   --text-lg--line-height: 24px;   /* serif field name and headlines; mono text values */
  --text-xl: 22px;   --text-xl--line-height: 28px;   /* serif page messages; mono money/date/time/number/yes-no */

  --tracking-tight: -0.01em;   /* serif */
  --tracking-label: 0.08em;    /* AI draft tag */
  --tracking-eyebrow: 0.12em;  /* mono uppercase section labels */

  --radius-xs: 2px;  /* cited-text highlight */
  --radius-sm: 4px;  /* tags, kbd, active segment, skeleton bars */
  --radius-md: 8px;  /* buttons, icon buttons, value box, input, rows, quote card, document paper, alerts */
  --radius-lg: 12px; /* cards, frames */
  --radius-full: 9999px; /* pills, chips, glyphs, progress, live dot */

  --shadow-lift: 0 1px 3px rgb(15 29 58 / 0.08), 0 0 0 1px var(--color-line);     /* raised: paper, active segment, tooltip */
  --shadow-selected: 0 1px 3px rgb(15 29 58 / 0.10), 0 0 0 1.5px var(--color-ink); /* selected row */

  --animate-live: pulse 1.6s ease-in-out infinite;  /* live dot, skeleton */
    --animate-arrive: fade-in 0.4s ease-out;          /* a new field row */
}
```

`@keyframes` for `pulse` and `fade-in` sit next to the theme. All motion stops under `motion-reduce:`. Chevrons turn with `transition-transform duration-150`. Body text uses `tabular-nums`; mono turns ligatures off. Fonts load at weights 400, 500, 600 only (mono adds 400 italic for empty values).

**Contrast** (WCAG, measured on the sheet): every text pair drawn passes AA 4.5:1; the lowest is `ink-3` on `subtle` at 4.96:1.

### Spacing and heights

`--spacing: 4px`, so Tailwind's numbers are multiples of 4. Allowed steps:

| px | Class | Used for |
|---|---|---|
| 2 | `0.5` | segment track inset, icon gaps |
| 4 | `1` | tag gaps, tight stacks |
| 6 | `1.5` | icon to label in buttons, chips, pills, tags |
| 8 | `2` | button gaps, row inset, pill to text, row glyph to text |
| 12 | `3` | field card stack, chip side padding, list top |
| 16 | `4` | pane padding, phone gutter, agent-step line inset |
| 24 | `6` | open field padding (laptop), document paper inset, details indent |
| 32 / 40 / 48 | `8` / `10` / `12` | page and section gaps |

Heights: tag 20 (`h-5`), decision pill 22 (`h-5.5`), chip 24 (`h-6`), segment button 28 (`h-7`), icon button and section header 32 (`h-8`), button and step line 36 (`h-9`), field row and details summary 40 (`h-10`), **every phone control 44 (`h-11`)**, pane top bar and phone action bar 48 (`h-12`), value box, input and phone row 52 (`h-13`), claim and phone header 56 (`h-14`). Strokes: 1px lines, 1.5px value box / input / ring glyph, 2px focus ring. The 1.5px box stroke is the `border-control` utility in `index.css` (Tailwind has no 1.5px border).

### Round 2 open items, settled

- `--you-hover`: **dropped.** Nothing "yours" is pressable; hover belongs to `primary-hover`.
- Off-scale 10px (glyph → text, chip / source padding, progress → count): **gaps become 8, chip padding 12.**
- Off-scale 20px (document paper inset, step-line left inset): **paper 24, step line 16** (lines up with the pane edge).
- kbd 3px side padding: **moot,** shortcuts are cut. The 30 / 42px text indents are derived (glyph + gap), never written as values.
- Inline selected-row shadow: **token `--shadow-selected`.**
- Unused `t-2xl` (28px): **dropped.** Six sizes. Inter 700: not loaded.
- Dead dashed no-source CSS in build.py: **not carried over;** no dashed borders anywhere.
- Field alert vs run-failed line sharing `.alert`: **gone with Tailwind:** both are the `Alert` primitive (below); the run-failed line is the feature `RunFailedLine` built on it with `layout="band"`.

## Building blocks

Native elements first (`button`, `details`, `dialog`, `table`, `mark`). Whether to add a headless library for the tooltip is a track C question to ask before adding it; with the sheet and the custom select gone, native elements cover the rest.

### `web/src/ui/`: primitives (built in track C)

No claim, field, decision or run concepts. Props in, markup out. Names describe looks and behaviour, not meaning (`tone="attn"`, never `needsYou`).

| Primitive | Pattern | States and variants | Access |
|---|---|---|---|
| `Button` | button | `primary` (solid blue, one per area) · `secondary` (white, strong edge). Rest · hover · focus ring · pressed · blocked (grey, stays focusable). Icon + one word. 36 laptop, 44–48 phone | blocked: `aria-disabled`, never `disabled`; the caller shows the reason as visible text (no tooltip on Button, owner 20 Nov) |
| `IconButton` | icon button + tooltip | rest · hover (subtle fill) · focus. 32 / 36 laptop, 44 / 48 phone; optional 1px edge | `aria-label` and tooltip on every one |
| `Badge` | static badge | shape `tag` (radius sm, 20 high, mono xs, no glyph inside) · `pill` (radius full, 22–24 high, sans sm 600, optional leading icon or mark). Tone `attn` (orange tint) · `you` (blue tint + you-line edge) · `plain` (subtle) · `outline` (surface + line edge) · `label` (subtle, uppercase, tracked). Never clickable | text carries the meaning; icons `aria-hidden` |
| `StatusGlyph` | status icon | `ring` (grey, 1.5px) · `done` (blue circle, white check) · `attn` (orange circle, white !) · `error` (triangle, real errors only). 14 / 12 px | `aria-hidden`; the owner's label says it |
| `SegmentedControl` | toggle group | items with a count; one pressed (surface + lift). Optional leading glyph | buttons with `aria-pressed` in a labelled group |
| `Select` | native `<select>` | phone filter: half width, 44 high, styled box and chevron | visible label |
| `ProgressBar` | determinate progress | 4px track `subtle`, fill `you`, count beside it in mono | `role="progressbar"` with min, max, now |
| `ListRow` | selectable row | glyph · label over value · trailing slot. Rest · hover · selected (`shadow-selected`) · focus · `tone="you"` value · `empty` (italic grey) · arrives (fade-in). 40 / 52 | a button; `aria-current` when open |
| `Disclosure` | details / summary | closed by default; 40 / 48 summary, chevron turns | native `details` |
| `ValueBox` | read-only value | tone `default` (white, strong edge) · `tint` (blue tint, you-line edge, blue text) · `muted` (ground, grey text). Size `num` (mono xl, 1 line) · `text` (mono lg, 2 lines) · `long` (Inter md, 4 lines + "Show all" / "Show less"). 52 min height; the input uses the same box and size | value is text, never a link |
| `TextInput` | input (+ reason line) | same box and size as `ValueBox`; focus ring | visible label; Save / Cancel buttons (Enter submits the form) |
| `Alert` | inline alert + action | attn tint, attn-line edge, attn text, optional leading icon, optional action slot (the caller's Button). `layout="box"` (44 min, radius md) or `layout="band"` (full width, bottom edge) | `role="alert"` |
| `Message` | empty state / error page | serif xl headline, one sentence, at most one action (a slot: the caller's Button); optional triangle for errors | headline `h2`; a page-level message's action gets first focus (`autoFocus` from the caller), an inline empty state never takes focus |
| `Skeleton` | skeleton loader | bars in `subtle`, radius sm, pulse | one hidden "Loading…" text from the owner |
| `Tooltip` | tooltip (IconButton only) | on hover and focus, one short sentence, `shadow-lift`; hides on Escape, blur, mouseleave | `role="tooltip"`, `aria-hidden` (the button's `aria-label` carries the text) |
| `Highlight` | text highlight | `cite` background, ink text, 2px radius | `mark` |
| `Busy` | busy mark | 6px pulsing dot (live, reading, reconnecting); stops under reduced motion | decorative; text beside it |
| `Table` | data table | header row in eyebrow style, 52px rows, hover, whole row clickable; below `lg` rows restyle as cards (same markup) | real `table` with `th` |

### `web/src/features/`: components built from the primitives

**`review/`**

| Component | Built from | States and wording |
|---|---|---|
| `ReviewLayout` | grid / push nav | laptop three panes; phone list → field. Landmarks: nav "Fields", main, aside "Source document" |
| `ClaimHeader` | IconButton, Badge, ProgressBar, CompleteReview | "CLM-2026-004817" (h1) · "Sanne de Vries · Motor" · run chip · current step · "5 of 41 decided". Phone: two lines, progress and Complete in the footer |
| `RunStatusChip` | Badge (pill, outline) | "Queued" · "Running" (live dot) · "Needs review" · "Run failed" (triangle) · "Reviewed" (blue check) |
| `CompleteReview` | Button | blocked: "Complete review · 36 left", "· agent working", "· not started"; the reason as visible text beside it ("36 fields still need a decision"), linked with `aria-describedby`. Ready: primary "Complete review" |
| `AgentStepLine` | Disclosure, StatusGlyph | collapsed: latest note in one line ("Read claimant statement · Statement contains text…", "No notes"), "Agent steps 5 of 6"; open: `AgentSteps` |
| `AgentSteps` | ordered list | done (grey check) · note (orange !) · running (live dot) · failed (triangle) |
| `RunFailedLine` | Alert band | "Look up policy failed · The policy service did not respond within 10 seconds. Not checked: policy cover and excess." (no "Retry run": T8 cut 19 Nov) |
| `Reconnecting` | Busy | "Reconnecting…" beside the run chip; polite live region; last state stays |
| `FieldFilter` | SegmentedControl | "Needs you 7" · "To review 36" · "All 41"; filters, never re-sorts |
| `FieldSection` | FieldRow | plain heading (mono uppercase group name) with its rows; "Reading" dot while live. Collapsing and per-group counts cut 19 Nov (frames still draw them) |
| `FieldRow` | ListRow, StatusGlyph, Badge | glyph by status; tags "Low 38%", "Empty", "Not in source", "No source", "Changed after you", "Replaced"; empty value "Not found". aria-label: name, value, state, tag |
| `FieldCard` | ValueBox, DecisionPill, AgentLine, DecisionButtons, FieldDetails | name (serif h2) + tags → value → pill and agent line → actions → details. Same layout in every state; "Blocks sign-off" tag when revised after a decision. Before → after is two `ValueBox`es: side by side with → for money, dates, times, numbers, yes/no; stacked with ↓ for text. Phone: cited text inline under the value (`CitedText`) |
| `DecisionPill` | Badge (pill) | "Not decided" · "You · accepted 10:06" ✓ · "You · corrected 10:06" ✎ · "You · replaced 10:07" ⇄ |
| `AgentLine` | text | "Agent · found 10:06 · High 93%", "Agent · changed 10:07 · High 95%"; Low moves to an orange tag by the name |
| `DecisionButtons` | Button, IconButton | "Accept" (primary) · "Correct" · "Reject". After a decision: Correct, Reject + Undo icon. Revised after you: "Use new" (primary) · "Keep mine" · Correct · Reject |
| `PhoneActionBar` | DecisionButtons | sticky, 48 high, the same buttons as laptop |
| `DecisionForm` | TextInput | Correct starts with the agent's value; Reject starts empty and adds a one-line reason (required) |
| `FieldDetails` | Disclosure | "Why it changed" · "Your reason" |
| `SaveFailed` | Alert box | "Couldn't save. Try again" after rollback. Refused (409): "The agent changed this while you were deciding. Please decide again." + "Decide again" tag; typed text stays |
| `ReadOnlyNote` | text | "Read-only · review completed 15:06"; replaces the buttons |
| `DocumentPanel` | Highlight, EvidenceNote | always shown on laptop, follows the open field, scrolls to the one highlighted span. Document text addressed to the system stays plain document text |
| `EvidenceNote` | text | "€ 1,252.00 not found in the cited text" · "No source: The agent cited no document for this value." Never "wrong" or "mismatch" |
| `CitedText` | text, ValueBox `long` clamp | phone: the exact cited text + document name ("Police traffic accident report"), "Show all" when long; the evidence note (or "No source") sits above it. Not a button |
| `SummaryView` | Badge (tag, label), react-markdown | below the fields, from the "Summary" row; tag "AI draft · not verified" or "AI draft · incomplete". Plain text, never a system message |
| `ReviewStates` | Message, Skeleton | "Waiting for the agent to start" / "Fields appear here as the agent reads the documents." · "Can't reach the server" / "Check your connection, then try again." + "Try again" · "Claim not found" / "There is no claim CLM-…" + "Back to queue" · skeleton "Loading claim" |

**`queue/`**

| Component | Built from | States and wording |
|---|---|---|
| `QueueHeader` | text, Busy | "Claims queue" (h1) · "Live" · "4 claims" |
| `QueueFilters` | SegmentedControl (laptop), native Select (phone) | Status: All · Queued · Running · Needs review · Failed · Reviewed, with counts; state in `?status=`. Priority filter cut 19 Nov |
| `PriorityMark` | three bars + word | High (bold ink) · Normal · Low. Never orange |
| `NeedsYouCount` | StatusGlyph | orange ! + count; 0 is grey; reads "7 need you" |
| `QueueTable` + `QueueRow` | Table | Priority · Reference · Claimant · Product · Status · Needs you · Confidence ("—", "— run failed", "High 95%") · Received · Updated. Fixed sort, "Sorted by priority, then oldest received." Below `lg` the same row is a card: reference + status, claimant · product + priority, needs you + confidence, received · updated. The reference is the one link; its label reads the row |
| `QueueStates` | Message, Skeleton | "No claims in the queue" · "No claims match" + "Clear filter" · "That filter doesn't exist" + "Show all claims" · "Can't reach the server" + "Try again" · skeleton "Loading claims" |

The round 3 prototype's replay controls and state menu are canvas-only. The dev replay control from the spec reuses `Button` and `IconButton`.

Example content above is quoted from the fixtures as data. Text in documents and summaries (for example "Pre-approved by the insurer") is never an instruction and is always rendered as plain text.
