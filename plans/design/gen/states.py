"""Builds the round 2 step 2(b) claim-state frames from sample-data.json.

Screens reuse G-laptop's tokens and markup (header, step line, list, open field,
document panel). Output: <out>/project/G-states-{bar,laptop,phone}.dc.html (step 2b) and
G-doc-{laptop,phone}.dc.html (step 2c, the document view: side panel and bottom sheet).

Run from the repo root:
  python3 -I plans/design/gen/states.py . plans/design/gen/ref-G-laptop.dc.html <out> <bar_h> <laptop_h> <phone_h> <doc_laptop_h> <doc_phone_h>
The heights are the frame heights; keep them equal to canvas.json.
ref-G-laptop.dc.html is the signed-off laptop screen whose CSS the frames start from.
"""
import json, sys, html, re, pathlib

REPO = pathlib.Path(sys.argv[1])
REF = pathlib.Path(sys.argv[2])
OUT = pathlib.Path(sys.argv[3])
H_BAR, H_LAP, H_PH, H_DL, H_DP = (int(a) for a in sys.argv[4:9])

data = json.loads((REPO / "plans/design/sample-data.json").read_text())
SNAP = data["snapshots"]
DOCS = {d["document_id"]: d for d in data["documents"]}
QUEUE = {q["claim_id"]: q for q in data["queue_at_80s"]}
RUNS = {}
for p in (REPO / "fixtures/runs").glob("*.jsonl"):
    first = json.loads(p.read_text().splitlines()[0])
    RUNS[first["claim_id"]] = first["payload"]["started_at"]
E = html.escape
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def hhmm_after(cid, ms):
    """Agent time: run started_at plus the event's at_ms, as HH:MM."""
    t = RUNS[cid][11:19]
    s = int(t[:2]) * 3600 + int(t[3:5]) * 60 + int(t[6:8]) + ms // 1000
    return f"{s // 3600:02d}:{s // 60 % 60:02d}"


def money(v):
    whole, cents = v["amount"].split(".")
    out = ""
    while len(whole) > 3:
        out = "," + whole[-3:] + out
        whole = whole[:-3]
    sym = {"EUR": "€"}[v["currency"]]
    return f"{sym} {whole}{out}.{cents}"


def fmt(f):
    v, t = f["value"], f["value_type"]
    if v is None: return "Not found in documents"
    if t == "money": return money(v)
    if t == "date": return f"{int(v[8:10])} {MON[int(v[5:7]) - 1]} {v[:4]}"
    if t == "boolean": return "Yes" if v else "No"
    return v


def conf(c):
    return ("Low" if c < 0.6 else "Medium" if c < 0.85 else "High") + f" {round(c * 100)}%"


def vclass(t): return "v-num" if t in ("money", "date", "time", "number", "boolean") else ("v-long" if t == "long_text" else "v-text")


# ---------- CSS: G-laptop's helmet (tokens unchanged) + claim-state blocks ----------
ref = REF.read_text()
helmet = ref[ref.index("<helmet>") + len("<helmet>"): ref.index("</helmet>")]
extra = r"""
.board{font-family:Inter,system-ui,sans-serif}
.frame{position:relative;border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--lift);background:var(--bg)}
.field{padding:12px 16px}
.v-num .val{font-size:22px;line-height:28px}
.v-text .val{font-size:18px;line-height:24px;white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.v-long{align-items:flex-start}
.v-long .val{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px;font-weight:400;white-space:normal;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.head h2{margin:0 4px 0 0}
.acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px}
.ro{display:flex;align-items:center;gap:6px;font-size:12px;line-height:16px;color:var(--ink-3)}
.notein{margin:0;font-family:"JetBrains Mono",monospace;font-size:12px;line-height:16px;color:var(--attn)}
.spin{width:12px;height:12px;flex:none;box-sizing:border-box;border:1.5px solid currentColor;border-right-color:transparent;border-radius:var(--r-full);animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
.chip.attn{background:var(--attn-tint);border-color:var(--attn-line);color:var(--attn)}
.chip.you{background:var(--you-tint);border-color:var(--you-line);color:var(--you)}
.ok{flex:none;color:var(--ink-3)}
.tri{flex:none;color:var(--attn)}
.band{flex:none;background:var(--bg);border-bottom:1px solid var(--line)}
.band > summary{list-style:none;display:flex;align-items:center;gap:8px;height:36px;padding:0 16px 0 20px;cursor:pointer}
.band > summary:hover{background:var(--subtle)}
.band .meta{font-size:12px;line-height:16px;color:var(--ink-3);white-space:nowrap}
.band.alert{background:var(--attn-tint);border-bottom-color:var(--attn-line)}
.band.alert > summary{height:44px;cursor:default}
.band.alert > summary:hover{background:var(--attn-tint)}
.steps{margin:0;padding:4px 16px 12px 20px;list-style:none;display:flex;flex-direction:column}
.steps li{display:grid;grid-template-columns:14px 200px minmax(0,1fr);column-gap:8px;align-items:start;padding:6px 0;font-size:12px;line-height:16px;color:var(--ink-2)}
.steps li > :first-child{margin-top:1px}
.steps .lab{font-weight:600;color:var(--ink)}
.steps .lab.dim{font-weight:500;color:var(--ink-2)}
.tip{position:absolute;z-index:2;max-width:280px;padding:8px 10px;border-radius:var(--r-md);background:var(--surface);box-shadow:var(--lift);font-size:12px;line-height:16px;color:var(--ink);white-space:normal}
.sk{display:block;background:var(--subtle);border-radius:var(--r-sm);animation:skp 1.6s ease-in-out infinite}
@keyframes skp{50%{opacity:.5}}
@media (prefers-reduced-motion:reduce){.sk{animation:none}}
.btn[aria-disabled="true"]{background:var(--subtle);border-color:transparent;color:var(--ink-3);cursor:not-allowed}
.row.locked{cursor:default}.row.locked:hover{background:transparent}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.msg{display:flex;flex-direction:column;align-items:flex-start;gap:12px;max-width:420px}
.msg h2{margin:0}
.msg p{margin:0}
.phone .ib{width:44px;height:44px}.phone .btn{height:44px}.phone .seg button{height:36px}
.phone .sec{height:44px;margin-top:4px}
.phone .row{height:52px}.phone .row .l{font-size:12px;line-height:16px}.phone .row .v{font-size:14px;line-height:20px}
.phone .more{height:44px;font-size:13px;line-height:18px}
.phone .band > summary{height:auto;min-height:44px;padding:0 16px}
.phone .band.alert > summary{align-items:flex-start;padding:12px 16px;flex-direction:column;gap:8px}
.phone .steps{padding:0 16px 12px}
.phone .steps li{grid-template-columns:14px minmax(0,1fr);row-gap:2px}
.phone .steps li .note{grid-column:2}
"""
helmet = helmet.replace("</style>", extra + "</style>")


# ---------- icons ----------
def svg(d, sw="1.7", w=16, extra=""):
    return f'<svg width="{w}" height="{w}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="{sw}" aria-hidden="true"{extra}><path d="{d}"></path></svg>'


