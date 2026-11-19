"""Builds the round 4 queue: the step 1 options and, for the chosen option A (work list), the step 2 screens.

Moment: "queue_at_80s" in sample-data.json (4817 running, 4822 failed, 4830 and 4809 need review).
Each option is one board with the laptop screen (1280 x 800) and the phone screen (375 x 844).
Output: <out>/project/Q-option-{a,b,c}.dc.html (step 1 record), Q-laptop.dc.html and Q-phone.dc.html (the chosen
screen; in Play the 4817 row opens G-proto-laptop / G-proto-phone), Q-states-{laptop,phone}.dc.html (step 2 states).

Run from the repo root:
  python3 -I plans/design/gen/queue.py . plans/design/gen/ref-G-laptop.dc.html <out> <board_h> <states_laptop_h> <states_phone_h>
The heights are the frame heights; keep them equal to canvas.json.

Times: received is the fixture's received_at. "Updated" is the run's started_at plus the at_ms of
the last event delivered by replay 80 s (each run starts at its start_after_ms; 4809 is loaded whole).
Attention counts and reasons come from the snapshots' flags plus sample_decisions_4817_at_80s
(a decided field no longer needs you, unless the agent revised it afterwards).
"""
import json, sys, html, pathlib

REPO = pathlib.Path(sys.argv[1])
REF = pathlib.Path(sys.argv[2])
OUT = pathlib.Path(sys.argv[3])
H_BOARD = int(sys.argv[4])
GEN = REPO / "plans/design/gen"
E = html.escape
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
AT = 80000  # the replay moment

data = json.loads((REPO / "plans/design/sample-data.json").read_text())
SNAP = data["snapshots"]
SEED = {c["claim_id"]: c for c in json.loads((REPO / "fixtures/claims.json").read_text())}
DEC = {d["field_id"]: d for d in data["sample_decisions_4817_at_80s"]["decisions"]}


def run_events(cid):
    return [json.loads(l) for l in (REPO / "fixtures/runs" / f"{cid}.jsonl").read_text().splitlines() if l.strip()]


def clock(iso, plus_ms=0):
    """'18 Sep, 10:07' from an ISO time plus ms (same-day runs only)."""
    s = int(iso[11:13]) * 3600 + int(iso[14:16]) * 60 + int(iso[17:19]) + plus_ms // 1000
    return f"{int(iso[8:10])} {MON[int(iso[5:7]) - 1]}, {s // 3600:02d}:{s // 60 % 60:02d}"


def conf(c):
    return ("Low" if c < 0.6 else "Medium" if c < 0.85 else "High") + f" {round(c * 100)}%"


TAGS = {"low_confidence": "Low", "empty_value": "Empty", "value_not_in_citation": "Not in source", "no_source": "No source"}
SNAPKEY = {"CLM-2026-004817": "CLM-2026-004817@80s"}


def claim(q):
    cid = q["claim_id"]
    ev = run_events(cid)
    start = SEED[cid]["start_after_ms"]
    upto = None if start is None else AT - start
    seen = [e for e in ev if upto is None or e["at_ms"] <= upto]
    last = seen[-1]
    started = ev[0]["payload"]["started_at"]
    snap = SNAP[SNAPKEY.get(cid, cid + "@final")]
    reasons, need, decided = {}, 0, 0
    for f in snap["fields"]:
        d = DEC.get(f["field_id"]) if cid == "CLM-2026-004817" else None
        revised = d is not None and f["agent_version"] > d["based_on_version"]
        if d and not revised:
            decided += 1
            continue
        tags = ["Changed after you"] if revised else [TAGS[x] for x in f["flags"]]
        if tags:
            need += 1
            for t in tags:
                reasons[t] = reasons.get(t, 0) + 1
    st = q["status"]
    c = "—" if st in ("running", "queued") else ("— run failed" if st == "failed" else conf(q["overall_confidence"]))
    step = next((s for s in snap["steps"] if s["state"] == "running"), None)
    return dict(id=cid, name=q["claimant_name"], product=q["product"].capitalize(), pri=q["priority"], status=st,
                received=clock(q["received_at"]), updated=clock(started, last["at_ms"]), conf=c, need=need,
                reasons=reasons, decided=decided, total=len(snap["fields"]), steps=snap["steps"], step=step,
                error=snap.get("error"), short=cid[-4:])


ORDER = {"high": 0, "normal": 1, "low": 2}
CLAIMS = sorted((claim(q) for q in data["queue_at_80s"]), key=lambda c: (ORDER[c["pri"]], c["received"][:6], c["received"]))
# received sort: by real timestamp
CLAIMS.sort(key=lambda c: (ORDER[c["pri"]], next(q["received_at"] for q in data["queue_at_80s"] if q["claim_id"] == c["id"])))
COUNT_ST = {k: sum(1 for c in CLAIMS if c["status"] == k) for k in ("queued", "running", "needs_review", "failed", "reviewed")}
COUNT_PR = {k: sum(1 for c in CLAIMS if c["pri"] == k) for k in ("high", "normal", "low")}

