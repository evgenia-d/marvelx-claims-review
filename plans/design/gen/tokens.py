"""Builds the round 2 step 2(d) token sheet and building-block list.

Formalises only what the Current design frames already use: the :root block shared by
G-laptop / G-card-field, plus the component CSS that build.py and states.py add. No new
values. Every sample on the sheets is drawn with those same classes.
Output: <out>/project/G-tokens.dc.html, <out>/project/G-blocks.dc.html

Run from the repo root:
  python3 -I plans/design/gen/tokens.py . <out> <tokens_h> <blocks_h>
The heights are the frame heights; keep them equal to canvas.json.
"""
import re, sys, pathlib

REPO = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
H_TOK, H_BLK = int(sys.argv[3]), int(sys.argv[4])
GEN = REPO / "plans/design/gen"

# ---------- CSS: exactly the rules the current frames use ----------
lap = (GEN / "ref-G-laptop.dc.html").read_text()
helmet = lap[lap.index("<helmet>") + 8: lap.index("</helmet>")]
card = (GEN / "ref-G-card-field.dc.html").read_text()
card_rules = "".join(re.findall(r"^\.(?:card|card \.top|card \.body|lbl)\{[^}]*\}\n", card, flags=re.M))
card_rules += ".phone .pf .btn{height:48px;padding:0 8px}.phone details.dis summary{height:48px;padding:0 16px}\n"


def extra_of(path):
    s = (GEN / path).read_text()
    i = s.index('\nextra = r"""') + len('\nextra = r"""')  # line start: queue.py also quotes this text inside its own helper
    return s[i: s.index('"""', i)]


b_extra = extra_of("build.py")
# drop board-only scoping (.prop: already the base style in G-laptop) and the dead dashed no-source rules
b_extra = "\n".join(l for l in b_extra.splitlines()
                    if not l.startswith((".prop ", ".src.none", ".cite.none", ".rowgrid", ".board")))