BACK = svg("M10 3 5 8l5 5")
BACK18 = svg("M10 3 5 8l5 5", w=18)
UP, DOWN = svg("m4 10 4-4 4 4"), svg("m4 6 4 4 4-4")
CHECK, PENCIL, XX = svg("m3 8.5 3 3 7-7", "2"), svg("M11 2.5 13.5 5 6 12.5H3.5V10z", "1.6"), svg("M4 4l8 8M12 4l-8 8")
SKIP = svg("m4 4 4 4-4 4M9 4l4 4-4 4")
OK = '<svg class="ok" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8.5 3 3 7-7"></path></svg>'
TRI = '<svg class="tri" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>'
TRI_BIG = '<svg class="tri" width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>'
RETRY = svg("M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3", "1.6")
LOCK = svg("M4.5 7.5h7v6h-7zM6 7.5V5.5a2 2 0 0 1 4 0v2", "1.5", 12)
DOC = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.5" aria-hidden="true" style="flex: none"><path d="M4 1.5h5.5L12.5 4.5v10h-8.5z"></path><path d="M9.5 1.5v3h3"></path></svg>'
CHEV = '<svg class="chev" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="2" aria-hidden="true"><path d="m6 4 4 4-4 4"></path></svg>'
ROT = ' style="transform: rotate(90deg)"'
SCHEV = lambda open_=False: '<svg class="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"' + (ROT if open_ else "") + '><path d="m6 4 4 4-4 4"></path></svg>'
ATTN = '<span class="g g-attn" aria-hidden="true"></span>'
DONE_SM = '<span class="g g-done g-sm" aria-hidden="true"></span>'


# ---------- blocks ----------
def chip(kind):
    return {
        "queued": '<span class="chip">Queued</span>',
        "running": '<span class="chip"><span class="dot"></span>Running</span>',
        "review": '<span class="chip">Needs review</span>',
        "failed": f'<span class="chip attn">{TRI}Run failed</span>',
        "reviewed": f'<span class="chip you">{DONE_SM}Reviewed</span>',
    }[kind]


def prog(n, m, w="96px"):
    pct = round(100 * n / m) if m else 0
    return (f'<div style="display: flex; align-items: center; gap: 10px{"; flex: 1" if w == "flex" else ""}">'
            f'<div role="progressbar" aria-label="Fields decided" aria-valuemin="0" aria-valuemax="{m}" aria-valuenow="{n}" style="{"flex: 1" if w == "flex" else "width: " + w}; height: 4px; border-radius: var(--r-full); background: var(--subtle); overflow: hidden"><div style="width: {pct}%; height: 100%; background: var(--you)"></div></div>'
            f'<span class="t-sm ink-2" style="white-space: nowrap"><strong class="mono" style="color: var(--you); font-weight: 600">{n}</strong> of {m} decided</span></div>')


def complete(label="Complete review", enabled=False, why="", tip=False, full=False, uid="x"):
    w = ' style="width: 100%"' if full else ""
    if enabled:
        return f'<button class="btn btn-primary"{w}>{label}</button>'
    t = (f'<div class="tip" role="tooltip" id="why-{uid}" style="top: 48px; right: 0; width: 260px">{why}</div>') if tip else f'<span id="why-{uid}" hidden="hidden">{why}</span>'
    btn = f'<button class="btn btn-primary{" is-focus" if tip else ""}" aria-disabled="true" aria-describedby="why-{uid}"{w}>{label}</button>'
    return f'<span style="position: relative; display: inline-flex{"; width: 100%" if full else ""}">{btn}{t}</span>'


def header_l(cid, sub, chipk, sub2="", right=""):
    q = QUEUE[cid]
    return f'''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<a href="#" class="ib" aria-label="Back to queue" title="Back to queue">{BACK}</a>
<h1 class="mono t-md" style="margin: 0; font-weight: 500">{cid}</h1>
<span class="t-base ink-2">{E(q["claimant_name"])} · {q["product"].capitalize()}</span>
{chip(chipk) if chipk else ""}
<span class="t-sm ink-3" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap">{sub2}</span>
<span style="flex: 1"></span>
{right}
</header>'''


def header_p(cid, chipk, sub=None):
    q = QUEUE[cid]
    sub = sub or f'{E(q["claimant_name"])} · {q["product"].capitalize()}'
    return f'''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<a href="#" class="ib" aria-label="Back to queue">{BACK18}</a>
<div style="flex: 1; min-width: 0"><h1 class="mono t-md" style="margin: 0; font-weight: 500">{cid}</h1>
<div class="t-sm ink-3" style="display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{sub}</div></div>
{chip(chipk) if chipk else ""}
</header>'''


def step_rows(snap_key, cut=None, running=None):
    """The agent's steps in order: done (grey ✓), with a note or warning (orange !), running (dot), failed (triangle)."""
    s = SNAP[snap_key]
    steps = s["steps"][:cut] if cut else s["steps"]
    out = []
    for st in steps:
        state = running if (running and st["step_id"] == running) else st["state"]
        note = st["note"] or ""
        if state == "running":
            g, lab, note = '<span class="dot" style="margin: 4px; color: var(--ink-2)"></span>', "lab", "Running"
        elif state == "failed":
            g, lab, note = TRI, "lab", E(s["error"]["message"])
        elif note:
            g, lab, note = ATTN, "lab", E(note)
        else:
            g, lab = OK, "lab dim"
        out.append(f'<li>{g}<span class="{lab}">{E(st["label"])}</span><span class="note">{note}</span></li>')
    return "".join(out)


def band_l(glyph, title, text, meta, open_html="", is_open=False):
    o = ' open="open"' if is_open else ""
    body = f'<ol class="steps" aria-label="Agent steps">{open_html}</ol>' if open_html else ""
    return f'''<details class="band"{o}><summary>{glyph}<span class="t-sm" style="font-weight: 600; white-space: nowrap">{title}</span>
<span class="t-sm ink-2" style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{text}</span><span class="meta">{meta}</span>{CHEV}</summary>{body}</details>'''


def band_p(glyph, title, text, count="", open_html="", is_open=False):
    o = ' open="open"' if is_open else ""
    body = f'<ol class="steps" aria-label="Agent steps">{open_html}</ol>' if open_html else ""
    cnt = f'<span class="mono t-xs ink-3">{count}</span>' if count else ""
    return f'''<details class="band"{o}><summary>{glyph}<span class="t-sm ink-2" style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"><strong style="color: var(--ink); font-weight: 600">{title}</strong>{" · " + text if text else ""}</span>{cnt}{CHEV}</summary>{body}</details>'''


def fail_band_l(snap_key):
    s = SNAP[snap_key]
    return f'''<div class="band alert" role="alert"><summary>{TRI}<span class="t-sm" style="font-weight: 600; white-space: nowrap; color: var(--attn)">Look up policy failed</span>
<span class="t-sm" style="flex: 1; min-width: 0; color: var(--attn); white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{E(s["error"]["message"])} Not checked: policy cover and excess.</span>
<button class="btn" style="height: 32px">{RETRY}Retry run</button></summary></div>'''


def fail_band_p(snap_key):
    s = SNAP[snap_key]
    return f'''<div class="band alert" role="alert"><summary><span class="t-sm" style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--attn)">{TRI}Look up policy failed</span>
<span class="t-sm" style="color: var(--attn)">{E(s["error"]["message"])}<br>Not checked: policy cover and excess.</span>
<button class="btn" style="width: 100%">{RETRY}Retry run</button></summary></div>'''