# ---------- CSS: G-laptop's helmet + states.py's blocks + queue blocks ----------
ref = REF.read_text()
helmet = ref[ref.index("<helmet>") + len("<helmet>"): ref.index("</helmet>")]


def extra_of(path):
    s = (GEN / path).read_text()
    i = s.index('\nextra = r"""') + len('\nextra = r"""')
    return s[i: s.index('"""', i)]


extra = r"""
.qboard{font-family:Inter,system-ui,sans-serif}
.qbar{flex:none;height:56px;display:flex;align-items:center;gap:12px;padding:0 24px;background:var(--surface);border-bottom:1px solid var(--line);box-sizing:border-box}
.qbar h1{margin:0}
.live{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:16px;color:var(--ink-3);white-space:nowrap}
.qfilters{flex:none;display:flex;align-items:center;gap:16px;padding:16px 24px 8px}
.qfilters .lbl{font-size:12px;line-height:16px;color:var(--ink-3);white-space:nowrap}
.seg.q{display:flex}
.seg.q button{padding:0 12px}
.pri{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:16px;color:var(--ink-2);white-space:nowrap}
.pri .bars{display:inline-flex;align-items:flex-end;gap:2px;height:12px}
.pri .bars i{display:block;width:3px;border-radius:1px;background:var(--line-strong)}
.pri .bars i:nth-child(1){height:4px}.pri .bars i:nth-child(2){height:8px}.pri .bars i:nth-child(3){height:12px}
.pri .bars i.on{background:var(--ink)}
.pri.high{color:var(--ink);font-weight:600}
.need{display:inline-flex;align-items:center;gap:6px;font-family:"JetBrains Mono",monospace;font-size:12px;line-height:16px;font-weight:500;color:var(--attn);white-space:nowrap}
.need.none{color:var(--ink-3);font-weight:400}
.qt{width:100%;border-collapse:collapse;table-layout:fixed}
.qt th,.qt td{box-sizing:border-box}
.qt th{height:36px;padding:0 12px;text-align:left;font-family:"JetBrains Mono",monospace;font-size:11px;line-height:14px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);white-space:nowrap;border-bottom:1px solid var(--line)}
.qt th[aria-sort] span{color:var(--ink)}
.qt td{height:52px;padding:0 12px;border:0;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;line-height:18px}
.qt tbody tr{cursor:pointer}
.qt tbody tr:hover td,.qt tbody tr.is-hover td{background:var(--subtle)}
.qt a.ref{color:var(--ink);text-decoration:none;font-family:"JetBrains Mono",monospace;font-weight:500}
.qt a.ref:hover{text-decoration:underline}
.qt .dim{color:var(--ink-3)}
.qcard{display:flex;flex-direction:column;gap:8px;padding:12px 16px;border-radius:var(--r-md);background:var(--surface);color:var(--ink);text-decoration:none;cursor:pointer}
.qcard:hover,.qcard.is-hover{background:var(--subtle)}
.qlist{display:flex;flex-direction:column;gap:8px}
.qcard.is-sel{background:var(--surface);box-shadow:0 1px 3px rgba(15,29,58,.1),0 0 0 1.5px var(--ink)}
.qcard .l1{display:flex;align-items:center;gap:8px}
.qcard .l2{display:flex;align-items:center;gap:8px;font-size:13px;line-height:18px;color:var(--ink-2)}
.qcard .l3{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.qcard .meta{font-size:12px;line-height:16px;color:var(--ink-3);white-space:nowrap}
.qcard .meta b{font-family:"JetBrains Mono",monospace;font-weight:500;color:var(--ink-2)}
.next{display:flex;flex-direction:column;gap:12px;padding:20px 24px;border-radius:var(--r-lg);background:var(--surface);box-shadow:var(--lift)}
.next .facts{display:flex;gap:24px;flex-wrap:wrap}
.next .facts div{display:flex;flex-direction:column;gap:2px}
.next .facts dt{font-size:11px;line-height:14px;color:var(--ink-3)}
.next .facts dd{margin:0;font-family:"JetBrains Mono",monospace;font-size:12px;line-height:16px;font-weight:500;color:var(--ink)}
.rule{font-size:12px;line-height:16px;color:var(--ink-3)}
.prev{display:flex;flex-direction:column;min-height:0;background:var(--surface);border-left:1px solid var(--line)}
.prev .facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:0}
.prev .facts div{display:flex;flex-direction:column;gap:2px}
.prev .facts dt{font-size:11px;line-height:14px;color:var(--ink-3)}
.prev .facts dd{margin:0;font-family:"JetBrains Mono",monospace;font-size:13px;line-height:18px;font-weight:500}
.fmenu{justify-content:space-between;flex:1;min-width:0;font-weight:500}
.fmenu b{font-weight:600}
.cap{display:flex;align-items:baseline;gap:12px}
.url{font-family:"JetBrains Mono",monospace;font-size:12px;line-height:16px;color:var(--ink-2);background:var(--surface);border-radius:var(--r-sm);padding:2px 8px;box-shadow:var(--lift)}
"""
helmet = helmet.replace("</style>", extra_of("states.py") + extra + "</style>")