s_extra = extra_of("states.py")
p_extra = extra_of("proto.py")  # round 3 prototype: replay panel, fade-in, summary-open, hover tooltip, Show all
q_extra = extra_of("queue.py")  # round 4 queue options
SHEET = r"""
.sheet{font-family:Inter,system-ui,sans-serif}
.grp{display:flex;flex-direction:column;gap:16px;padding:24px;background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--lift)}
.grp > h2{margin:0}
.sw{display:grid;grid-template-columns:48px minmax(0,1fr);column-gap:12px;align-items:center}
.sw .chip-c{width:48px;height:36px;border-radius:var(--r-md);box-shadow:0 0 0 1px var(--line)}
.kv{display:grid;grid-template-columns:120px minmax(0,1fr);column-gap:16px;row-gap:8px;align-items:baseline}
.blk{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:16px;background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--lift)}
.blk .demo{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:16px;background:var(--bg);border-radius:var(--r-md);min-width:0}
.blk h3{margin:0}
.blk .pat{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.blk dl{margin:0;display:grid;grid-template-columns:56px minmax(0,1fr);column-gap:12px;row-gap:4px;font-size:12px;line-height:16px}
.blk dt{color:var(--ink-3)}
.blk dd{margin:0;color:var(--ink-2)}
/* build.py's field .alert and states.py's .band.alert share a class name; only this sheet loads both. Undo the field alert's box on the band. */
.band.alert{display:block;min-height:0;padding:0;gap:0}
"""
helmet = helmet.replace("</style>", card_rules + b_extra + s_extra + SHEET + p_extra + q_extra + "</style>")
ROOT = helmet[helmet.index(":root{"): helmet.index("}", helmet.index(":root{")) + 1]
TOK = dict(re.findall(r"(--[\w-]+):([^;}]+)", ROOT))
E = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------- contrast (WCAG 2.x) ----------
def lum(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(fg, bg):
    a, b = lum(TOK[fg]), lum(TOK[bg])
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


# ---------- icons (same paths as build.py / states.py) ----------
def svg(d, sw="1.7", w=16, stroke="currentColor"):
    paths = "".join(f'<path d="{p}"></path>' for p in d.split("|"))
    return f'<svg width="{w}" height="{w}" viewBox="0 0 16 16" fill="none" stroke="{stroke}" stroke-width="{sw}" aria-hidden="true">{paths}</svg>'


CHECK, PENCIL, XX = svg("m3 8.5 3 3 7-7", "2"), svg("M11 2.5 13.5 5 6 12.5H3.5V10z", "1.6"), svg("M4 4l8 8M12 4l-8 8")
CHECK12 = svg("m3 8.5 3 3 7-7", "2.2", 12)
PEN12 = svg("M11 2.5 13.5 5 6 12.5H3.5V10z", "2.2", 12)
SWAP12 = svg("M3 5.5h9.5L10 3M13 10.5H3.5L6 13", "2.2", 12)
UP, DOWN = svg("m4 10 4-4 4 4"), svg("m4 6 4 4 4-4")
SKIP, UNDO = svg("m4 4 4 4-4 4M9 4l4 4-4 4"), svg("M4 6h6a3 3 0 0 1 0 6H7M4 6l3-3M4 6l3 3")
BACK = svg("M10 3 5 8l5 5")
SHIELD = svg("M8 1.8 13 3.8v4c0 3-2.2 5-5 6.2-2.8-1.2-5-3.2-5-6.2v-4z", "1.6")
DOC = svg("M4 1.5h5.5L12.5 4.5v10h-8.5z|M9.5 1.5v3h3", "1.5", 14)
CHEV12 = svg("m6 4 4 4-4 4", "2", 12)
SCHEV = '<svg class="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 4 4 4-4 4"></path></svg>'
SCHEV_OPEN = SCHEV.replace('aria-hidden="true"', 'aria-hidden="true" style="transform: rotate(90deg)"')
TRI = '<svg class="tri" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>'
WARN = svg("M8 2 14.5 13.5h-13z|M8 6.5v3M8 11.3v.2", "1.6")
OK = '<svg class="ok" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8.5 3 3 7-7"></path></svg>'
RETRY = svg("M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3", "1.6")
LOCK = svg("M4.5 7.5h7v6h-7zM6 7.5V5.5a2 2 0 0 1 4 0v2", "1.5", 12)
CLOSE = svg("M4 4l8 8M12 4l-8 8")
RIGHT = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.6" role="img" aria-label="changed to" style="margin-top: 18px"><path d="M3 8h10M9 4l4 4-4 4"></path></svg>'
DARROW = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.6" role="img" aria-label="changed to" style="margin-left: 16px"><path d="M8 3v10M4 9l4 4 4-4"></path></svg>'
G_ATTN, G_DONE, G_PEND = ('<span class="g g-attn" aria-hidden="true"></span>', '<span class="g g-done" aria-hidden="true"></span>',
                          '<span class="g g-pend" aria-hidden="true"></span>')


def page(title, body, w, h):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>{helmet}</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
'''


# =====================================================================
# Token sheet
# =====================================================================
COLOURS = [
    ("Ground", "Surfaces, from back to front.", [
        ("--bg", "Page ground", "Panes, list, document panel, hover on secondary buttons"),
        ("--surface", "Raised surface", "Header, open field, cards, inputs, value box (not decided)"),
        ("--subtle", "Quiet fill", "Hover, segment track, grey tags, “Not decided” pill, skeleton"),
    ]),
    ("Lines", "Few borders; whitespace first.", [
        ("--line", "Divider", "Pane edges, card edges, details rules"),
        ("--line-strong", "Control edge", "Value box, secondary button, input, sheet grabber"),
    ]),
    ("Ink", "Blue-navy text, three steps.", [
        ("--ink", "Primary text", "Names, values, headlines"),
        ("--ink-2", "Secondary text", "Sentences, agent line, icon buttons"),
        ("--ink-3", "Tertiary text", "Labels, counts, meta, grey ring glyph"),
    ]),
    ("Action · press this", "Solid blue fill only for the action you take.", [
        ("--primary", "Primary action", "Accept, Use new, Complete review, Try again"),
        ("--primary-hover", "Primary hover", "Hover on the primary button"),
        ("--on-primary", "Text on primary", "Label and icon on the primary button"),
    ]),
    ("You · this is yours", "Tint plus solid border for what you decided; never a solid fill for a state.", [
        ("--you", "Your value", "Your values, your pill text, ✓ glyph, progress"),
        ("--on-you", "Mark on you", "The ✓ inside the blue circle"),
        ("--you-tint", "Your fill", "Value box and pill after your decision, “Reviewed” chip"),
        ("--you-line", "Your edge", "Border of your value box and pill"),
        ("--you-hover", "Unused", "Defined in :root, no rule uses it. Keep or drop at build."),
    ]),
    ("Needs you", "Orange only for “needs you” and real errors.", [
        ("--attn", "Needs you", "! glyph, orange tags and counts, alert text, “not found” notes"),
        ("--attn-tint", "Needs-you fill", "Orange tags, alert line, save-failed alert"),
        ("--attn-line", "Needs-you edge", "Border of the alert line and save-failed alert"),
    ]),
    ("Evidence and focus", "", [
        ("--cite", "Cited text", "Highlight of the cited text in the document"),
        ("--focus", "Focus ring", "2 px ring, 2 px offset, on everything focusable"),
    ]),
]

PAIRS = [("--ink", "--bg"), ("--ink-2", "--bg"), ("--ink-3", "--bg"), ("--ink-3", "--surface"), ("--ink-3", "--subtle"),
         ("--ink-2", "--subtle"), ("--attn", "--attn-tint"), ("--attn", "--surface"), ("--you", "--you-tint"),
         ("--you", "--surface"), ("--on-primary", "--primary"), ("--ink", "--cite")]


def swatch(name, meaning, use):
    dim = ' style="opacity: .5"' if meaning == "Unused" else ""
    return (f'<div class="sw"{dim}><span class="chip-c" style="background: var({name})"></span>'
            f'<div style="min-width: 0"><div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap">'
            f'<span class="t-base" style="font-weight: 600">{meaning}</span><span class="mono t-sm ink-2">{name}</span>'
            f'<span class="mono t-xs ink-3">{TOK[name]}</span></div><div class="t-sm ink-3">{use}</div></div></div>')


def colour_section():
    groups = []
    for title, note, items in COLOURS:
        rows = "".join(swatch(*i) for i in items)
        n = f'<p class="t-sm ink-2" style="margin: 0">{note}</p>' if note else ""
        groups.append(f'<div class="grp"><div style="display: flex; flex-direction: column; gap: 4px"><h3 class="eyebrow ink-3" style="margin: 0">{title}</h3>{n}</div>{rows}</div>')
    pairs = []
    for fg, bg in PAIRS:
        r = ratio(fg, bg)
        verdict = '<span class="tag plain">AA</span>' if r >= 4.5 else '<span class="tag attn">below 4.5</span>'
        pairs.append(f'<div style="display: flex; align-items: center; gap: 12px; height: 36px; padding: 0 12px; border-radius: var(--r-md); background: var({bg}); color: var({fg})">'
                     f'<span class="t-base" style="font-weight: 600; flex: 1">Aa</span><span class="mono t-xs">{fg} on {bg}</span>'
                     f'<span class="mono t-sm" style="font-weight: 500">{r:.1f}:1</span>{verdict}</div>')
    derived = f'''<div class="grp"><h3 class="eyebrow ink-3" style="margin: 0">Derived, in use</h3>
<div class="kv t-sm">
<span class="mono ink-2">--lift</span><span class="ink-2">Raised surface: document paper, active segment, tooltip, sheet, frames. <span class="mono ink-3">0 1px 3px ink 8% + 1px --line ring</span></span>
<span class="mono ink-2">selected row</span><span class="ink-2">Inline in <span class="mono">.row.is-sel</span>: <span class="mono ink-3">0 1px 3px ink 10% + 1.5px --ink ring</span>. Candidate token <span class="mono">--lift-sel</span>, same value.</span>
<span class="mono ink-2">scrim</span><span class="ink-2">Behind the bottom sheet: <span class="mono ink-3">--ink at 40%</span>.</span>
<span class="mono ink-2">--primary = --you</span><span class="ink-2">Same blue, two meanings: fill = press this, tint + border = yours. Keep both names so the rule reads in code.</span>
</div></div>'''
    return f'''<section style="display: flex; flex-direction: column; gap: 16px">
<h2 class="serif t-xl" style="margin: 0">Colour, named by meaning</h2>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start">{"".join(groups)}{derived}</div>
<div class="grp"><div style="display: flex; flex-direction: column; gap: 4px"><h3 class="eyebrow ink-3" style="margin: 0">Text contrast, as used</h3><p class="t-sm ink-2" style="margin: 0">WCAG ratio for each text-on-ground pair the frames draw. AA body text needs 4.5:1.</p></div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">{"".join(pairs)}</div></div>
</section>'''


TYPE = [
    ("t-2xl", "28 / 34", "Not used on screens yet (in the CSS)", "Sans", '<span class="t-2xl">CLM-2026-004817</span>'),
    ("t-xl", "22 / 28", "Serif: whole-screen messages, board titles", "Serif", '<span class="serif t-xl">Can\'t reach the server</span>'),
    ("v-num", "22 / 28", "Mono: money, date, time, number, yes/no values; their input", "Mono 500", '<span class="mono t-xl" style="font-weight: 500">€ 4,415.30</span>'),
    ("t-lg", "18 / 24", "Serif: open field name, state headlines", "Serif", '<span class="serif t-lg">Total incl. VAT</span>'),
    ("v-text", "18 / 24", "Mono: text values (up to 2 lines); their input", "Mono 500", '<span class="mono t-lg" style="font-weight: 500">GH-219-B</span>'),
    ("t-md", "14 / 20", "Claim ID in header; long-text values (Inter, 4 lines); message text; phone row value", "Sans", '<span class="t-md">Page 2 adds supplements of € 669.01 excl. VAT; the page 1 figure was an estimate.</span>'),
    ("t-base", "13 / 18", "Body: buttons, details summaries, claimant line", "Sans 600", '<span class="t-base" style="font-weight: 600">Why it changed</span>'),
    ("t-sm", "12 / 16", "Meta: agent line, pills, chips, step notes; mono for row values, quotes, document", "Sans / Mono", '<span class="t-sm ink-2">Agent · changed 10:07 · High 95%</span>'),
    ("t-xs", "11 / 14", "Row labels, tags, counts, kbd, eyebrow (mono, uppercase, .12em)", "Mono 500", '<span class="eyebrow ink-3">Repair costs</span><span class="tag attn">Low 38%</span>'),
]


def type_section():
    rows = "".join(
        f'<div style="display: grid; grid-template-columns: 96px 72px minmax(0, 1fr) 360px; column-gap: 16px; align-items: center; padding: 12px 0; border-top: 1px solid var(--line)">'
        f'<span class="mono t-sm ink-2">.{n}</span><span class="mono t-sm ink-3">{s}</span><div style="min-width: 0; display: flex; gap: 8px; align-items: center">{sample}</div><span class="t-sm ink-3">{use}</span></div>'
        for n, s, use, _, sample in TYPE)
    fonts = '''<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px">
<div class="grp"><span class="serif t-xl">Source Serif 4</span><span class="t-sm ink-2">600, −0.01em. The open field's name and state headlines. Nothing else.</span></div>
<div class="grp"><span class="t-xl" style="font-weight: 600">Inter</span><span class="t-sm ink-2">400 / 500 / 600. Sentences, buttons, labels, long text. Tabular numbers on.</span></div>
<div class="grp"><span class="mono t-xl" style="font-weight: 500">JetBrains Mono</span><span class="t-sm ink-2">400 / 500. Values, amounts, IDs, scores, citations, the document, tags, uppercase section labels. No ligatures. Never running text.</span></div>
</div>'''
    return f'''<section style="display: flex; flex-direction: column; gap: 16px">
<h2 class="serif t-xl" style="margin: 0">Type</h2>
{fonts}
<div class="grp" style="gap: 0"><div style="display: grid; grid-template-columns: 96px 72px minmax(0, 1fr) 360px; column-gap: 16px; padding-bottom: 8px"><span class="eyebrow ink-3">Class</span><span class="eyebrow ink-3">Size / line</span><span class="eyebrow ink-3">Sample</span><span class="eyebrow ink-3">Used for</span></div>{rows}
<p class="t-sm ink-3" style="margin: 12px 0 0">Seven sizes: 11, 12, 13, 14, 18, 22, 28. Weights 400, 500, 600 (Inter 700 is loaded but unused). Value size follows the field's type, never its length.</p></div>
</section>'''


SPACE = [(2, "Segment track inset, icon gaps"), (4, "Tag gaps, phone header, tight stacks"), (6, "Icon to label in buttons, chips, pills, tags"),
         (8, "Button gaps, row inset, between pills and text"), (12, "Field card stack, row → pane edge, list top"),
         (16, "Pane padding, phone gutter, document inset"), (24, "Open field padding (laptop), details indent"),
         (32, "Board sections"), (40, "Board margins, frame gaps"), (48, "Board columns")]
OFF = [("10", "Row glyph → text, chip / pill / source padding, progress → count. Fold into 8 or 12 at build?"),
       ("20", "Document paper inset, agent-step line left inset. Fold into 16 or 24?"),
       ("3", "kbd side padding"), ("30 / 42", "Text indents that line up under a glyph or chevron (derived, not a step)")]


def space_section():
    bars = "".join(f'<div style="display: grid; grid-template-columns: 48px 56px minmax(0, 1fr); column-gap: 12px; align-items: center; min-height: 28px; padding: 2px 0">'
                   f'<span class="mono t-sm ink-2">{v}</span><span style="width: {v}px; height: 12px; border-radius: var(--r-sm); background: var(--ink-3)"></span><span class="t-sm ink-3">{u}</span></div>' for v, u in SPACE)
    off = "".join(f'<span class="mono ink-2">{v}</span><span class="ink-3">{u}</span>' for v, u in OFF)
    return f'''<div class="grp"><h2 class="serif t-xl" style="margin: 0">Spacing</h2>
<div style="display: flex; flex-direction: column">{bars}</div>
<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line)"><h3 class="eyebrow ink-3" style="margin: 0">In use, off the scale</h3><div class="kv t-sm">{off}</div></div></div>'''