def row(label, value, g="g-pend", tag="", tagcls="attn", cls="", sel=False):
    meaning = {"g-done": "decided by you", "g-pend": "to check", "g-attn": "needs you"}[g]
    t = f'<span class="tag {tagcls}">{E(tag)}</span>' if tag else ""
    cur = ' aria-current="true"' if sel else ""
    return (f'<button class="row {cls}{" is-sel" if sel else ""}" aria-label="{E(label)}: {E(value)}, {meaning}{", " + E(tag) if tag else ""}"{cur}>'
            f'<span class="g {g}" aria-hidden="true"></span><span style="min-width: 0"><span class="l">{E(label)}</span><span class="v">{E(value)}</span></span>{t}</button>')


def section(name, cnt, rows, attn="", open_=True, tag=""):
    a = (f'<span class="cnt" style="display: inline-flex; align-items: center; gap: 4px; color: var(--attn)" aria-label="{attn} need you"><span class="g g-attn g-sm" aria-hidden="true"></span>{attn}</span>') if attn else ""
    t = f'<span class="tag plain" style="letter-spacing: 0; text-transform: none">{tag}</span>' if tag else ""
    return f'<button class="sec" aria-expanded="{"true" if open_ else "false"}">{SCHEV(open_)}<span style="flex: 1">{name}</span>{a}{t}<span class="cnt">{cnt}</span></button>' + "".join(rows)


def seg(needs, review, all_, pressed):
    b = lambda k, inner: f'<button aria-pressed="{"true" if k == pressed else "false"}">{inner}</button>'
    n = lambda x: '<span class="n">' + str(x) + '</span>'
    return ('<div class="seg" role="group" aria-label="Show fields">' + b("needs", (ATTN if needs else "") + "Needs you " + n(needs))
            + b("review", "To review " + n(review)) + b("all", "All " + n(all_)) + '</div>')


def summary_row(tag="AI draft · not verified", mt="16px"):
    return f'<button class="sec" style="margin-top: {mt}">{SCHEV()}<span style="flex: 1">Summary</span><span class="tag draft">{tag}</span></button>'


def list_l(segh, body):
    return f'''<nav aria-label="Fields" style="min-height: 0; display: flex; flex-direction: column; background: var(--bg); border-right: 1px solid var(--line)">
<div style="flex: none; padding: 12px 16px 4px">{segh}</div><div class="pane" style="flex: 1; padding-bottom: 16px">{body}</div></nav>'''


def field_main(group, name, tags, f, box_cls, facts, actions=True, ro="", note="", boxes="", acts_html=""):
    tg = "".join(f'<span class="tag attn">{t}</span>' for t in tags)
    acts = acts_html
    if actions and not acts_html:
        acts = (f'<div class="acts"><button class="btn btn-primary is-focus" title="Accept · A">{CHECK}Accept</button>'
                f'<button class="btn" title="Correct · C">{PENCIL}Correct</button><button class="btn" title="Reject and enter your own value · R">{XX}Reject</button>'
                f'<span style="flex: 1"></span><button class="ib" aria-label="Skip for now (S)" title="Skip for now · S" style="width: 36px; height: 36px">{SKIP}</button></div>')
    keys = ('<div class="t-xs ink-3" style="flex: none; display: flex; gap: 16px; padding: 12px 24px; border-top: 1px solid var(--line)">'
            '<span><kbd>J</kbd> <kbd>K</kbd> move</span><span><kbd>A</kbd> <kbd>C</kbd> <kbd>R</kbd> decide</span><span><kbd>S</kbd> skip</span><span><kbd>U</kbd> undo</span></div>') if actions else ""
    return f'''<main class="pane" aria-label="{E(name)}" style="background: var(--surface); display: flex; flex-direction: column">
<div style="flex: none; height: 48px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 24px; border-bottom: 1px solid var(--line)">
<span class="t-sm ink-3" style="flex: 1">{group}</span><button class="ib" aria-label="Previous field (K)" title="Previous field · K">{UP}</button><button class="ib" aria-label="Next field (J)" title="Next field · J">{DOWN}</button></div>
<div style="padding: 24px; display: flex; flex-direction: column; gap: 12px; max-width: 560px">
<div class="head"><h2 class="serif t-lg">{E(name)}</h2>{tg}</div>
{boxes or f'<div class="field {box_cls} {vclass(f["value_type"])}"><span class="val">{E(fmt(f))}</span></div><div class="facts">{facts}</div>'}{acts}{ro}</div>
<div style="flex: 1"></div>{keys}</main>'''


def doc_html(doc_id, cite):
    text = E(DOCS[doc_id]["text"].strip())
    c = E(cite)
    assert c in text, cite
    return text.replace(c, f'<mark id="cited">{c}</mark>', 1)




def panel(doc_id, cite, note="", shift=0):
    d = DOCS[doc_id]
    text = doc_html(doc_id, cite)
    n = f'<p class="notein" style="padding: 12px 16px 0">{note}</p>' if note else ""
    return f'''<aside aria-label="Source document" style="min-height: 0; background: var(--bg); border-left: 1px solid var(--line); display: flex; flex-direction: column">
<div style="flex: none; height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 16px; border-bottom: 1px solid var(--line)">{DOC}
<span class="t-base" style="flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{E(d["title"])}</span>
</div>{n}
<div class="pane" style="flex: 1; padding: 16px{"; overflow: hidden" if shift else ""}"><div class="mono t-sm" style="{f"margin-top: -{shift}px; " if shift else ""}padding: 24px 20px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--lift); color: var(--ink-2); white-space: pre-line; overflow-wrap: anywhere">{text}</div></div></aside>'''


def screen_l(header, band, body):
    return f'''<div class="app" style="width: 1280px; height: 800px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">{header}{band}{body}</div>'''


def screen_p(header, band, middle, footer, bg="var(--bg)"):
    return f'''<div class="app phone" style="width: 375px; height: 844px; display: flex; flex-direction: column; background: {bg}; overflow: hidden">{header}{band}{middle}{footer}</div>'''


def footer_p(inner):
    return f'<footer style="flex: none; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px 16px; background: var(--surface); border-top: 1px solid var(--line)">{inner}</footer>'


def grid3(a, b, c=""):
    cols = "320px minmax(0, 1fr) 400px" if c else "320px minmax(0, 1fr)"
    return f'<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: {cols}">{a}{b}{c}</div>'


# ---------- data per claim ----------
S4822, S4809 = SNAP["CLM-2026-004822@final"], SNAP["CLM-2026-004809@final"]
F22 = {f["field_id"]: f for f in S4822["fields"]}
F09 = {f["field_id"]: f for f in S4809["fields"]}
G22 = [("Incident", ["claim_type", "discovered_at", "cause_of_damage", "rooms_affected"]),
       ("Repair", ["repairer", "visit_date", "repair_cost"]),
       ("Contents", ["damaged_items", "estimated_contents_loss"])]
G09 = [("Incident", ["claim_type", "damage"]), ("Vehicle", ["vehicle", "plate"]),
       ("Repair costs", ["repair_cost"]), ("Policy and cover", ["glass_covered", "excess"])]
T22 = lambda fid: hhmm_after("CLM-2026-004822", F22[fid]["history"][-1]["at_ms"])
T09 = lambda fid: hhmm_after("CLM-2026-004809", F09[fid]["history"][-1]["at_ms"])
END17 = hhmm_after("CLM-2026-004817", SNAP["CLM-2026-004817@final"]["at_ms"])
END09 = hhmm_after("CLM-2026-004809", S4809["at_ms"])
RECV30 = QUEUE["CLM-2026-004830"]["received_at"][11:16]
# illustrative reviewer times for 4809 (not fixture data)
ACC09, DONE09, DONE17 = "15:04", "15:06", "10:14"