# ---------- icons ----------
def svg(d, sw="1.7", w=16):
    paths = "".join(f'<path d="{p}"></path>' for p in d.split("|"))
    return f'<svg width="{w}" height="{w}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="{sw}" aria-hidden="true" style="flex: none">{paths}</svg>'


TRI = '<svg class="tri" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>'
OK = '<svg class="ok" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8.5 3 3 7-7"></path></svg>'
DONE_SM = '<span class="g g-done g-sm" aria-hidden="true"></span>'
ATTN = '<span class="g g-attn" aria-hidden="true"></span>'
ATTN_SM = '<span class="g g-attn g-sm" aria-hidden="true"></span>'
CHEV = svg("m6 4 4 4-4 4", "2", 12)
CHEVD = svg("m4 6 4 4 4-4", "2", 12)
SORTD = svg("M8 3v10M4 9l4 4 4-4", "1.8", 12)
ARROW = svg("M3 8h10M9 4l4 4-4 4", "1.8")


def chip(st):
    return {
        "queued": '<span class="chip">Queued</span>',
        "running": '<span class="chip"><span class="dot"></span>Running</span>',
        "needs_review": '<span class="chip">Needs review</span>',
        "failed": f'<span class="chip attn">{TRI}Run failed</span>',
        "reviewed": f'<span class="chip you">{DONE_SM}Reviewed</span>',
    }[st]


def pri(p):
    n = {"high": 3, "normal": 2, "low": 1}[p]
    bars = "".join(f'<i class="{"on" if i < n else ""}"></i>' for i in range(3))
    return f'<span class="pri {p}"><span class="bars" aria-hidden="true">{bars}</span>{p.capitalize()}</span>'


def need(c, words=False):
    if c["need"] == 0:
        return f'<span class="need none">{"0 need you" if words else "0"}</span>'
    return f'<span class="need">{ATTN_SM}{c["need"]}{" need you" if words else ""}</span>'


def reason_tags(c):
    order = ["Changed after you", "Low", "Empty", "Not in source", "No source"]
    return "".join(f'<span class="tag attn">{t} {c["reasons"][t]}</span>' for t in order if t in c["reasons"])


def rlabel(c):
    return (f'{c["id"]}, {c["name"]}, {c["product"]}, {c["pri"]} priority, {chip_text(c["status"])}, '
            f'{c["need"]} need you, confidence {c["conf"]}, received {c["received"]}, updated {c["updated"]}')


def chip_text(st):
    return {"queued": "queued", "running": "running", "needs_review": "needs review", "failed": "run failed", "reviewed": "reviewed"}[st]


# ---------- shared screen parts ----------
def qbar(phone=False, count=True, live=True):
    pad = ' style="padding: 0 16px"' if phone else ""
    lv = '<span class="live"><span class="dot"></span>Live</span>' if live else ""
    n = f'<span class="t-sm ink-3">{len(CLAIMS)} claims</span>' if count else ""
    return f'<header class="qbar"{pad}><h1 class="serif t-lg">Claims queue</h1>{lv}<span style="flex: 1"></span>{n}</header>'


ST_KEYS = [("all", "All"), ("queued", "Queued"), ("running", "Running"), ("needs_review", "Needs review"), ("failed", "Failed"), ("reviewed", "Reviewed")]
PR_KEYS = [("all", "All"), ("high", "High"), ("normal", "Normal"), ("low", "Low")]


def facet(claims, st, pr):
    """Counts per option, each within the other filter (so a pressed option's count is what you see)."""
    in_pr = [c for c in claims if pr == "all" or c["pri"] == pr]
    in_st = [c for c in claims if st == "all" or c["status"] == st]
    cs = {k: (len(in_pr) if k == "all" else sum(1 for c in in_pr if c["status"] == k)) for k, _ in ST_KEYS}
    cp = {k: (len(in_st) if k == "all" else sum(1 for c in in_st if c["pri"] == k)) for k, _ in PR_KEYS}
    return cs, cp


def seg_status(claims=None, st="all", pr="all"):
    cs, _ = facet(CLAIMS if claims is None else claims, st, pr)
    b = "".join(f'<button aria-pressed="{"true" if k == st else "false"}">{t} <span class="n">{cs[k]}</span></button>' for k, t in ST_KEYS)
    return f'<div class="seg q" role="group" aria-label="Status">{b}</div>'