def radius_section():
    items = [("--r-sm", "Tags, kbd, active segment, skeleton bars"), ("--r-md", "Buttons, icon buttons, value box, input, rows, quote card, document paper, alerts"),
             ("--r-lg", "Cards, frames, bottom sheet (top corners)"), ("--r-full", "Pills, chips, status glyphs, progress, live dot, grabber")]
    rows = "".join(f'<div style="display: grid; grid-template-columns: 56px 96px minmax(0, 1fr); column-gap: 12px; align-items: center">'
                   f'<span style="width: 48px; height: 32px; border-radius: var({n}); background: var(--you-tint); border: 1.5px solid var(--you-line); box-sizing: border-box"></span>'
                   f'<span class="mono t-sm ink-2">{n} {TOK[n]}</span><span class="t-sm ink-3">{u}</span></div>' for n, u in items)
    return f'''<div class="grp"><h2 class="serif t-xl" style="margin: 0">Radius</h2>{rows}<p class="t-sm ink-3" style="margin: 0">Inside a glyph or the citation mark: 1–2 px, not a token.</p></div>'''


SIZES = [("20", "Tag"), ("22", "Decision pill"), ("24", "Status chip"), ("28", "Segment button, “+ N more” (laptop)"), ("32", "Icon button, section header (laptop)"),
         ("36", "Button, agent-step line, skip / undo (laptop)"), ("40", "Field row, details summary (laptop)"), ("44", "Phone: every control (touch target)"),
         ("48", "Pane top bar (laptop); phone bottom action bar, details summary"), ("52", "Value box and input; field row (phone)"), ("56", "Claim header, phone header")]


def size_section():
    rows = "".join(f'<div style="display: grid; grid-template-columns: 48px minmax(0, 1fr); column-gap: 12px; align-items: center; min-height: 24px; padding: 2px 0"><span class="mono t-sm ink-2">{v}</span><span class="t-sm ink-3">{u}</span></div>' for v, u in SIZES)
    lines = '''<div class="kv t-sm"><span class="mono ink-2">1 px</span><span class="ink-3">Dividers (--line), secondary button and pill edges</span>
<span class="mono ink-2">1.5 px</span><span class="ink-3">Value box, input, grey ring glyph, selected row ring</span>
<span class="mono ink-2">2 px</span><span class="ink-3">Focus ring (--focus), 2 px offset</span></div>'''
    motion = '''<div class="kv t-sm"><span class="mono ink-2">1.6 s</span><span class="ink-3">Live dot pulse, skeleton shimmer</span>
<span class="mono ink-2">0.8 s</span><span class="ink-3">Spinner (reconnecting, agent reading)</span>
<span class="mono ink-2">0.15 s</span><span class="ink-3">Chevron turn on open</span>
<span class="mono ink-2">reduced</span><span class="ink-3">All of the above stop under prefers-reduced-motion</span></div>'''
    return f'''<div class="grp"><h2 class="serif t-xl" style="margin: 0">Heights</h2><div>{rows}</div>
<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line)"><h3 class="eyebrow ink-3" style="margin: 0">Strokes</h3>{lines}</div>
<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line)"><h3 class="eyebrow ink-3" style="margin: 0">Motion</h3>{motion}</div></div>'''