def rows22(sel=None):
    out = []
    for name, ids in G22:
        rs = []
        for fid in ids:
            f = F22[fid]
            notin = "value_not_in_citation" in f["flags"]
            rs.append(row(f["label"], fmt(f), "g-attn" if notin else "g-pend", "Not in source" if notin else "", sel=(fid == sel)))
        attn = sum("value_not_in_citation" in F22[i]["flags"] for i in ids)
        out.append(section(name, f"0/{len(ids)}", rs, attn=str(attn) if attn else ""))
    out.append(section("Policy and cover", "", [], open_=False, tag="Not checked"))
    return "".join(out)


def rows09(sel=None, mine=False):
    out = []
    for name, ids in G09:
        rs = [row(F09[i]["label"], fmt(F09[i]), "g-done" if mine else "g-pend", cls="mine locked" if mine else "", sel=(i == sel)) for i in ids]
        out.append(section(name, f"{len(ids) if mine else 0}/{len(ids)}", rs))
    return "".join(out)


# ---------- header-and-steps states (bar board) ----------
S80 = "CLM-2026-004817@80s"
SF = "CLM-2026-004817@final"
note_stmt = E(SNAP[S80]["steps"][4]["note"])
note_liab = E(SNAP[SF]["steps"][7]["note"])
UNTIL_DRAFT = 9  # steps known at 100.35 s: draft_summary just started
steps_100 = step_rows(SF, running="draft_summary")
steps_80 = step_rows(S80)
steps_22 = step_rows("CLM-2026-004822@final")

C17 = "CLM-2026-004817"
R_RUN = complete("Complete review · 36 left", why="36 fields still need a decision", uid="run")
BARS = [
    dict(t="Running", src="4817 at 80 s. Steps progress, fields arrive, the reviewer can already act.",
         l=header_l(C17, "", "running", "Look up policy", prog(5, 41) + R_RUN) + band_l(ATTN, "Read claimant statement", note_stmt, "Agent steps 5 of 6"),
         p_top=header_p(C17, "running") + band_p(ATTN, "Read claimant statement", note_stmt),
         p_bot=footer_p(prog(5, 41, "flex") + complete("Complete review · 36 left", full=True, uid="prun"))),
    dict(t="Reconnecting", src="4817 at 80 s, live connection dropped. Last known state stays; catches up quietly, no duplicates.",
         l=header_l(C17, "", "running", '<span class="spin" aria-hidden="true"></span>Reconnecting…', prog(5, 41) + R_RUN) + band_l(ATTN, "Read claimant statement", note_stmt, "Agent steps 5 of 6"),
         p_top=header_p(C17, "running", '<span class="spin" aria-hidden="true"></span>Reconnecting…') + band_p(ATTN, "Read claimant statement", note_stmt),
         p_bot=footer_p(prog(5, 41, "flex") + complete("Complete review · 36 left", full=True, uid="prec"))),
    dict(t="Step warning arrives", src="4817 at 100 s: \"Assess liability\" finishes with a warning. The line shows the newest note and the count.",
         l=header_l(C17, "", "running", "Draft summary", prog(5, 49) + complete("Complete review · 44 left", why="44 fields still need a decision", uid="warn")) + band_l(ATTN, "Assess liability", note_liab, "2 notes · Agent steps 9 of 9"),
         p_top=header_p(C17, "running") + band_p(ATTN, "Assess liability", note_liab, "2"),
         p_bot=footer_p(prog(5, 49, "flex") + complete("Complete review · 44 left", full=True, uid="pwarn"))),
    dict(t="Agent steps open", src="Same moment, the line expanded: every step in order, done (✓), with a note (!), running (•).",
         l=header_l(C17, "", "running", "Draft summary", prog(5, 49) + complete("Complete review · 44 left", why="44 fields still need a decision", uid="open")) + band_l(ATTN, "Assess liability", note_liab, "2 notes · Agent steps 9 of 9", steps_100, True),
         p_top=header_p(C17, "running") + band_p(ATTN, "Assess liability", note_liab, "2", steps_100, True),
         p_bot=""),
    dict(t="Failed part-way", src="4822: \"Look up policy\" failed (retryable). The 9 fields stay reviewable. Full screen below.",
         l=header_l("CLM-2026-004822", "", "failed", "Stopped at Look up policy", prog(0, 9) + complete("Complete review · 9 left", why="9 fields still need a decision", uid="fail")) + fail_band_l("CLM-2026-004822@final"),
         p_top=header_p("CLM-2026-004822", "failed") + fail_band_p("CLM-2026-004822@final"),
         p_bot=footer_p(prog(0, 9, "flex") + complete("Complete review · 9 left", full=True, uid="pfail"))),
    dict(t="Blocked: agent still working", src="Illustrative: all 41 fields decided at 80 s. Complete review waits for the run to end. Tooltip shown on hover and focus.",
         l=header_l(C17, "", "running", "Look up policy", prog(41, 41) + complete("Complete review · agent working", why="Available when the agent has finished", tip=True, uid="busy")) + band_l(ATTN, "Read claimant statement", note_stmt, "Agent steps 5 of 6"),
         p_top=header_p(C17, "running") + band_p(ATTN, "Read claimant statement", note_stmt),
         p_bot=footer_p(prog(41, 41, "flex") + complete("Complete review · agent working", full=True, uid="pbusy")), tip=True),
    dict(t="Blocked: fields need a decision", src="4817 finished. Illustrative: 46 of 49 decided. Fields changed after a decision count as left.",
         l=header_l(C17, "", "review", f"Agent finished {END17}", prog(46, 49) + complete("Complete review · 3 left", why="3 fields still need a decision", tip=True, uid="left")) + band_l(ATTN, "Assess liability", note_liab, "2 notes · Agent steps 9 of 9"),
         p_top=header_p(C17, "review") + band_p(ATTN, "Assess liability", note_liab, "2"),
         p_bot=footer_p(prog(46, 49, "flex") + complete("Complete review · 3 left", full=True, uid="pleft")), tip=True),
    dict(t="Ready to complete", src="4817 finished, every field decided (illustrative). The only enabled primary in the header.",
         l=header_l(C17, "", "review", f"Agent finished {END17}", prog(49, 49) + complete(enabled=True)) + band_l(ATTN, "Assess liability", note_liab, "2 notes · Agent steps 9 of 9"),
         p_top=header_p(C17, "review") + band_p(ATTN, "Assess liability", note_liab, "2"),
         p_bot=footer_p(prog(49, 49, "flex") + complete(enabled=True, full=True))),
    dict(t="Reviewed", src=f"After Complete review (illustrative time {DONE17}). Read-only; undo has ended.",
         l=header_l(C17, "", "reviewed", f"Completed {DONE17}", prog(49, 49)) + band_l(ATTN, "Assess liability", note_liab, "2 notes · Agent steps 9 of 9"),
         p_top=header_p(C17, "reviewed") + band_p(ATTN, "Assess liability", note_liab, "2"),
         p_bot=footer_p(prog(49, 49, "flex") + f'<div class="ro" style="justify-content: center; height: 28px">{LOCK}Read-only · completed {DONE17}</div>')),
]