def seg_pri(claims=None, st="all", pr="all"):
    _, cp = facet(CLAIMS if claims is None else claims, st, pr)
    b = "".join(f'<button aria-pressed="{"true" if k == pr else "false"}">{t} <span class="n">{cp[k]}</span></button>' for k, t in PR_KEYS)
    return f'<div class="seg q" role="group" aria-label="Priority">{b}</div>'


def filters_l(claims=None, st="all", pr="all"):
    return (f'<div class="qfilters"><span class="lbl">Status</span>{seg_status(claims, st, pr)}'
            f'<span class="lbl" style="margin-left: 8px">Priority</span>{seg_pri(claims, st, pr)}</div>')


def filters_p(st="all", pr="all"):
    sl, pl = dict(ST_KEYS)[st], dict(PR_KEYS)[pr]
    return (f'<div class="qfilters" style="padding: 12px 16px 4px; gap: 8px">'
            f'<button class="btn fmenu" aria-haspopup="listbox"><span>Status: <b>{sl}</b></span>{CHEVD}</button>'
            f'<button class="btn fmenu" aria-haspopup="listbox"><span>Priority: <b>{pl}</b></span>{CHEVD}</button></div>')


def table(rows, hover=None, links=None):
    links = links or {}
    cols = [("Priority", 96, True), ("Reference", 160, False), ("Claimant", 160, False), ("Product", 88, False), ("Status", 140, False),
            ("Needs you", 96, False), ("Confidence", 136, False), ("Received", 120, False), ("Updated", 120, False), ("", 44, False)]
    th = "".join((f'<th aria-sort="descending" style="width: {w}px"><span>{t}</span> {SORTD}</th>' if s else f'<th style="width: {w}px">{t}</th>') for t, w, s in cols)
    tr = ""
    for c in rows:
        h = ' class="is-hover"' if hover == c["id"] else ""
        href = links.get(c["id"], "#")
        tr += (f'<tr{h}><td>{pri(c["pri"])}</td><td><a href="{href}" class="ref" aria-label="{E(rlabel(c))}">{c["id"]}</a></td>'
               f'<td>{E(c["name"])}</td><td class="dim">{c["product"]}</td><td>{chip(c["status"])}</td><td>{need(c)}</td>'
               f'<td class="mono t-sm">{c["conf"]}</td><td class="mono t-sm dim">{c["received"]}</td><td class="mono t-sm dim">{c["updated"]}</td>'
               f'<td style="padding: 0 8px; text-overflow: clip"><a href="{href}" class="ib" aria-hidden="true" tabindex="-1" style="width: 28px; height: 28px; color: var(--ink-3)">{CHEV}</a></td></tr>')
    return f'<table class="qt"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


def card(c, sel=False, tags=False, hover=False, href="#"):
    cls = " is-sel" if sel else (" is-hover" if hover else "")
    t = f'<div class="l3">{reason_tags(c)}</div>' if tags and c["reasons"] else ""
    cur = ' aria-current="true"' if sel else ""
    return (f'<a href="{href}" class="qcard{cls}" aria-label="{E(rlabel(c))}"{cur}>'
            f'<div class="l1"><span class="mono t-md" style="font-weight: 500">{c["id"]}</span><span style="flex: 1"></span>{chip(c["status"])}</div>'
            f'<div class="l2"><span style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{E(c["name"])} · {c["product"]}</span>{pri(c["pri"])}</div>'
            f'<div class="l3">{need(c, True)}<span class="meta">Confidence <b>{c["conf"]}</b></span></div>'
            f'<div class="meta">Received {c["received"]} · Updated {c["updated"]}</div>{t}</a>')


def lap(body):
    return f'<div class="app" style="width: 1280px; height: 800px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">{qbar()}{filters_l()}{body}</div>'


def ph(body):
    return f'<div class="app phone" style="width: 375px; height: 844px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">{qbar(True)}{filters_p()}{body}</div>'


# ---------- option A: the work list ----------
A_L = lap(f'<main style="flex: 1; min-height: 0; overflow-y: auto; padding: 8px 24px 24px"><div style="background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--lift); overflow: hidden">{table(CLAIMS, hover="CLM-2026-004822")}</div>'
          f'<p class="rule" style="margin: 12px 0 0">Sorted by priority, then oldest received. Click a column to sort by it.</p></main>')
A_P = ph(f'<main class="pane" style="flex: 1; padding: 4px 0 16px"><div class="rule" style="padding: 4px 16px 8px">Priority, then oldest received</div>'
         f'<div style="display: flex; flex-direction: column; gap: 8px; padding: 0 16px">{"".join(card(c) for c in CLAIMS)}</div></main>')