W_TOK = 1280
body_t = f'''<div class="app sheet" style="width: {W_TOK}px; height: {H_TOK}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 40px; background: var(--bg)">
<div style="display: flex; flex-direction: column; gap: 8px"><div class="eyebrow ink-3">Tokens · round 2</div><p class="t-md ink-2" style="margin: 0; max-width: 900px">Every value the Current design frames use, and nothing else. Colours are named by what they mean, not how they look. No raw hex or one-off values outside this sheet.</p></div>
{colour_section()}
{type_section()}
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start">{space_section()}{radius_section()}{size_section()}</div>
</div>'''

# =====================================================================
# Building blocks
# =====================================================================


def blk(name, pattern, demo, states, a11y, used, demo_style=""):
    ds = f' style="{demo_style}"' if demo_style else ""
    return (f'<article class="blk"><div class="demo"{ds}>{demo}</div>'
            f'<div style="display: flex; flex-direction: column; gap: 8px"><div class="pat"><h3 class="serif t-lg">{name}</h3><span class="t-sm ink-3">→</span><span class="tag plain">{pattern}</span></div>'
            f'<dl><dt>States</dt><dd>{states}</dd><dt>Access</dt><dd>{a11y}</dd><dt>Used in</dt><dd class="mono" style="font-size: 11px">{used}</dd></dl></div></article>')


def btn(label, icon="", primary=False, extra=""):
    return f'<button class="btn{" btn-primary" if primary else ""}"{extra}>{icon}{label}</button>'


def ib(icon, label, style=""):
    st = f' style="{style}"' if style else ""
    return f'<button class="ib" aria-label="{label}" title="{label}"{st}>{icon}</button>'


def prog(n, m, w="96px"):
    pct = round(100 * n / m)
    return (f'<div style="display: flex; align-items: center; gap: 10px"><div role="progressbar" aria-label="Fields decided" aria-valuemin="0" aria-valuemax="{m}" aria-valuenow="{n}" style="width: {w}; height: 4px; border-radius: var(--r-full); background: var(--subtle); overflow: hidden"><div style="width: {pct}%; height: 100%; background: var(--you)"></div></div>'
            f'<span class="t-sm ink-2" style="white-space: nowrap"><strong class="mono" style="color: var(--you); font-weight: 600">{n}</strong> of {m} decided</span></div>')


def row(n, v, g, tag="", tagcls="attn", cls=""):
    t = f'<span class="tag {tagcls}">{tag}</span>' if tag else "<span></span>"
    return f'<button class="row {cls}" style="width: 100%; margin: 0"><span class="g {g}" aria-hidden="true"></span><span style="min-width: 0"><span class="l">{n}</span><span class="v">{v}</span></span>{t}</button>'


def mini_pane(label, flex, bg="var(--bg)", edge=""):
    return f'<div style="flex: {flex}; height: 96px; background: {bg}; {edge} display: flex; align-items: flex-start; padding: 8px; box-sizing: border-box"><span class="eyebrow ink-3">{label}</span></div>'


L = "G-laptop"
GROUPS = []

GROUPS.append(("Screen", [
    blk("Three-pane review screen", "List-detail + side panel",
        '<div style="flex: 1; display: flex; flex-direction: column; border-radius: var(--r-md); overflow: hidden; box-shadow: var(--lift)">'
        '<div style="height: 20px; background: var(--surface); border-bottom: 1px solid var(--line)"></div>'
        '<div style="display: flex">' + mini_pane("List 320", "0 0 30%", edge="border-right: 1px solid var(--line);") + mini_pane("Open field", "1", "var(--surface)") + mini_pane("Document 400", "0 0 34%", edge="border-left: 1px solid var(--line);") + '</div></div>',
        "Fills 1280 × 800; list, open field and document each scroll on their own. Nothing moves while the run is live.",
        "Landmarks: nav “Fields”, main (the field), aside “Source document”.", "G-laptop, G-states-laptop, G-doc-laptop"),
    blk("Phone list → field", "Push navigation + pager",
        '<div style="display: flex; gap: 12px; align-items: center"><div style="width: 72px; height: 120px; border-radius: var(--r-md); background: var(--bg); box-shadow: var(--lift); display: flex; flex-direction: column; gap: 4px; padding: 8px; box-sizing: border-box"><span class="sk" style="height: 6px; animation: none"></span><span class="sk" style="height: 6px; animation: none"></span><span class="sk" style="height: 6px; animation: none"></span></div>'
        f'{svg("M3 8h10M9 4l4 4-4 4", "1.6", 16, "var(--ink-3)")}'
        '<div style="width: 72px; height: 120px; border-radius: var(--r-md); background: var(--surface); box-shadow: var(--lift); display: flex; flex-direction: column; justify-content: space-between; padding: 8px; box-sizing: border-box"><span class="sk" style="height: 12px; animation: none"></span><span style="height: 12px; border-radius: var(--r-sm); background: var(--primary)"></span></div></div>',
        "The list is the main screen. A row opens the field full screen with back, previous / next and a bottom action bar.",
        "Back is a link; previous / next are icon buttons with labels.", "G-phone-list, G-phone-detail, G-board-phone"),
    blk("Claim header", "App bar",
        f'<div style="flex: 1; display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 12px 0 4px; background: var(--surface); border-radius: var(--r-md)">{ib(BACK, "Back to queue")}<span class="mono t-md" style="font-weight: 500">CLM-2026-004817</span><span class="chip"><span class="dot"></span>Running</span><span style="flex: 1"></span>{prog(5, 41, "48px")}</div>',
        "One line: back, claim ID, claimant, run chip, current step, progress, Complete review. Phone: two lines, progress and Complete in the footer.",
        "Claim ID is the h1.", "G-laptop, G-phone-list, G-states-bar"),
    blk("Phone bottom action bar", "Sticky bottom bar",
        f'<div class="phone" style="flex: 1"><div class="pf c3t" style="background: var(--surface); border-radius: var(--r-md); border-top: 0">{btn("Accept", CHECK, True)}{btn("Correct", PENCIL)}{btn("Reject", XX)}{ib(SKIP, "Skip for now", "width: 48px; height: 48px; border: 1px solid var(--line)")}</div></div>',
        "3 decisions + skip; after a decision 2 + undo; after a revision Use new / Keep mine. 48 px, thumb reach.",
        "Same buttons and labels as laptop; no key hints.", "G-phone-detail, G-board-phone"),
]))