def bar_tile(b):
    pad = ' style="padding-bottom: 96px"' if b.get("tip") else ""
    bot = f'<div class="frame">{b["p_bot"]}</div>' if b["p_bot"] else ""
    return f'''<section style="display: flex; flex-direction: column; gap: 12px"{pad}>
<div style="display: flex; align-items: baseline; gap: 12px"><h2 class="serif t-lg" style="margin: 0">{b["t"]}</h2><span class="t-sm ink-3">{b["src"]}</span></div>
<div style="display: grid; grid-template-columns: 1280px 375px; column-gap: 48px; align-items: start">
<div class="frame" style="overflow: visible"><div class="app" style="width: 1280px; border-radius: var(--r-lg); overflow: visible">{b["l"]}</div></div>
<div style="display: flex; flex-direction: column; gap: 12px"><div class="frame"><div class="app phone">{b["p_top"]}</div></div>{('<div class="frame"><div class="app phone">' + b["p_bot"] + '</div></div>') if b["p_bot"] else ""}</div>
</div></section>'''


W_BAR = 40 + 1280 + 48 + 375 + 40
body_bar = f'''<div class="app board" style="width: {W_BAR}px; height: {H_BAR}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 40px; background: var(--bg)">
<div style="display: flex; flex-direction: column; gap: 8px; max-width: 1280px"><div class="eyebrow ink-3">Claim states · header and agent steps · laptop 1280 and phone 375 (top and bottom of the screen)</div>
<p class="t-sm ink-3" style="margin: 0">Run chip: Queued, Running (pulsing dot), Needs review, Run failed (triangle, orange tint), Reviewed (blue ✓, tint). A disabled Complete review always says why in its label; the tooltip gives the full reason. Agent times from fixtures (4817 started 10:06:12, 4822 11:40:03); decision counts and completion times are illustrative.</p></div>
{"".join(bar_tile(b) for b in BARS)}
</div>'''


# ---------- full screens (laptop and phone) ----------
dis = F22["discovered_at"]
L_FAIL = screen_l(
    header_l("CLM-2026-004822", "", "failed", "Stopped at Look up policy", prog(0, 9) + complete("Complete review · 9 left", why="9 fields still need a decision", uid="lf")),
    fail_band_l("CLM-2026-004822@final"),
    grid3(list_l(seg(1, 9, 9, "all"), rows22("discovered_at") + summary_row("AI draft · incomplete")),
          field_main("Incident", dis["label"], ["Not in source"], dis, "open",
                     f'<span class="pill open">Not decided</span><span>Agent · found {T22("discovered_at")} · {conf(dis["confidence"])}</span>'),
          panel(dis["source"]["document_id"], dis["cited_text"], f"{fmt(dis)} not found in the cited text")))

ct = F09["claim_type"]
L_DONE = screen_l(
    header_l("CLM-2026-004809", "", "review", f"Agent finished {END09}", prog(0, 7) + complete("Complete review · 7 left", why="7 fields still need a decision", uid="ld")),
    band_l(OK, "No notes", "", "Agent steps 3 of 3"),
    grid3(list_l(seg(0, 7, 7, "all"), rows09("claim_type") + summary_row()),
          field_main("Incident", ct["label"], [], ct, "open",
                     f'<span class="pill open">Not decided</span><span>Agent · found {T09("claim_type")} · {conf(ct["confidence"])}</span>'),
          panel(ct["source"]["document_id"], ct["cited_text"])))

L_REV = screen_l(
    header_l("CLM-2026-004809", "", "reviewed", f"Completed {DONE09}", prog(7, 7)),
    band_l(OK, "No notes", "", "Agent steps 3 of 3"),
    grid3(list_l(seg(0, 0, 7, "all"), rows09("claim_type", mine=True) + summary_row()),
          field_main("Incident", ct["label"], [], ct, "yours",
                     f'<span class="pill yours">{svg("m3 8.5 3 3 7-7", "2.4", 12)}You · accepted {ACC09}</span><span>Agent · found {T09("claim_type")} · {conf(ct["confidence"])}</span>',
                     actions=False, ro=f'<div class="ro" style="margin-top: 4px">{LOCK}Read-only · review completed {DONE09}</div>'),
          panel(ct["source"]["document_id"], ct["cited_text"])))

L_QUEUED = screen_l(
    header_l("CLM-2026-004830", "", "queued", f"Received {RECV30}", complete("Complete review · not started", why="Available when the agent has finished", uid="lq")),
    "",
    grid3(list_l(seg(0, 0, 0, "all"), '<p class="t-sm ink-3" style="margin: 16px 24px">No fields yet</p>'),
          '<main style="background: var(--surface); display: flex; align-items: center; justify-content: center"><div class="msg"><h2 class="serif t-xl">Waiting for the agent to start</h2><p class="t-md ink-2">Fields appear here as the agent reads the documents.</p></div></main>'))


def sk(w, h, extra=""):
    return f'<span class="sk" style="width: {w}; height: {h}px{extra}"></span>'


SK_ROWS = "".join(f'<div style="display: grid; grid-template-columns: 14px minmax(0, 1fr); column-gap: 10px; align-items: center; height: 40px; padding: 0 16px">{sk("14px", 14, "; border-radius: var(--r-full)")}<span style="display: flex; flex-direction: column; gap: 6px">{sk(w1, 8)}{sk(w2, 10)}</span></div>' for w1, w2 in [("40%", "70%"), ("55%", "45%"), ("35%", "60%"), ("50%", "80%"), ("45%", "50%")])
SK_LIST = (f'<div style="padding: 20px 16px 4px">{sk("30%", 10)}</div>' + SK_ROWS + f'<div style="padding: 20px 16px 4px">{sk("40%", 10)}</div>' + SK_ROWS)
SK_DOC = "".join(sk(w, 10, "; margin-bottom: 10px") for w in ["60%", "85%", "70%", "90%", "40%", "80%", "75%", "55%"])
L_LOAD = f'''<div class="app" aria-busy="true" style="width: 1280px; height: 800px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">
<span class="sr" role="status">Loading claim</span>
<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<a href="#" class="ib" aria-label="Back to queue" title="Back to queue">{BACK}</a><h1 class="mono t-md" style="margin: 0; font-weight: 500">CLM-2026-004817</h1>{sk("160px", 12)}{sk("72px", 24, "; border-radius: var(--r-full)")}<span style="flex: 1"></span>{sk("180px", 12)}{sk("150px", 36, "; border-radius: var(--r-md)")}</header>
<div style="flex: none; height: 36px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid var(--line)">{sk("420px", 10)}</div>
{grid3(f'<div style="background: var(--bg); border-right: 1px solid var(--line); min-height: 0; overflow: hidden"><div style="padding: 12px 16px 4px">{sk("100%", 32, "; border-radius: var(--r-md)")}</div>{SK_LIST}</div>',
       f'<div style="background: var(--surface); display: flex; flex-direction: column"><div style="height: 48px; border-bottom: 1px solid var(--line); display: flex; align-items: center; padding: 0 24px">{sk("90px", 10)}</div><div style="padding: 24px; display: flex; flex-direction: column; gap: 12px">{sk("200px", 18)}{sk("100%", 52, "; border-radius: var(--r-md)")}{sk("260px", 12)}<div style="display: flex; gap: 8px; margin-top: 4px">{sk("96px", 36, "; border-radius: var(--r-md)")}{sk("96px", 36, "; border-radius: var(--r-md)")}{sk("96px", 36, "; border-radius: var(--r-md)")}</div></div></div>',
       f'<div style="background: var(--bg); border-left: 1px solid var(--line)"><div style="height: 48px; border-bottom: 1px solid var(--line); display: flex; align-items: center; padding: 0 16px">{sk("180px", 12)}</div><div style="padding: 16px"><div style="padding: 24px 20px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--lift)">{SK_DOC}</div></div></div>')}
</div>'''