# ---------- option B: next up ----------
NEXT, REST = CLAIMS[0], CLAIMS[1:]


def next_card(c, phone=False):
    s = c["step"]
    stepline = (f'<span class="t-sm ink-2" style="display: inline-flex; align-items: center; gap: 6px"><span class="dot"></span>Agent: {E(s["label"])}</span>' if s else "")
    facts = [("Received", c["received"]), ("Updated", c["updated"]), ("Confidence", c["conf"]), ("Decided", f'{c["decided"]} of {c["total"]}')]
    fhtml = "".join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in facts)
    fst = "display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px" if phone else "gap: 24px"
    pad = ' style="padding: 16px"' if phone else ""
    wide = "; width: 100%" if phone else ""
    rule_in = "" if phone else '<span class="rule">Highest priority first, then most fields that need you, then oldest. You can start while the agent works.</span>'
    rule_out = '<span class="rule">Highest priority, then most that need you, then oldest.</span>' if phone else ""
    return (f'<section class="next" aria-labelledby="next-h"{pad}>'
            f'<div style="display: flex; align-items: center; gap: 8px"><span class="eyebrow ink-3" id="next-h">Next up</span><span style="flex: 1"></span>{pri(c["pri"])}</div>'
            f'<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap"><span class="mono t-lg" style="font-weight: 500">{c["id"]}</span>{chip(c["status"])}{"" if phone else stepline}</div>'
            f'<div class="t-md ink-2">{E(c["name"])} · {c["product"]}</div>'
            f'<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">{need(c, True)}{reason_tags(c)}</div>'
            f'<dl class="facts" style="margin: 0; {fst}">{fhtml}</dl>'
            f'<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px"><a href="#" class="btn btn-primary" style="text-decoration: none{wide}">Start review{ARROW}</a>'
            f'{rule_in}</div>'
            f'{rule_out}</section>')


B_L = lap(f'<main style="flex: 1; min-height: 0; overflow-y: auto; padding: 8px 24px 24px; display: flex; flex-direction: column; gap: 24px">{next_card(NEXT)}'
          f'<section style="display: flex; flex-direction: column; gap: 8px"><h2 class="eyebrow ink-3" style="margin: 0">Then · {len(REST)}</h2>'
          f'<div style="background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--lift); overflow: hidden">{table(REST)}</div></section></main>')
B_P = ph(f'<main class="pane" style="flex: 1; padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 16px">{next_card(NEXT, True)}'
         f'<section style="display: flex; flex-direction: column; gap: 4px"><h2 class="eyebrow ink-3" style="margin: 0 0 4px">Then · {len(REST)}</h2>'
         f'<div style="display: flex; flex-direction: column; gap: 8px">{"".join(card(c) for c in REST)}</div></section></main>')

# ---------- option C: list + preview ----------
SEL = CLAIMS[0]


def steps_list(c):
    out = []
    for s in c["steps"]:
        mark = {"ok": OK, "warning": ATTN, "running": '<span class="dot" style="margin: 4px"></span>', "failed": TRI}[s["state"]]
        note = E(s["note"]) if s["note"] else ""
        out.append(f'<li>{mark}<span class="lab{"" if s["state"] in ("running", "failed") or note else " dim"}">{E(s["label"])}</span><span class="note">{note}</span></li>')
    return f'<ol class="steps" aria-label="Agent steps" style="padding: 0">{"".join(out)}</ol>'


def attn_rows(cid):
    """The fields that need you in 4817 at 80 s, as list rows (open the review at that field)."""
    rows = []
    for f in SNAP[SNAPKEY.get(cid, cid + "@final")]["fields"]:
        d = DEC.get(f["field_id"])
        revised = d is not None and f["agent_version"] > d["based_on_version"]
        if d and not revised:
            continue
        tags = ["Changed after you"] if revised else [TAGS[x] for x in f["flags"]]
        if not tags:
            continue
        lvl = f'{TAGS["low_confidence"]} {round(f["confidence"] * 100)}%' if "Low" in tags else tags[0]
        rows.append((f["label"], lvl))
    return "".join(f'<a href="#" class="row" style="width: 100%; margin: 0; text-decoration: none"><span class="g g-attn" aria-hidden="true"></span><span class="t-base" style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{E(n)}</span><span class="tag attn">{t}</span></a>' for n, t in rows)