GROUPS.append(("Status and progress", [
    blk("Run status chip", "Status badge",
        f'<span class="chip">Queued</span><span class="chip"><span class="dot"></span>Running</span><span class="chip">Needs review</span><span class="chip attn">{TRI}Run failed</span><span class="chip you"><span class="g g-done g-sm" aria-hidden="true"></span>Reviewed</span>',
        "Queued · Running (live dot) · Needs review · Run failed (triangle: a real error) · Reviewed (blue ✓). Never clickable.",
        "Text carries the state; dot and icons are decorative.", "G-laptop, G-states-bar, G-states-laptop"),
    blk("Progress", "Determinate progress bar", prog(5, 41) + prog(41, 41),
        "Blue fill = your decisions out of fields to decide. Count beside it in mono.",
        "role=progressbar with min, max and now.", "G-laptop, G-phone-list, G-states-bar"),
    blk("Complete review", "Primary action, disabled with reason",
        '<span style="position: relative; display: inline-flex"><button class="btn btn-primary is-focus" aria-disabled="true" aria-describedby="why-blk">Complete review · 36 left</button></span>'
        '<div class="tip" role="tooltip" id="why-blk" style="position: static">36 fields still need a decision</div>' + btn("Complete review", "", True),
        "Blocked: grey, says what is left (“36 left”, “agent working”). Ready: solid blue.",
        "aria-disabled, not disabled, so it stays focusable and the reason is read (aria-describedby).", "G-states-bar, G-states-laptop"),
    blk("Tooltip", "Tooltip (hover and focus)",
        '<div class="tip" role="tooltip" style="position: static">Available when the agent has finished</div>',
        "Shows on hover and keyboard focus (.tw wrapper); one short sentence. Also the title on icon buttons.",
        "role=tooltip, linked by aria-describedby.", "G-states-bar"),
    blk("Agent step line", "Disclosure (one line)",
        f'<details class="band" style="flex: 1; min-width: 0; border-radius: var(--r-md); border-bottom: 0"><summary>{G_ATTN}<span class="t-sm" style="font-weight: 600; white-space: nowrap">Read claimant statement</span><span class="t-sm ink-2" style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">Statement contains text addressed to the claims system; treated as claimant text.</span><span class="meta">Agent steps 5 of 6</span>{CHEV12}</summary></details>',
        "Collapsed: the latest note in one line. Open: the step list. Notes and warnings use the orange !.",
        "summary is the toggle; Enter / Space opens.", "G-laptop, G-states-bar, G-phone-list"),
    blk("Run failed line", "Inline alert banner",
        f'<div class="band alert" role="alert" style="flex: 1; min-width: 0; border-radius: var(--r-md); border: 1px solid var(--attn-line)"><summary>{TRI}<span class="t-sm" style="font-weight: 600; white-space: nowrap; color: var(--attn)">Look up policy failed</span><span class="t-sm" style="flex: 1; min-width: 0; color: var(--attn); white-space: nowrap; overflow: hidden; text-overflow: ellipsis">The policy service did not respond within 10 seconds. Not checked: policy cover and excess.</span><button class="btn" style="height: 32px">{RETRY}Retry run</button></summary></div>',
        "Replaces the step line when a step fails; says what was not checked. Fields already found stay reviewable.",
        "role=alert; Retry is a real button.", "G-states-bar, G-states-laptop"),
    blk("Agent steps", "Read-only ordered list",
        f'<ol class="steps" aria-label="Agent steps" style="flex: 1; padding: 0"><li>{OK}<span class="lab dim">Read repair invoice, page 2</span><span class="note"></span></li><li>{G_ATTN}<span class="lab">Read claimant statement</span><span class="note">Statement contains text addressed to the claims system; treated as claimant text.</span></li><li><span class="dot" style="margin: 4px"></span><span class="lab">Look up policy</span><span class="note"></span></li></ol>',
        "Done (grey ✓) · note (orange !) · running (live dot) · failed (triangle).",
        "ol with a label; marks are decorative, text names the step.", "G-states-bar"),
    blk("Reconnecting", "Inline busy status",
        '<span class="t-sm ink-3" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap"><span class="spin" aria-hidden="true"></span>Reconnecting…</span>',
        "Sits in the header beside the run chip. Last known state stays on screen; no modal, no duplicates on catch-up.",
        "Polite live region for the text.", "G-states-bar"),
]))

GROUPS.append(("Field list", [
    blk("Filter", "Segmented control",
        f'<div class="seg" role="group" aria-label="Show fields" style="flex: 1"><button aria-pressed="true">{G_ATTN}Needs you <span class="n">7</span></button><button aria-pressed="false">To review <span class="n">36</span></button><button aria-pressed="false">All <span class="n">41</span></button></div>',
        "Needs you · To review · All, each with a count. One is pressed. Filters the list; never re-sorts it.",
        "Toggle buttons with aria-pressed in a labelled group.", "G-laptop, G-phone-list"),
    blk("Section", "Accordion, problems pinned",
        f'<div style="flex: 1"><button class="sec" aria-expanded="false" style="margin: 0">{SCHEV}<span style="flex: 1">Repair costs</span><span class="cnt" style="display: inline-flex; align-items: center; gap: 4px; color: var(--attn)"><span class="g g-attn g-sm" aria-hidden="true"></span>2</span><span class="cnt">0/14</span></button>'
        f'{row("Total incl. VAT", "€ 4,415.30", "g-attn", "Changed after you")}</div>',
        "Collapsed still shows its problem rows and the open row; the header count says what is left (no “+ N more” line). Count: decided / total; orange count = needs you. Live: “Reading” dot. Summary row open: ink (aria-current).",
        "Header is a button with aria-expanded.", "G-laptop, G-phone-list"),
    blk("Field row", "Selectable list row",
        '<div style="flex: 1; display: flex; flex-direction: column; gap: 2px">'
        + row("Policyholder name", "Sanne de Vries", "g-pend", cls="is-hover")
        + row("Third-party registration", "GH-219-B", "g-attn", "Low 38%", cls="is-sel")
        + row("Third-party driver", "Unknown", "g-done", "Replaced", "you", "mine")
        + row("Third-party policy number", "Not found", "g-attn", "Empty", "attn", "empty") + '</div>',
        "Rest · hover · selected (ink ring) · focus · yours (blue value) · empty (italic) · locked (read-only) · arrives (fades in .4 s, off under reduced motion). No decide buttons on rows.",
        "Button; aria-current on the open one; aria-label says name, value, state, tag. J / K move.", "G-laptop, G-board-rows, G-phone-list, G-proto-*"),
    blk("Status glyph", "Status icon",
        f'<span style="display: inline-flex; align-items: center; gap: 6px" class="t-sm ink-2">{G_PEND}Not decided</span><span style="display: inline-flex; align-items: center; gap: 6px" class="t-sm ink-2">{G_DONE}Yours</span><span style="display: inline-flex; align-items: center; gap: 6px" class="t-sm ink-2">{G_ATTN}Needs you</span>',
        "One circle family: grey ring, blue ✓, orange !. Shape carries the meaning, colour repeats it. Triangle only for real errors.",
        "aria-hidden; the row's label says the state.", "all list frames"),
    blk("Tag", "Label badge (static)",
        '<span class="tag attn">Changed after you</span><span class="tag attn">Low 38%</span><span class="tag attn">Empty</span><span class="tag attn">Not in source</span><span class="tag attn">Blocks sign-off</span><span class="tag plain">Low 41%</span><span class="tag you">Replaced</span><span class="tag draft">AI draft · not verified</span>',
        "Orange = still needs you. Grey = a problem you already decided, or +1. Blue = Replaced. AI draft on the summary. No glyph inside tags.",
        "Plain text; never the only carrier of an action.", "G-laptop, G-board-rows, G-board-laptop"),
]))