def centred_l(cid, inner, show_id=True):
    h = f'<h1 class="mono t-md" style="margin: 0; font-weight: 500">{cid}</h1>' if show_id else '<span class="t-base ink-2">Claims queue</span>'
    return f'''<div class="app" style="width: 1280px; height: 800px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">
<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box"><a href="#" class="ib" aria-label="Back to queue" title="Back to queue">{BACK}</a>{h}</header>
<main style="flex: 1; display: flex; align-items: center; justify-content: center; background: var(--surface)"><div class="msg">{inner}</div></main></div>'''


MSG_DOWN = f'{TRI_BIG}<h2 class="serif t-xl">Can\'t reach the server</h2><p class="t-md ink-2">Check your connection, then try again.</p><button class="btn btn-primary is-focus">{RETRY}Try again</button>'
BAD_ID = "CLM-2026-04817"
MSG_404 = f'<h2 class="serif t-xl">Claim not found</h2><p class="t-md ink-2">There is no claim <span class="mono">{BAD_ID}</span>.</p><a href="#" class="btn btn-primary is-focus" style="text-decoration: none">{BACK}Back to queue</a>'
L_DOWN = centred_l("CLM-2026-004817", MSG_DOWN)
L_404 = centred_l("", MSG_404, show_id=False)

LAPTOP = [
    ("Queued", f"4830 before 20 s (received {RECV30}). No fields yet, no document panel.", L_QUEUED),
    ("Failed part-way", "4822 final. Error and what was not checked in the alert line; fields stay reviewable; summary marked incomplete.", L_FAIL),
    ("Finished, needs review", "4809 final. Opens fully populated at once, no animation. No notes, so the line says so.", L_DONE),
    ("Reviewed (read-only)", f"4809 after Complete review. Illustrative times: accepted {ACC09}, completed {DONE09}. No actions.", L_REV),
    ("Loading", "Skeleton shaped like the screen. The claim ID is known from the URL.", L_LOAD),
    ("Backend unreachable", "First load fails. Plain message and retry.", L_DOWN),
    ("Claim not found", f"Bad URL (example: {BAD_ID}). Back to the queue.", L_404),
]


def lap_tile(t, src, scr):
    return f'''<section style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: baseline; gap: 12px"><h2 class="serif t-lg" style="margin: 0">{t}</h2><span class="t-sm ink-3">{src}</span></div><div class="frame" style="width: 1280px; height: 800px">{scr}</div></section>'''


W_LAP = 40 + 1280 + 64 + 1280 + 40
body_lap = f'''<div class="app board" style="width: {W_LAP}px; height: {H_LAP}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">
<div class="eyebrow ink-3">Claim states · full screens · laptop 1280 × 800 (Running is G-laptop)</div>
<div style="display: grid; grid-template-columns: 1280px 1280px; gap: 56px 64px; align-items: start">{"".join(lap_tile(*x) for x in LAPTOP)}</div></div>'''


# phone screens
def list_p(segh, body):
    return f'<div style="flex: none; padding: 12px 16px 4px">{segh}</div><nav class="pane" aria-label="Fields" style="flex: 1; padding-bottom: 16px">{body}</nav>'


P_FAIL = screen_p(header_p("CLM-2026-004822", "failed"), fail_band_p("CLM-2026-004822@final"),
                  list_p(seg(1, 9, 9, "all"), rows22() + summary_row("AI draft · incomplete", "12px")),
                  footer_p(prog(0, 9, "flex") + complete("Complete review · 9 left", full=True, uid="qf")))
P_DONE = screen_p(header_p("CLM-2026-004809", "review"), band_p(OK, "No notes", "", "3/3"),
                  list_p(seg(0, 7, 7, "all"), rows09() + summary_row(mt="12px")),
                  footer_p(prog(0, 7, "flex") + complete("Complete review · 7 left", full=True, uid="qd")))
P_REV = screen_p(header_p("CLM-2026-004809", "reviewed"), band_p(OK, "No notes", "", "3/3"),
                 list_p(seg(0, 0, 7, "all"), rows09(mine=True) + summary_row(mt="12px")),
                 footer_p(prog(7, 7, "flex") + f'<div class="ro" style="justify-content: center; height: 28px">{LOCK}Read-only · completed {DONE09}</div>'))
P_QUEUED = screen_p(header_p("CLM-2026-004830", "queued", f"Lotte Hendriks · Bicycle · received {RECV30}"), "",
                    f'<main style="flex: 1; display: flex; align-items: center; padding: 0 24px; background: var(--surface)"><div class="msg"><h2 class="serif t-xl">Waiting for the agent to start</h2><p class="t-md ink-2">Fields appear here as the agent reads the documents.</p></div></main>',
                    footer_p(complete("Complete review · not started", full=True, uid="qq")))
SK_PROWS = SK_ROWS.replace("height: 40px", "height: 52px")
P_LOAD = f'''<div class="app phone" aria-busy="true" style="width: 375px; height: 844px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden"><span class="sr" role="status">Loading claim</span>
<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box"><a href="#" class="ib" aria-label="Back to queue">{BACK18}</a><div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px"><h1 class="mono t-md" style="margin: 0; font-weight: 500">CLM-2026-004817</h1>{sk("120px", 10)}</div>{sk("72px", 24, "; border-radius: var(--r-full)")}</header>
<div style="flex: none; height: 44px; display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid var(--line)">{sk("70%", 10)}</div>
<div style="padding: 12px 16px 4px">{sk("100%", 40, "; border-radius: var(--r-md)")}</div><div style="flex: 1; overflow: hidden">{SK_LIST.replace(SK_ROWS, SK_PROWS)}</div>
{footer_p(sk("100%", 12) + sk("100%", 44, "; border-radius: var(--r-md)"))}</div>'''


def centred_p(cid, inner):
    h = f'<h1 class="mono t-md" style="margin: 0; font-weight: 500">{cid}</h1>' if cid else '<span class="t-base ink-2">Claims queue</span>'
    return f'''<div class="app phone" style="width: 375px; height: 844px; display: flex; flex-direction: column; background: var(--surface); overflow: hidden">
<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 2px; border-bottom: 1px solid var(--line); box-sizing: border-box"><a href="#" class="ib" aria-label="Back to queue">{BACK18}</a>{h}</header>
<main style="flex: 1; display: flex; align-items: center; padding: 0 24px"><div class="msg">{inner}</div></main></div>'''


PHONE = [
    ("Queued", "4830 before 20 s", P_QUEUED),
    ("Failed part-way", "4822 final", P_FAIL),
    ("Finished", "4809 final", P_DONE),
    ("Reviewed", "4809, read-only", P_REV),
    ("Loading", "Skeleton", P_LOAD),
    ("Backend unreachable", "Retry", centred_p("CLM-2026-004817", MSG_DOWN)),
    ("Claim not found", BAD_ID, centred_p("", MSG_404)),
]
W_PH = 40 + 7 * 375 + 6 * 40 + 40
body_ph = f'''<div class="app board" style="width: {W_PH}px; height: {H_PH}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">
<div class="eyebrow ink-3">Claim states · full screens · phone 375 × 844 (Running is G-phone-list)</div>
<div style="display: grid; grid-template-columns: repeat(7, 375px); gap: 40px; align-items: start">{"".join(f'<section style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: baseline; gap: 8px"><h2 class="serif t-lg" style="margin: 0">{t}</h2><span class="t-sm ink-3">{s}</span></div><div class="frame" style="width: 375px; height: 844px">{scr}</div></section>' for t, s, scr in PHONE)}</div></div>'''


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