def preview(c):
    facts = [("Received", c["received"]), ("Updated", c["updated"]), ("Confidence", c["conf"]), ("Decided", f'{c["decided"]} of {c["total"]}')]
    fhtml = "".join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in facts)
    return (f'<aside class="prev" aria-label="Claim preview"><div style="flex: 1; min-height: 0; overflow-y: auto; padding: 24px 32px; display: flex; flex-direction: column; gap: 20px">'
            f'<div style="display: flex; flex-direction: column; gap: 8px"><div style="display: flex; align-items: center; gap: 12px"><h2 class="mono t-lg" style="margin: 0; font-weight: 500">{c["id"]}</h2>{chip(c["status"])}<span style="flex: 1"></span>{pri(c["pri"])}</div>'
            f'<div class="t-md ink-2">{E(c["name"])} · {c["product"]}</div></div>'
            f'<dl class="facts">{fhtml}</dl>'
            f'<section style="display: flex; flex-direction: column; gap: 8px"><h3 class="eyebrow ink-3" style="margin: 0; display: flex; align-items: center; gap: 8px">Needs you <span class="need" style="letter-spacing: 0">{c["need"]}</span></h3>'
            f'<div style="display: flex; flex-direction: column; margin: 0 -8px">{attn_rows(c["id"])}</div></section>'
            f'<section style="display: flex; flex-direction: column; gap: 8px"><h3 class="eyebrow ink-3" style="margin: 0">Agent steps</h3>{steps_list(c)}</section></div>'
            f'<div style="flex: none; display: flex; align-items: center; gap: 12px; padding: 16px 32px; border-top: 1px solid var(--line)"><a href="#" class="btn btn-primary" style="text-decoration: none">Open review{ARROW}</a><span class="rule">J / K move through the queue · Enter opens</span></div></aside>')


C_L = lap(f'<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 440px minmax(0, 1fr); margin-top: 8px; border-top: 1px solid var(--line)">'
          f'<nav class="pane" aria-label="Claims" style="padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 8px">{"".join(card(c, sel=(c is SEL), hover=(c["id"] == "CLM-2026-004822")) for c in CLAIMS)}</nav>'
          f'{preview(SEL)}</div>')
C_P = ph(f'<main class="pane" style="flex: 1; padding: 4px 0 16px"><div style="display: flex; flex-direction: column; gap: 8px; padding: 0 16px">{"".join(card(c, tags=True) for c in CLAIMS)}</div></main>')


# ---------- boards ----------
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


W_BOARD = 40 + 1280 + 80 + 375 + 40
URL = '<span class="url">/queue</span><span class="t-sm ink-3">no filter = all claims, reviewed included · a filter writes <span class="mono">?status=needs_review&amp;priority=high</span></span>'


def board(label, lap_html, ph_html):
    return f'''<div class="app qboard" style="width: {W_BOARD}px; height: {H_BOARD}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 16px; background: var(--bg)">
<div class="cap"><span class="eyebrow ink-3">{label} · queue at 80 s</span>{URL}</div>
<div style="display: flex; gap: 80px; align-items: flex-start">
<section style="display: flex; flex-direction: column; gap: 12px"><span class="t-sm ink-3">Laptop 1280 × 800</span><div class="frame" style="width: 1280px; height: 800px">{lap_html}</div></section>
<section style="display: flex; flex-direction: column; gap: 12px"><span class="t-sm ink-3">Phone 375 × 844</span><div class="frame" style="width: 375px; height: 844px">{ph_html}</div></section>
</div></div>'''


(OUT / "project").mkdir(parents=True, exist_ok=True)
for key, label, l, p in [("a", "Option A · Work list", A_L, A_P), ("b", "Option B · Next up", B_L, B_P), ("c", "Option C · List and preview", C_L, C_P)]:
    t = page(label, board(label, l, p), W_BOARD, H_BOARD)
    (OUT / f"project/Q-option-{key}.dc.html").write_text(t)
    print(key, len(t))
for c in CLAIMS:
    print(c["id"], c["pri"], c["status"], c["received"], c["updated"], c["conf"], c["need"], c["reasons"], c["decided"], c["total"])


# =====================================================================
# Step 2: the chosen option (A, work list) as clickable screens, plus its states
# =====================================================================
TRI_BIG = '<svg class="tri" width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>'
RETRY = svg("M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3", "1.6")
LINK_L = {"CLM-2026-004817": "G-proto-laptop.dc.html"}
LINK_P = {"CLM-2026-004817": "G-proto-phone.dc.html"}
CARD_L = 'background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--lift); overflow: hidden'
RULE_L = '<p class="rule" style="margin: 12px 0 0">Sorted by priority, then oldest received. Click a column to sort by it.</p>'
RULE_P = '<div class="rule" style="padding: 4px 16px 8px">Priority, then oldest received</div>'


def shell_l(header, filters, body):
    return f'<div class="app" style="width: 1280px; height: 800px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">{header}{filters}{body}</div>'


def shell_p(header, filters, body):
    return f'<div class="app phone" style="width: 375px; height: 844px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">{header}{filters}{body}</div>'