GROUPS.append(("Open field", [
    blk("Field card", "Detail view",
        f'<section class="card" style="flex: 1"><div class="top"><span class="t-sm ink-3" style="flex: 1">Parties</span>{ib(UP, "Previous field (K)")}{ib(DOWN, "Next field (J)")}</div>'
        f'<div class="body" style="padding: 16px 24px"><div class="head"><h2 class="serif t-lg">Witness name</h2></div><div class="field open v-text"><span class="val">R. Bakker</span></div>'
        f'<div class="facts"><span class="pill open">Not decided</span><span>Agent · found 10:06 · High 93%</span></div></div></section>',
        "Name with problem tags → value box → pill and agent line → actions → details. Same layout in every state.",
        "section labelled by the field name; name is h2.", "G-card-field, G-board-laptop, G-board-phone"),
    blk("Value box", "Read-only value display",
        '<div style="flex: 1; display: flex; flex-direction: column; gap: 8px"><div class="field open v-num"><span class="val">€ 4,415.30</span></div><div class="field yours v-text"><span class="val">Unknown</span></div><div class="field open old v-text"><span class="val">M. Jansen</span></div></div>',
        "Not decided (white, grey edge) · yours (blue tint) · agent's earlier value (greyed) · empty (italic “Not found in documents”). Size by type: 22 / 18 mono, long text Inter 14 × 4 lines + Show all (expands in place, then Show less).",
        "Value is text, never a link.", "G-laptop, G-board-laptop, G-board-phone"),
    blk("Before → after", "Compare view",
        f'<div class="two" style="flex: 1"><div class="col"><div class="field yours v-num"><span class="val">€ 3,605.80</span></div><span class="pill yours">{CHECK12}You · accepted 10:06</span></div>{RIGHT}'
        f'<div class="col"><div class="field open v-num"><span class="val">€ 4,415.30</span></div><div class="facts"><span class="pill open">Not decided</span></div></div></div>',
        "Side by side for money, dates, times, numbers, yes/no; stacked with ↓ for text. Yours left / top, the agent's new value right / bottom.",
        "Arrow has role=img “changed to”.", "G-laptop, G-board-laptop, G-doc-laptop"),
    blk("Decision pill", "Status badge (decision)",
        f'<span class="pill open">Not decided</span><span class="pill yours">{CHECK12}You · accepted 10:06</span><span class="pill yours">{PEN12}You · corrected 10:06</span><span class="pill yours">{SWAP12}You · replaced 10:06</span>',
        "Grey “Not decided”, or blue with its own icon (✓ ✎ ⇄) and time. Shows only the decision; who / when of the agent is grey text.",
        "Text names the decision; icon decorative.", "G-card-field, G-board-laptop"),
    blk("Agent line", "Metadata line",
        '<div class="facts"><span>Agent · changed 10:07 · High 95%</span></div><div class="facts"><span>Agent · found 10:06 · Medium 84%</span></div>',
        "Who, when, confidence, as grey text after the pill. Low confidence moves to an orange tag by the name.",
        "Plain text.", "G-laptop, G-board-laptop"),
    blk("Decision buttons", "Button group: primary + secondary",
        btn("Accept", CHECK, True, ' title="Accept · A"') + btn("Correct", PENCIL, extra=' title="Correct · C"') + btn("Reject", XX, extra=' title="Reject and enter your own value · R"')
        + '<span style="flex-basis: 100%"></span>' + btn("Use new", CHECK, True) + btn("Keep mine", SHIELD) + '<span class="t-sm ink-3">after a revision</span>',
        "Icon + one word. One primary per card. After a decision Accept goes; Correct and Reject stay. Revision: Use new / Keep mine. No accept-all anywhere.",
        "Keys A / C / R; title shows the key.", "G-card-field, G-board-laptop, G-laptop"),
    blk("Icon button", "Icon button + tooltip",
        ib(UP, "Previous field (K)") + ib(DOWN, "Next field (J)") + ib(SKIP, "Skip for now (S)", "width: 36px; height: 36px") + ib(UNDO, "Undo your decision (U)", "width: 36px; height: 36px") + ib(BACK, "Back to queue") + ib(CLOSE, "Close document"),
        "Navigation, skip, undo, back, close. Rest · hover (quiet fill) · focus ring. 32 / 36 laptop, 44 / 48 phone.",
        "aria-label and title on every one.", "all frames"),
    blk("Correct / Reject input", "Inline edit form",
        '<div style="flex: 1; display: flex; flex-direction: column; gap: 12px"><div class="inp"><label for="blk-v">Your value</label><input id="blk-v" class="is-focus" value="€ 4,415.30"></div>'
        '<div class="inp"><label for="blk-r">Reason</label><input id="blk-r" class="reason" value="" placeholder="One line"></div></div>',
        "Same size as the value it replaces. Correct starts filled; Reject starts empty and adds a one-line reason.",
        "Visible label per input; Enter saves, Esc cancels.", "G-board-laptop, G-board-phone"),
    blk("Details", "Disclosure, closed by default",
        f'<div style="flex: 1; background: var(--surface); border-radius: var(--r-md); overflow: hidden"><details class="dis" open="open" style="border-top: 0"><summary>{SCHEV}Why it changed</summary><p class="t-base ink-2" style="margin: 0; padding: 0 24px 16px 42px">Page 2 adds supplements of € 669.01 excl. VAT; the page 1 figure was an estimate.</p></details>'
        f'<details class="dis"><summary>{SCHEV}History<span class="t-sm ink-3" style="font-weight: 500">2 versions</span></summary></details></div>',
        "Why it changed · Your reason · History (only with more than one version). Open by default only when it matters for this field.",
        "details / summary.", "G-laptop, G-card-field, G-board-laptop"),
    blk("Keyboard hints", "Shortcut legend",
        '<div class="t-xs ink-3" style="display: flex; gap: 16px"><span><kbd>J</kbd> <kbd>K</kbd> move</span><span><kbd>A</kbd> <kbd>C</kbd> <kbd>R</kbd> decide</span><span><kbd>S</kbd> skip</span><span><kbd>U</kbd> undo</span></div>',
        "Laptop only, at the foot of the open field.", "Keys act on the open field only, never while typing.", "G-laptop"),
    blk("Save failed", "Inline error + retry (rollback)",
        f'<div class="alert" role="alert" style="flex: 1">{WARN}<span style="flex: 1">Couldn\'t save. Try again</span><button class="btn">Try again</button></div>',
        "A decision shows at once; if the save fails the field goes back to how it was and this appears. Refused save: “Decide again” tag.",
        "role=alert; focus stays on the field.", "G-board-laptop, G-board-phone, G-states-laptop"),
    blk("Read-only note", "Read-only notice",
        f'<div class="ro">{LOCK}Read-only · review completed 15:06</div>',
        "After Complete review: no actions, values stay, this line replaces the buttons.", "Plain text; actions removed, not disabled.", "G-states-laptop, G-board-laptop"),
]))