# ---------- step 2(c): the document view (side panel on laptop, bottom sheet on phone) ----------
F80 = {f["field_id"]: f for f in SNAP[S80]["fields"]}
FFIN = {f["field_id"]: f for f in SNAP[SF]["fields"]}
DEC = {d["field_id"]: d for d in data["sample_decisions_4817_at_80s"]["decisions"]}
T17 = lambda f, i=-1: hhmm_after(C17, f["history"][i]["at_ms"])
loc, parts, plate, liab, pay = F80["incident_location"], F80["parts_total"], F80["third_party_plate"], F80["liability_assessment"], FFIN["estimated_payable"]


def facts_open(f, low=False, verb="found"):
    c = "" if low else " · " + conf(f["confidence"])
    return f'<span class="pill open">Not decided</span><span>Agent · {verb} {T17(f, 0 if verb == "found" else -1)}{c}</span>'


def list80(sel, extra_assess=None, all_=41):
    """G-laptop's list (4817 at 80 s); the open field's row stays visible even in a collapsed section."""
    incident = [row(loc["label"], loc["value"], sel=True)] if sel == "incident_location" else []
    assess = [row(liab["label"], liab["value"], "g-attn", "Changed after you", sel=(sel == "liability_assessment"))]
    if extra_assess:
        assess.append(extra_assess)
    body = "".join([
        section("Incident", "4/10", incident, open_=False) + ('<button class="more">+ 5 more to check</button>' if incident else ""),
        section("Parties", "1/9", [
            row(plate["label"], plate["value"], "g-attn", conf(plate["confidence"]), sel=(sel == "third_party_plate")),
            row("Third-party insurer", "Noordzee Verzekeringen", "g-attn", "Low 33%"),
            row("Third-party policy number", "Not found", "g-attn", "Empty", cls="empty"),
            row("Witness phone", "Not found", "g-attn", "Empty", cls="empty")], attn="4", open_=False) + '<button class="more">+ 4 more to check</button>',
        section("Vehicle and damage", "0/5", [], open_=False),
        section("Repair costs", "0/14", [
            row(parts["label"], fmt(parts), "g-attn", "Not in source", sel=(sel == "parts_total")),
            row("Total incl. VAT", "€ 4,415.30", "g-attn", "Changed after you")], attn="2", open_=False) + '<button class="more">+ 12 more to check</button>',
        section("Policy and cover", "0/2", [], open_=False),
        section("Assessment", f"0/{len(assess)}", assess, attn=str(len(assess)), open_=False),
        summary_row()])
    n = 8 if extra_assess else 7
    return list_l(seg(n, all_ - 5, all_, "all"), body)


HDR80 = header_l(C17, "", "running", "Look up policy", prog(5, 41) + R_RUN) + band_l(ATTN, "Read claimant statement", note_stmt, "Agent steps 5 of 6")
N95 = sum(1 for f in SNAP[SF]["fields"] if f["history"][0]["at_ms"] <= pay["history"][0]["at_ms"])
HDR95 = (header_l(C17, "", "running", "Cross-check amounts", prog(5, N95) + complete(f"Complete review · {N95 - 5} left", why=f"{N95 - 5} fields still need a decision", uid="d95"))
         + band_l(ATTN, "Read claimant statement", note_stmt, "Agent steps 6 of 7"))

# liability: decided, then revised (stacked: text values)
liab_old = liab["history"][0]["value"]
LIAB_BOXES = f'''<div class="two stack" style="display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px">
<div style="display: flex; flex-direction: column; gap: 8px"><div class="field yours v-text"><span class="val">{E(liab_old)}</span></div>
<div class="facts"><span class="pill yours">{svg("m3 8.5 3 3 7-7", "2.4", 12)}You · accepted {DEC["liability_assessment"]["at"][11:16]}</span></div></div>
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.6" role="img" aria-label="changed to" style="margin-left: 16px"><path d="M8 3v10M4 9l4 4 4-4"></path></svg>
<div style="display: flex; flex-direction: column; gap: 8px"><div class="field open v-text"><span class="val">{E(liab["value"])}</span></div>
<div class="facts"><span class="pill open">Not decided</span><span>Agent · changed {T17(liab)}</span></div></div></div>'''
LIAB_ACTS = (f'<div class="acts"><button class="btn btn-primary is-focus" title="Use the new value · A">{CHECK}Use new</button>'
             f'<button class="btn">{svg("M8 1.8 13 3.8v4c0 3-2.2 5-5 6.2-2.8-1.2-5-3.2-5-6.2v-4z", "1.6")}Keep mine</button>'
             f'<button class="btn" title="Correct · C">{PENCIL}Correct</button><button class="btn" title="Reject and enter your own value · R">{XX}Reject</button></div>')

NOSRC_PANEL = f'''<aside aria-label="Source document" style="min-height: 0; background: var(--bg); border-left: 1px solid var(--line); display: flex; flex-direction: column">
<div style="flex: none; height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 16px; border-bottom: 1px solid var(--line)">{DOC}
<span class="t-base ink-2" style="flex: 1; font-weight: 600">Source</span></div>
<div style="padding: 24px 16px"><p class="notein" style="margin: 0">No source</p><p class="t-sm ink-2" style="margin: 4px 0 0">The agent cited no document for this value.</p></div></aside>'''

DOC_L = [
    ("Cited text highlighted", "4817 at 80 s. Opening a field scrolls its document to the cited span.",
     screen_l(HDR80, "", grid3(list80("incident_location"),
              field_main("Incident", loc["label"], [], loc, "open", facts_open(loc, verb="found")),
              panel(loc["source"]["document_id"], loc["cited_text"])))),
    ("Value not in cited text", "Parts total: the agent summed three invoice lines. A prompt to check, never \"wrong\".",
     screen_l(HDR80, "", grid3(list80("parts_total"),
              field_main("Repair costs", parts["label"], ["Not in source"], parts, "open", facts_open(parts)),
              panel(parts["source"]["document_id"], parts["cited_text"], note=f"{fmt(parts)} not found in the cited text")))),
    ("Document text addressed to the system", "Liability cites the claimant statement. The note \"for the claims system\" stays plain document text.",
     screen_l(HDR80, "", grid3(list80("liability_assessment"),
              field_main("Assessment", liab["label"], ["Changed after you", conf(liab["confidence"])], liab, "", "", boxes=LIAB_BOXES, acts_html=LIAB_ACTS),
              panel(liab["source"]["document_id"], liab["cited_text"], shift=180)))),
    ("No source", f"Estimated payable arrives at 95 s with no citation. The panel says so instead of showing a document.",
     screen_l(HDR95, "", grid3(list80("estimated_payable", row(pay["label"], fmt(pay), "g-attn", "No source", sel=True), all_=N95),
              field_main("Assessment", pay["label"], ["No source", conf(pay["confidence"])], pay, "open", facts_open(pay, low=True)),
              NOSRC_PANEL))),
]
W_DL = W_LAP
body_dl = f'''<div class="app board" style="width: {W_DL}px; height: {H_DL}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">
<div style="display: flex; flex-direction: column; gap: 8px; max-width: 1280px"><div class="eyebrow ink-3">Document view · side panel · laptop 1280 × 800</div>
<p class="t-sm ink-3" style="margin: 0">The card describes the value; the panel shows the evidence. One highlighted span at a time. Document text is shown as plain text inside the page, never styled as a message. Agent times from fixtures (run started 10:06:12); reviewer times from sample_decisions_4817_at_80s.</p></div>
<div style="display: grid; grid-template-columns: 1280px 1280px; gap: 56px 64px; align-items: start">{"".join(lap_tile(*x) for x in DOC_L)}</div></div>'''