def bar(phone=False, n=None, live=True):
    pad = ' style="padding: 0 16px"' if phone else ""
    lv = '<span class="live"><span class="dot"></span>Live</span>' if live else ""
    cnt = f'<span class="t-sm ink-3">{n} claims</span>' if n is not None else ""
    return f'<header class="qbar"{pad}><h1 class="serif t-lg">Claims queue</h1>{lv}<span style="flex: 1"></span>{cnt}</header>'


def msg(inner):
    return f'<div class="msg">{inner}</div>'


def in_card_l(inner):
    """A message where the table would be: same card, centred."""
    return (f'<main style="flex: 1; min-height: 0; padding: 8px 24px 24px; display: flex; flex-direction: column">'
            f'<div style="{CARD_L}; flex: 1; display: flex; align-items: center; justify-content: center">{msg(inner)}</div></main>')


def in_page_p(inner):
    return f'<main style="flex: 1; min-height: 0; padding: 48px 24px; display: flex; flex-direction: column; align-items: flex-start">{msg(inner)}</main>'


def centred_l(inner):
    return f'<main style="flex: 1; display: flex; align-items: center; justify-content: center; background: var(--surface)">{msg(inner)}</main>'


# the chosen screens (Play: the 4817 row opens the review prototype)
Q_LAP = shell_l(bar(n=len(CLAIMS)), filters_l(),
                f'<main style="flex: 1; min-height: 0; overflow-y: auto; padding: 8px 24px 24px"><div style="{CARD_L}">{table(CLAIMS, links=LINK_L)}</div>{RULE_L}</main>')
Q_PH = shell_p(bar(True, len(CLAIMS)), filters_p(),
               f'<main class="pane" style="flex: 1; padding: 4px 0 16px">{RULE_P}<div style="display: flex; flex-direction: column; gap: 8px; padding: 0 16px">'
               + "".join(card(c, href=LINK_P.get(c["id"], "#")) for c in CLAIMS) + '</div></main>')


# --- loading ---
def sk(w, h, extra=""):
    return f'<span class="sk" style="width: {w}; height: {h}px{extra}"></span>'


SEG_SK = sk("440px", 32, "; border-radius: var(--r-md)") + sk("220px", 32, "; border-radius: var(--r-md)")
TH = "".join(f'<th style="width: {w}px">{t}</th>' for t, w in [("Priority", 96), ("Reference", 160), ("Claimant", 160), ("Product", 88), ("Status", 140), ("Needs you", 96), ("Confidence", 136), ("Received", 120), ("Updated", 120), ("", 44)])
SK_TR = "".join("<tr>" + "".join(f'<td>{sk(w, 10)}</td>' for w in ws) + "<td></td></tr>"
                for ws in [("56px", "120px", "100px", "48px", "84px", "24px", "72px", "88px", "88px"),
                           ("64px", "120px", "88px", "56px", "96px", "16px", "64px", "88px", "88px"),
                           ("48px", "120px", "112px", "48px", "84px", "24px", "80px", "88px", "88px"),
                           ("56px", "120px", "96px", "60px", "96px", "16px", "72px", "88px", "88px")])
L_LOAD = (f'<div class="app" aria-busy="true" style="width: 1280px; height: 800px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">'
          f'<span class="sr" role="status">Loading claims</span>{bar(live=False)}'
          f'<div class="qfilters"><span class="lbl">Status</span>{sk("440px", 32, "; border-radius: var(--r-md)")}<span class="lbl" style="margin-left: 8px">Priority</span>{sk("220px", 32, "; border-radius: var(--r-md)")}</div>'
          f'<main style="flex: 1; padding: 8px 24px 24px"><div style="{CARD_L}"><table class="qt"><thead><tr>{TH}</tr></thead><tbody>{SK_TR}</tbody></table></div></main></div>')
SK_CARD = (f'<div class="qcard" style="cursor: default"><div class="l1">{sk("140px", 14)}<span style="flex: 1"></span>{sk("88px", 24, "; border-radius: var(--r-full)")}</div>'
           f'<div class="l2">{sk("150px", 12)}<span style="flex: 1"></span>{sk("56px", 12)}</div><div class="l3">{sk("180px", 10)}</div><div>{sk("240px", 10)}</div></div>')
P_LOAD = (f'<div class="app phone" aria-busy="true" style="width: 375px; height: 844px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">'
          f'<span class="sr" role="status">Loading claims</span>{bar(True, live=False)}'
          f'<div class="qfilters" style="padding: 12px 16px 4px; gap: 8px">{sk("50%", 44, "; border-radius: var(--r-md)")}{sk("50%", 44, "; border-radius: var(--r-md)")}</div>'
          f'<main style="flex: 1; padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 8px"><div style="padding: 4px 0 0">{sk("160px", 10)}</div>{SK_CARD * 4}</main></div>')