DOC_TEXT = ("Payment within 30 days.\n<mark>Total incl. VAT: € 4,415.30</mark>\nPage 2 of 2")
GROUPS.append(("Evidence", [
    blk("Document panel", "Persistent side panel",
        f'<div style="flex: 1; background: var(--bg); border-radius: var(--r-md); box-shadow: 0 0 0 1px var(--line); overflow: hidden"><div style="height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 16px; border-bottom: 1px solid var(--line)">{DOC}<span class="t-base" style="flex: 1; font-weight: 600">Repair invoice, Autoherstel Oost</span><span class="t-sm ink-3">Page 2 of 2</span></div>'
        f'<div style="padding: 16px"><div class="mono t-sm" style="padding: 16px 20px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--lift); color: var(--ink-2); white-space: pre-line">{DOC_TEXT}</div></div></div>',
        "Always shown on laptop; follows the open field and scrolls to its cited text. No hide / show.",
        "aside “Source document”; document text rendered as text.", "G-laptop, G-doc-laptop"),
    blk("Citation highlight", "Text highlight",
        '<span class="quote">Name: <mark>R. Bakker</mark>, cyclist, travelling north</span>',
        "Yellow mark on the cited text only. Document text addressed to the system is shown as plain document text, never acted on.",
        "mark element.", "G-doc-laptop, G-doc-phone"),
    blk("Evidence note", "Inline note",
        '<div style="display: flex; flex-direction: column; gap: 4px"><p class="notein">€ 1,252.00 not found in the cited text</p><p class="notein">No source</p><p class="t-sm ink-2" style="margin: 0">The agent cited no document for this value.</p></div>',
        "At the top of the panel or sheet. The card keeps only the orange tag (“Not in source”, “No source”).",
        "Plain text.", "G-doc-laptop, G-doc-phone"),
    blk("Quote card", "Dialog trigger (phone)",
        f'<button class="cite" aria-label="Open the cited text in the document" aria-haspopup="dialog" style="flex: 1"><span class="quote">Registration: GH-219-B (plate partly obscured by damage, read at the scene)</span><span class="t-sm ink-3" style="display: flex; align-items: center; gap: 6px; width: 100%">{DOC}<span style="flex: 1">Police traffic accident report</span>{CHEV12}</span></button>',
        "Under the value on phone. Rest · hover (stronger edge). Tap opens the bottom sheet.",
        "Button with aria-haspopup=dialog.", "G-phone-detail, G-board-phone, G-doc-phone"),
    blk("Bottom sheet", "Modal bottom sheet",
        f'<div style="position: relative; flex: 1; height: 200px; border-radius: var(--r-md); overflow: hidden; background: var(--surface)"><div aria-hidden="true" style="position: absolute; inset: 0; background: var(--ink); opacity: .4"></div>'
        f'<div role="dialog" aria-modal="true" aria-label="Police traffic accident report" style="position: absolute; left: 0; right: 0; bottom: 0; height: 152px; display: flex; flex-direction: column; background: var(--surface); border-radius: var(--r-lg) var(--r-lg) 0 0; box-shadow: var(--lift)">'
        f'<div style="display: flex; justify-content: center; padding-top: 8px"><span style="width: 36px; height: 4px; border-radius: var(--r-full); background: var(--line-strong)"></span></div>'
        f'<div style="display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 4px 0 16px">{DOC}<span class="t-base" style="flex: 1; font-weight: 600">Police traffic accident report</span>{ib(CLOSE, "Close document")}</div>'
        f'<div style="flex: 1; padding: 12px 16px; border-top: 1px solid var(--line); background: var(--bg)"><span class="quote">Name: <mark>R. Bakker</mark>, cyclist, travelling north</span></div></div></div>',
        "Scrim, grabber, title, close; opens scrolled to the cited text, notes at the top. 640 px tall on a 844 phone.",
        "dialog, aria-modal, focus moves in and returns to the quote card; Esc and Close dismiss.", "G-doc-phone"),
]))

GROUPS.append(("Prototype only (round 3)", [
    blk("Replay controls", "Media controls: toggle button + toggle group + slider",
        '<div class="dev" style="flex: 1; border-top: 0; border-radius: var(--r-md)">'
        f'<span class="eyebrow ink-3">Prototype · replay CLM-2026-004817 · 1× · agent times from the fixture</span>'
        f'<button class="ib" aria-label="Play" title="Play" style="border: 1px solid var(--line)">{svg("M5 3.5v9l7-4.5z", "1.6")}</button>{ib(RETRY, "Restart the run from 0 s")}'
        '<div class="seg" role="group" aria-label="Replay speed" style="grid-template-columns: repeat(4, minmax(0, 1fr)); width: 176px"><button aria-pressed="true">1×</button><button aria-pressed="false">2×</button><button aria-pressed="false">5×</button><button aria-pressed="false">10×</button></div>'
        '<input type="range" class="scrub" aria-label="Replay position" min="0" max="102750" step="100" value="80000"><span class="mono t-sm ink-2" style="white-space: nowrap">80.0 s / 102.8 s</span></div>',
        "Outside the screen, under it. Play / pause · restart · speed 1 2 5 10× · scrub (back in time drops decisions made later). Disabled for a run loaded at once.",
        "Labelled buttons and slider; arrow keys move the slider.", "G-proto-laptop, G-proto-phone"),
    blk("State menu", "Menu button + popover list",
        f'<div class="menu" role="menu" style="position: static; width: 100%"><button role="menuitem">Running · 4817 at 80 s</button><button role="menuitem">Failed part-way · 4822</button><button role="menuitem">Refused save · liability</button></div><button class="btn" aria-haspopup="menu" aria-expanded="true">Jump to state{CHEV12}</button>',
        "Opens upward from the replay controls; one item per claim state; picking one closes it and jumps.",
        "Button with aria-haspopup and aria-expanded; items are menuitems.", "G-proto-laptop, G-proto-phone"),
    blk("Summary view", "Read-only text view (streaming)",
        '<div style="flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 16px; background: var(--surface); border-radius: var(--r-md)"><div class="head"><h2 class="serif t-lg">Summary</h2><span class="tag draft">AI draft · not verified</span></div>'
        '<p class="t-md ink-2" style="margin: 0">Rear-end collision on 13 September 2026 at Wibautstraat and Ringdijk, Amsterdam.</p>'
        '<span class="t-sm ink-3" style="display: inline-flex; align-items: center; gap: 6px"><span class="dot"></span>The agent is still writing</span></div>',
        "Opens from the Summary row, below the fields. Markdown from the whole text so far; a lone ** shows until its pair arrives. Failed run: “AI draft · incomplete” plus what was not reached.",
        "Plain text, never a system message; h2 + draft tag.", "G-proto-laptop, G-proto-phone"),
]))

# ---------- round 4: queue, option A (work list) chosen 2026-11-19 ----------
def qpri(p):
    n = {"high": 3, "normal": 2, "low": 1}[p]
    return f'<span class="pri {p}"><span class="bars" aria-hidden="true">' + "".join(f'<i class="{"on" if i < n else ""}"></i>' for i in range(3)) + f'</span>{p.capitalize()}</span>'


Q_NEED = '<span class="need"><span class="g g-attn g-sm" aria-hidden="true"></span>7 need you</span>'
Q_CARD = ('<a href="#" class="qcard" style="flex: 1; background: var(--surface)"><div class="l1"><span class="mono t-md" style="font-weight: 500">CLM-2026-004817</span><span style="flex: 1"></span><span class="chip"><span class="dot"></span>Running</span></div>'
          f'<div class="l2"><span style="flex: 1">Sanne de Vries · Motor</span>{qpri("high")}</div><div class="l3">{Q_NEED}<span class="meta">Confidence <b>—</b></span></div>'
          '<div class="meta">Received 18 Sep, 10:05 · Updated 18 Sep, 10:07</div></a>')