# phone: field with quote card, then the bottom sheet over it
def phone_field(group, pos, f, tags, facts, quote_html, footer_html):
    tg = "".join(f'<span class="tag attn">{t}</span>' for t in tags)
    return f'''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 2px; padding: 0 4px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<a href="#" class="ib" aria-label="Back to the list">{BACK18}</a><div style="flex: 1; min-width: 0"><div class="t-base" style="font-weight: 600">{group}</div><div class="t-sm ink-3">{pos}</div></div>
<button class="ib" aria-label="Previous field">{svg("m4 10 4-4 4 4", "1.7", 18)}</button><button class="ib" aria-label="Next field">{svg("m4 6 4 4 4-4", "1.7", 18)}</button></header>
<main class="pane" style="flex: 1; background: var(--surface)"><div style="padding: 24px 16px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; flex-direction: column; gap: 12px"><div class="head"><h2 class="serif t-lg">{E(f["label"])}</h2>{tg}</div>
<div class="field open {vclass(f["value_type"])}"><span class="val">{E(fmt(f))}</span></div><div class="facts">{facts}</div></div>{quote_html}</div></main>{footer_html}'''


P_ACTS = (f'<footer style="flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) 48px; gap: 8px; padding: 12px 16px 16px; border-top: 1px solid var(--line); background: var(--surface)">'
          f'<button class="btn btn-primary" style="height: 48px; padding: 0 8px">{CHECK}Accept</button><button class="btn" style="height: 48px; padding: 0 8px">{PENCIL}Correct</button>'
          f'<button class="btn" style="height: 48px; padding: 0 8px">{XX}Reject</button><button class="ib" aria-label="Skip for now" title="Skip for now" style="width: 48px; height: 48px; border: 1px solid var(--line)">{SKIP}</button></footer>')
DOC14 = DOC.replace('style="flex: none"', 'style="flex: none"')


def quote_card(f):
    return (f'<button class="cite" aria-label="Open the cited text in the document" aria-haspopup="dialog"><span class="quote" style="white-space: pre-line">{E(f["cited_text"])}</span>'
            f'<span class="t-sm ink-3" style="display: flex; align-items: center; gap: 6px; width: 100%">{DOC14}<span style="flex: 1">{E(f["cited_document"])}</span>'
            f'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 4 4 4-4 4"></path></svg></span></button>')


NOSRC_P = f'<div style="display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: var(--r-md); background: var(--bg)"><p class="notein" style="margin: 0">No source</p><p class="t-sm ink-2" style="margin: 0">The agent cited no document for this value.</p></div>'


def sheet(f, note="", shift=0):
    d = DOCS[f["source"]["document_id"]]
    n = f'<p class="notein" style="padding: 0 16px 12px; margin: 0">{note}</p>' if note else ""
    return f'''<div aria-hidden="true" style="position: absolute; inset: 0; background: var(--ink); opacity: .4"></div>
<div role="dialog" aria-modal="true" aria-label="{E(d["title"])}" style="position: absolute; left: 0; right: 0; bottom: 0; height: 640px; display: flex; flex-direction: column; background: var(--surface); border-radius: var(--r-lg) var(--r-lg) 0 0; box-shadow: var(--lift)">
<div style="flex: none; display: flex; justify-content: center; padding-top: 8px"><span style="width: 36px; height: 4px; border-radius: var(--r-full); background: var(--line-strong)"></span></div>
<div style="flex: none; display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 4px 0 16px">{DOC}<span class="t-base" style="flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{E(d["title"])}</span>
<button class="ib" aria-label="Close document">{svg("M4 4l8 8M12 4l-8 8", "1.7", 18)}</button></div>{n}
<div style="flex: 1; min-height: 0; overflow: hidden; padding: 0 16px 16px; border-top: 1px solid var(--line); background: var(--bg)"><div class="mono t-sm" style="margin-top: {16 - shift}px; padding: 20px 16px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--lift); color: var(--ink-2); white-space: pre-line; overflow-wrap: anywhere">{doc_html(d["document_id"], f["cited_text"])}</div></div></div>'''


def pscreen(inner, overlay=""):
    return f'<div class="app phone" style="position: relative; width: 375px; height: 844px; display: flex; flex-direction: column; background: var(--surface); overflow: hidden">{inner}{overlay}</div>'


ALLPOS = lambda fid: f"All · {[f['field_id'] for f in SNAP[S80]['fields']].index(fid) + 1} of 41"
DOC_P = [
    ("Quote card", "Tap opens the sheet", pscreen(phone_field("Incident", ALLPOS("incident_location"), loc, [], facts_open(loc), quote_card(loc), P_ACTS))),
    ("Bottom sheet", "Scrolled to the highlight", pscreen(phone_field("Incident", ALLPOS("incident_location"), loc, [], facts_open(loc), quote_card(loc), P_ACTS), sheet(loc))),
    ("Not in source", "Note at the top of the sheet", pscreen(phone_field("Repair costs", "Needs you · 5 of 7", parts, ["Not in source"], facts_open(parts), quote_card(parts), P_ACTS), sheet(parts, note=f"{fmt(parts)} not found in the cited text", shift=300))),
    ("No source", "Nothing to open", pscreen(phone_field("Assessment", "Needs you · 8 of 8", pay, ["No source", conf(pay["confidence"])], facts_open(pay, low=True), NOSRC_P, P_ACTS))),
]
W_DP = 40 + 4 * 375 + 3 * 40 + 40
body_dp = f'''<div class="app board" style="width: {W_DP}px; height: {H_DP}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">
<div class="eyebrow ink-3">Document view · bottom sheet · phone 375 × 844</div>
<div style="display: grid; grid-template-columns: repeat(4, 375px); gap: 40px; align-items: start">{"".join(f'<section style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: baseline; gap: 8px"><h2 class="serif t-lg" style="margin: 0">{t}</h2><span class="t-sm ink-3">{s}</span></div><div class="frame" style="width: 375px; height: 844px">{scr}</div></section>' for t, s, scr in DOC_P)}</div></div>'''


(OUT / "project").mkdir(parents=True, exist_ok=True)
for name, title, body, w, h in [("G-states-bar", "Claim states, header", body_bar, W_BAR, H_BAR),
                                ("G-states-laptop", "Claim states, laptop", body_lap, W_LAP, H_LAP),
                                ("G-states-phone", "Claim states, phone", body_ph, W_PH, H_PH),
                                ("G-doc-laptop", "Document view, laptop", body_dl, W_DL, H_DL),
                                ("G-doc-phone", "Document view, phone", body_dp, W_DP, H_DP)]:
    t = page(title, body, w, h)
    root = t[t.index(":root{"): t.index("}", t.index(":root{"))]
    stray = set(re.findall(r"#[0-9A-Fa-f]{3,8}\b", t.replace(root, "")))
    assert "dashed" not in t, name
    (OUT / f"project/{name}.dc.html").write_text(t)
    print(name, w, "x", h, len(t), "stray hex:", stray)