# --- empty queue ---
EMPTY = '<h2 class="serif t-xl">No claims in the queue</h2><p class="t-md ink-2">New claims appear here as they arrive.</p>'
L_EMPTY = shell_l(bar(n=0), filters_l([]), in_card_l(EMPTY))
P_EMPTY = shell_p(bar(True, 0), filters_p(), in_page_p(EMPTY))

# --- no matches (a combined filter) ---
NM_ST, NM_PR = "failed", "high"
NOMATCH = (f'<h2 class="serif t-xl">No claims match</h2><p class="t-md ink-2">None are Failed with High priority.</p>'
           f'<a href="#" class="btn btn-primary is-focus" style="text-decoration: none">Clear filter</a>')
L_NOMATCH = shell_l(bar(n=len(CLAIMS)), filters_l(CLAIMS, NM_ST, NM_PR), in_card_l(NOMATCH))
P_NOMATCH = shell_p(bar(True, len(CLAIMS)), filters_p(NM_ST, NM_PR), in_page_p(NOMATCH))

# --- invalid filter in the URL (the value is shown as text, never trusted) ---
BAD = "done"
INVALID = (f'<h2 class="serif t-xl">That filter doesn\'t exist</h2><p class="t-md ink-2"><span class="mono">status={E(BAD)}</span> isn\'t a status. '
           f'Use Queued, Running, Needs review, Failed or Reviewed.</p><a href="#" class="btn btn-primary is-focus" style="text-decoration: none">Show all claims</a>')
L_INVALID = shell_l(bar(live=False), "", centred_l(INVALID))
P_INVALID = shell_p(bar(True, live=False), "", in_page_p(INVALID))

# --- backend unreachable ---
DOWN = f'{TRI_BIG}<h2 class="serif t-xl">Can\'t reach the server</h2><p class="t-md ink-2">Check your connection, then try again.</p><button class="btn btn-primary is-focus">{RETRY}Try again</button>'
L_DOWN = shell_l(bar(live=False), "", centred_l(DOWN))
P_DOWN = shell_p(bar(True, live=False), "", in_page_p(DOWN))

STATES = [
    ("Loading", "/queue", "Skeleton shaped like the table; no counts yet.", L_LOAD, P_LOAD),
    ("Empty queue", "/queue", "No claims at all. Filters stay, every count 0; nothing to clear.", L_EMPTY, P_EMPTY),
    ("No matches", f"/queue?status={NM_ST}&amp;priority={NM_PR}", "Both filters set; counts are within the other filter. Clear filter goes back to /queue.", L_NOMATCH, P_NOMATCH),
    ("Invalid filter", f"/queue?status={E(BAD)}", "Unknown value in the address bar (the backend answers 400). The value is shown as text.", L_INVALID, P_INVALID),
    ("Backend unreachable", "/queue", "First load fails. Plain message and retry; no Live dot.", L_DOWN, P_DOWN),
]


def tile(t, url, note, scr, w, h):
    return (f'<section style="display: flex; flex-direction: column; gap: 8px; width: {w}px"><div style="display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap">'
            f'<h2 class="serif t-lg" style="margin: 0">{t}</h2><span class="url">{url}</span></div><span class="t-sm ink-3" style="min-height: 32px">{note}</span>'
            f'<div class="frame" style="width: {w}px; height: {h}px">{scr}</div></section>')


H_SL, H_SP = int(sys.argv[5]), int(sys.argv[6])
W_SL = 40 + 1280 + 64 + 1280 + 40
W_SP = 40 + 5 * 375 + 4 * 56 + 40
body_sl = (f'<div class="app qboard" style="width: {W_SL}px; height: {H_SL}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">'
           f'<div class="eyebrow ink-3">Queue (option A) · states · laptop 1280 × 800 (live queue: Q-laptop)</div>'
           f'<div style="display: grid; grid-template-columns: 1280px 1280px; gap: 56px 64px; align-items: start">{"".join(tile(t, u, n, l, 1280, 800) for t, u, n, l, _ in STATES)}</div></div>')
body_sp = (f'<div class="app qboard" style="width: {W_SP}px; height: {H_SP}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">'
           f'<div class="eyebrow ink-3">Queue (option A) · states · phone 375 × 844 (live queue: Q-phone)</div>'
           f'<div style="display: flex; gap: 56px; align-items: flex-start">{"".join(tile(t, u, n, p, 375, 844) for t, u, n, _, p in STATES)}</div></div>')

for name, title, body, w, h in [("Q-laptop", "Claims queue, laptop", Q_LAP, 1280, 800), ("Q-phone", "Claims queue, phone", Q_PH, 375, 844),
                                ("Q-states-laptop", "Queue states, laptop", body_sl, W_SL, H_SL), ("Q-states-phone", "Queue states, phone", body_sp, W_SP, H_SP)]:
    t = page(title, body, w, h)
    (OUT / f"project/{name}.dc.html").write_text(t)
    print(name, w, "x", h, len(t))