GROUPS.append(("Queue (round 4, option A: work list)", [
    blk("Queue header", "App bar",
        '<header class="qbar" style="flex: 1; border-radius: var(--r-md); border-bottom: 0; padding: 0 16px"><h1 class="serif t-lg">Claims queue</h1><span class="live"><span class="dot"></span>Live</span><span style="flex: 1"></span><span class="t-sm ink-3">4 claims</span></header>',
        "Title, “Live” (rows update without reload), claim count. Same on phone.",
        "Title is the h1; Live is a polite status.", "Q-laptop, Q-phone, Q-states-*"),
    blk("Status and priority filter", "Segmented control, state in the URL",
        '<div class="seg q" role="group" aria-label="Status"><button aria-pressed="true">All <span class="n">4</span></button><button aria-pressed="false">Running <span class="n">1</span></button><button aria-pressed="false">Failed <span class="n">1</span></button></div>'
        '<div class="seg q" role="group" aria-label="Priority"><button aria-pressed="true">All <span class="n">4</span></button><button aria-pressed="false">High <span class="n">1</span></button></div>',
        "Laptop. Status: All · Queued · Running · Needs review · Failed · Reviewed; priority: All · High · Normal · Low. Each count is within the other filter. Combined; written to ?status=&amp;priority=.",
        "Toggle buttons with aria-pressed in labelled groups; back and reload keep the filter.", "Q-laptop, Q-phone, Q-states-*"),
    blk("Filter menu", "Select (menu button + listbox)",
        f'<button class="btn fmenu" aria-haspopup="listbox"><span>Status: <b>All</b></span>{svg("m4 6 4 4 4-4", "2", 12)}</button><button class="btn fmenu" aria-haspopup="listbox"><span>Priority: <b>All</b></span>{svg("m4 6 4 4 4-4", "2", 12)}</button>',
        "Phone. Two half-width buttons, 44 px; the chosen value is bold. Same options and URL as the laptop filter.",
        "Button with aria-haspopup; options are a listbox.", "Q-laptop, Q-phone, Q-states-*"),
    blk("Priority mark", "Badge (shape + word)",
        qpri("high") + qpri("normal") + qpri("low"),
        "Three bars, filled = level, plus the word. High is bold ink. Never orange: orange stays “needs you”.",
        "The word carries the level; bars are decorative.", "Q-laptop, Q-phone, Q-states-*"),
    blk("Needs-you count", "Count badge",
        Q_NEED + '<span class="need"><span class="g g-attn g-sm" aria-hidden="true"></span>1</span><span class="need none">0</span>',
        "Orange ! and count of fields that need you (same reasons as the review list). Zero is grey. Never a claim status.",
        "Row label reads “7 need you”.", "Q-laptop, Q-phone, Q-states-*"),
    blk("Queue table", "Data table, sortable",
        '<div style="flex: 1; background: var(--surface); border-radius: var(--r-md); overflow: hidden"><table class="qt">'
        f'<thead><tr><th aria-sort="descending" style="width: 96px"><span>Priority</span></th><th>Reference</th><th style="width: 120px">Status</th></tr></thead><tbody><tr><td>{qpri("high")}</td><td><a href="#" class="ref">CLM-2026-004817</a></td><td><span class="chip"><span class="dot"></span>Running</span></td></tr></tbody></table></div>',
        "Laptop. Priority · reference · claimant · product · status · needs you · confidence · received · updated; 52 px rows, hover, whole row opens the claim. Default sort: priority, then oldest.",
        "Real table; th with aria-sort; the reference is the link, its label reads the whole row.", "Q-laptop, Q-states-laptop"),
    blk("Claim card", "List item (link)", Q_CARD,
        "Phone row. Reference + status, claimant · product + priority, needs you + confidence, received · updated. Hover, pressed; the whole card opens the claim.",
        "One link per claim; aria-label reads every value.", "Q-laptop, Q-phone, Q-states-*"),
]))

GROUPS.append(("Whole-screen states", [
    blk("Message", "Empty state / error page",
        f'<div class="msg"><h2 class="serif t-xl">Can\'t reach the server</h2><p class="t-md ink-2">Check your connection, then try again.</p><button class="btn btn-primary">{RETRY}Try again</button></div>',
        "Serif headline, one sentence, at most one action. Waiting for the agent · Can't reach the server · Claim not found · No claims in the queue · No claims match (Clear filter) · That filter doesn't exist (Show all claims).",
        "Headline is h2; the action is the first focus.", "G-states-*, Q-states-*"),
    blk("Skeleton", "Skeleton loader",
        '<div style="flex: 1; display: flex; flex-direction: column; gap: 8px"><span class="sk" style="width: 60%; height: 12px"></span><span class="sk" style="width: 90%; height: 12px"></span><span class="sk" style="width: 40%; height: 36px; border-radius: var(--r-md)"></span></div>',
        "Same shapes as the screen it stands in for; pulses, stops under reduced motion.",
        "Screen reader gets one “Loading claim” / “Loading claims” text.", "G-states-*, Q-states-*"),
]))


def group_html(title, blocks):
    return (f'<section style="display: flex; flex-direction: column; gap: 16px"><h2 class="serif t-xl" style="margin: 0">{title}</h2>'
            f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start">{"".join(blocks)}</div></section>')


W_BLK = 1856
n_blocks = sum(len(b) for _, b in GROUPS)
body_b = f'''<div class="app sheet" style="width: {W_BLK}px; height: {H_BLK}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 40px; background: var(--bg)">
<div style="display: flex; flex-direction: column; gap: 8px"><div class="eyebrow ink-3">Building blocks · rounds 2–4 · {n_blocks} blocks</div><p class="t-md ink-2" style="margin: 0; max-width: 1100px">Each block is drawn with the same classes as the frames, named by what it does, and mapped (→) to the standard interaction pattern behind it. Content is fixture text. Anything new from round 3 on is added here first (round 3: the prototype group; round 4: the queue group, option A).</p></div>
{"".join(group_html(t, b) for t, b in GROUPS)}
</div>'''

(OUT / "project").mkdir(parents=True, exist_ok=True)
for name, title, body, w, h in [("G-tokens", "Tokens", body_t, W_TOK, H_TOK), ("G-blocks", "Building blocks", body_b, W_BLK, H_BLK)]:
    t = page(title, body, w, h)
    (OUT / f"project/{name}.dc.html").write_text(t)
    css = t[t.index("<style>"): t.index("</style>")].replace(ROOT, "")
    styles = " ".join(re.findall(r'style="([^"]*)"', t))
    stray = set(re.findall(r"#[0-9A-Fa-f]{3,8}\b", css + styles)) | set(re.findall(r"rgba\([^)]*\)", styles))
    print(name, w, "x", h, len(t), "stray hex in styles:", stray)
print("contrast:", ", ".join(f"{a} on {b} {ratio(a, b):.2f}" for a, b in PAIRS))
