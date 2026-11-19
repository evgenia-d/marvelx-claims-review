"""Builds the round 3 interactive prototype: the review screen replaying the real runs.

Two artboards, one per width, each with a small prototype panel under the screen:
  G-proto-laptop.dc.html (1280, the screen is 1280 x 800)
  G-proto-phone.dc.html  (375, the screen is 375 x 844)

The run events are embedded as they are in fixtures/runs/*.jsonl and folded in the page,
dropping duplicate seq (4817 seq 42 arrives twice). Documents come from fixtures/documents/,
sample reviewer decisions from sample-data.json. CSS is G-laptop's helmet plus the extras in
build.py and states.py (the same set G-tokens / G-blocks show), plus `extra` below, which
tokens.py also loads so every new rule is on the building-block sheet.

Back to queue links to Q-laptop / Q-phone (round 4).

Run from the repo root:
  python3 -I plans/design/gen/proto.py . <out> <laptop_h> <phone_h>
The heights are the frame heights; keep them equal to canvas.json.
"""
import json, re, sys, pathlib

REPO = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(".")
OUT = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
H_LAP = int(sys.argv[3]) if len(sys.argv) > 3 else 884
H_PH = int(sys.argv[4]) if len(sys.argv) > 4 else 1032
GEN = REPO / "plans/design/gen"
FX = REPO / "fixtures"

# Prototype-only rules. tokens.py reads this block too (extra_of), so G-blocks shows them.
extra = r"""
.dev{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 16px;background:var(--surface);border-top:1px solid var(--line);box-sizing:border-box}
.dev .eyebrow{flex-basis:100%}
.scrub{flex:1 1 160px;min-width:0;height:28px;margin:0;accent-color:var(--ink);cursor:pointer}
.scrub[disabled]{cursor:not-allowed;opacity:.4}
.menu{position:absolute;right:0;bottom:calc(100% + 4px);z-index:3;width:280px;max-height:560px;overflow-y:auto;display:flex;flex-direction:column;padding:4px;background:var(--surface);border-radius:var(--r-md);box-shadow:var(--lift);box-sizing:border-box}
.menu button{display:block;width:100%;height:32px;padding:0 8px;border:0;border-radius:var(--r-sm);background:transparent;color:var(--ink);font-size:13px;line-height:18px;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.menu button:hover{background:var(--subtle)}
.phone .menu button{height:44px}
.row.fresh{animation:fresh .4s ease-out}
@keyframes fresh{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.row.fresh{animation:none}}
.sec[aria-current="true"]{color:var(--ink)}
.tw .tip{display:none}.tw:hover .tip,.tw:focus-within .tip{display:block}
.v-long.all .val{display:block;-webkit-line-clamp:unset;overflow:visible}
"""

if OUT is None:  # imported by tokens.py for `extra` only
    raise SystemExit

# ---------- CSS: the same composition as tokens.py ----------
lap = (GEN / "ref-G-laptop.dc.html").read_text()
helmet = lap[lap.index("<helmet>") + 8: lap.index("</helmet>")]
card = (GEN / "ref-G-card-field.dc.html").read_text()
card_rules = "".join(re.findall(r"^\.(?:card|card \.top|card \.body|lbl)\{[^}]*\}\n", card, flags=re.M))
card_rules += ".phone .pf .btn{height:48px;padding:0 8px}.phone details.dis summary{height:48px;padding:0 16px}\n"


def extra_of(path):
    s = (GEN / path).read_text()
    i = s.index('extra = r"""') + len('extra = r"""')
    return s[i: s.index('"""', i)]


b_extra = "\n".join(l for l in extra_of("build.py").splitlines()
                    if not l.startswith((".prop ", ".src.none", ".cite.none", ".rowgrid", ".board")))
s_extra = "\n".join(l for l in extra_of("states.py").splitlines() if not l.startswith((".board", ".frame")))
fix = "\n.band.alert{display:block;min-height:0;padding:0;gap:0}\n"
helmet = helmet.replace("</style>", card_rules + b_extra + s_extra + fix + extra + "</style>")

# ---------- data ----------
sample = json.loads((REPO / "plans/design/sample-data.json").read_text())
claims = {c["claim_id"]: c for c in json.loads((FX / "claims.json").read_text())}
docidx = json.loads((FX / "documents/index.json").read_text())
runs, started, dur = {}, {}, {}
for cid, c in claims.items():
    ev = [json.loads(l) for l in (FX / c["run"]).read_text().splitlines() if l.strip()]
    assert all(a["at_ms"] <= b["at_ms"] for a, b in zip(ev, ev[1:])), cid
    runs[cid] = ev
    st = ev[0]["payload"]["started_at"]
    started[cid] = int(st[11:13]) * 3600 + int(st[14:16]) * 60 + int(st[17:19])
    dur[cid] = ev[-1]["at_ms"]
docs = {d["document_id"]: {"title": d["title"], "text": (FX / f"documents/{d['document_id']}.txt").read_text()}
        for d in docidx if d["claim_id"] in claims}
meta = {cid: {"name": c["claimant_name"], "product": c["product"].capitalize(), "received": c["received_at"][11:16],
              "preloaded": c["start_after_ms"] is None} for cid, c in claims.items()}
# Fixed groups, fixed order (brief section 8). Fields appear in place; the list never re-sorts.
groups = {
    "CLM-2026-004817": [
        ("Incident", ["claim_type", "police_report_number", "incident_date", "incident_time", "incident_location", "road_conditions",
                      "injuries_reported", "incident_narrative", "statement_date", "claimant_injured"]),
        ("Parties", ["policyholder_name", "claimant_phone", "claimant_email", "third_party_name", "third_party_plate",
                     "third_party_insurer", "third_party_policy_number", "witness_name", "witness_phone"]),
        ("Vehicle and damage", ["policyholder_vehicle", "policyholder_plate", "vehicle_mileage", "damage_description", "vehicle_drivable"]),
        ("Repair costs", ["garage_name", "invoice_number", "invoice_date", "repair_completed_date", "parts_total", "labour_hours",
                          "labour_rate", "labour_total", "paint_materials", "supplements_total", "courtesy_car_days",
                          "subtotal_excl_vat", "vat_amount", "total_incl_vat"]),
        ("Policy and cover", ["policy_number", "cover_type", "policy_start_date", "policy_end_date", "excess", "courtesy_car_cover",
                              "courtesy_car_limit_days", "no_claims_years", "courtesy_car_within_limit"]),
        ("Assessment", ["liability_assessment", "estimated_payable"]),
    ],
    "CLM-2026-004822": [("Incident", ["claim_type", "discovered_at", "cause_of_damage", "rooms_affected"]),
                        ("Repair", ["repairer", "visit_date", "repair_cost"]),
                        ("Contents", ["damaged_items", "estimated_contents_loss"])],
    "CLM-2026-004809": [("Incident", ["claim_type", "damage"]), ("Vehicle", ["vehicle", "plate"]),
                        ("Repair costs", ["repair_cost"]), ("Policy and cover", ["glass_covered", "excess"])],
    "CLM-2026-004830": [("Incident", ["claim_type", "police_report_number", "theft_date", "theft_location"]),
                        ("Bicycle", ["bicycle", "frame_number", "locked"]), ("Purchase", ["purchase_date", "purchase_price"])],
}
for cid, gs in groups.items():  # every field of every run has a group
    have = {e["payload"]["field_id"] for e in runs[cid] if e["type"] == "field_extracted"}
    listed = [f for _, ids in gs for f in ids]
    assert have == set(listed) and len(listed) == len(set(listed)), (cid, have ^ set(listed))
dec = sample["sample_decisions_4817_at_80s"]["decisions"]
DATA = {"runs": runs, "started": started, "dur": dur, "docs": docs, "meta": meta, "groups": groups,
        "notChecked": {"CLM-2026-004822": "Policy and cover"}, "sample": dec}

# ---------- icons (same paths as build.py / states.py / tokens.py) ----------
def svg(d, sw="1.7", w=16, extra_attr=""):
    paths = "".join(f'<path d="{p}"></path>' for p in d.split("|"))
    return f'<svg width="{w}" height="{w}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="{sw}" aria-hidden="true"{extra_attr}>{paths}</svg>'


I = {
    "BACK": svg("M10 3 5 8l5 5"), "BACK18": svg("M10 3 5 8l5 5", w=18),
    "UP": svg("m4 10 4-4 4 4"), "DOWN": svg("m4 6 4 4 4-4"),
    "UP18": svg("m4 10 4-4 4 4", w=18), "DOWN18": svg("m4 6 4 4 4-4", w=18),
    "SKIP": svg("m4 4 4 4-4 4M9 4l4 4-4 4"), "SKIP18": svg("m4 4 4 4-4 4M9 4l4 4-4 4", w=18),
    "UNDO": svg("M4 6h6a3 3 0 0 1 0 6H7M4 6l3-3M4 6l3 3"), "UNDO18": svg("M4 6h6a3 3 0 0 1 0 6H7M4 6l3-3M4 6l3 3", w=18),
    "RETRY": svg("M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3", "1.6"),
    "CLOSE18": svg("M4 4l8 8M12 4l-8 8", w=18),
    "PLAY": svg("M5 3.5v9l7-4.5z", "1.6"), "PAUSE": svg("M5.5 3.5v9M10.5 3.5v9", "1.8"),
    "LOCK": svg("M4.5 7.5h7v6h-7zM6 7.5V5.5a2 2 0 0 1 4 0v2", "1.5", 12),
    "WARN": svg("M8 2 14.5 13.5h-13z|M8 6.5v3M8 11.3v.2", "1.6", 16, ' style="flex: none"'),
    "DOC": '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.5" aria-hidden="true" style="flex: none"><path d="M4 1.5h5.5L12.5 4.5v10h-8.5z"></path><path d="M9.5 1.5v3h3"></path></svg>',
    "CHEV": '<svg class="chev" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="2" aria-hidden="true"><path d="m6 4 4 4-4 4"></path></svg>',
    "CHEV12": svg("m6 4 4 4-4 4", "2", 12),
    "SCHEV": '<svg class="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" style="{{s.rot}}"><path d="m6 4 4 4-4 4"></path></svg>',
    "DCHEV": '<svg class="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 4 4 4-4 4"></path></svg>',
    "OK": '<svg class="ok" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8.5 3 3 7-7"></path></svg>',
    "TRI": '<svg class="tri" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>',
    "TRI_BIG": '<svg class="tri" width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>',
    "RIGHT": '<svg class="arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.6" role="img" aria-label="changed to"><path d="M3 8h10M9 4l4 4-4 4"></path></svg>',
    "DARROW": '<svg class="down" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.6" role="img" aria-label="changed to"><path d="M8 3v10M4 9l4 4 4-4"></path></svg>',
    "ATTN": '<span class="g g-attn" aria-hidden="true"></span>',
    "DONE_SM": '<span class="g g-done g-sm" aria-hidden="true"></span>',
}


def T(s):
    """Fill @@ICON@@ markers."""
    return re.sub(r"@@([A-Z0-9_]+)@@", lambda m: I[m.group(1)], s)


# ---------- shared template pieces ----------
CHIPS = '''<sc-if value="{{h.chipQueued}}" hint-placeholder-val="{{ false }}"><span class="chip">Queued</span></sc-if>
<sc-if value="{{h.chipRunning}}" hint-placeholder-val="{{ true }}"><span class="chip"><span class="dot"></span>Running</span></sc-if>
<sc-if value="{{h.chipReview}}" hint-placeholder-val="{{ false }}"><span class="chip">Needs review</span></sc-if>
<sc-if value="{{h.chipFailed}}" hint-placeholder-val="{{ false }}"><span class="chip attn">@@TRI@@Run failed</span></sc-if>
<sc-if value="{{h.chipReviewed}}" hint-placeholder-val="{{ false }}"><span class="chip you">@@DONE_SM@@Reviewed</span></sc-if>'''

STEP_LI = '''<sc-for list="{{b.steps}}" as="st" hint-placeholder-count="3"><li><sc-if value="{{st.ok}}" hint-placeholder-val="{{ true }}">@@OK@@</sc-if><sc-if value="{{st.note}}" hint-placeholder-val="{{ false }}">@@ATTN@@</sc-if><sc-if value="{{st.run}}" hint-placeholder-val="{{ false }}"><span class="dot" style="margin: 4px; color: var(--ink-2)"></span></sc-if><sc-if value="{{st.fail}}" hint-placeholder-val="{{ false }}">@@TRI@@</sc-if><span class="{{st.lab}}">{{st.label}}</span><span class="note">{{st.text}}</span></li></sc-for>'''

BAND_GLYPH = '''<sc-if value="{{b.gAttn}}" hint-placeholder-val="{{ true }}">@@ATTN@@</sc-if><sc-if value="{{b.gOk}}" hint-placeholder-val="{{ false }}">@@OK@@</sc-if><sc-if value="{{b.gRun}}" hint-placeholder-val="{{ false }}"><span class="dot" style="margin: 0 4px; color: var(--ink-2)"></span></sc-if>'''

SEG = '''<div class="seg" role="group" aria-label="Show fields">
<button aria-pressed="{{seg.needsP}}" onClick="{{seg.needs}}"><sc-if value="{{seg.needsN}}" hint-placeholder-val="{{ true }}">@@ATTN@@</sc-if>Needs you <span class="n">{{seg.needsN}}</span></button>
<button aria-pressed="{{seg.reviewP}}" onClick="{{seg.review}}">To review <span class="n">{{seg.reviewN}}</span></button>
<button aria-pressed="{{seg.allP}}" onClick="{{seg.all}}">All <span class="n">{{seg.allN}}</span></button>
</div>'''

LIST = '''<sc-if value="{{noFields}}" hint-placeholder-val="{{ false }}"><p class="t-sm ink-3" style="margin: 16px 24px">{{noFieldsText}}</p></sc-if>
<sc-for list="{{sections}}" as="s" hint-placeholder-count="6">
<button class="sec" aria-expanded="{{s.exp}}" onClick="{{s.toggle}}">@@SCHEV@@<span style="flex: 1">{{s.name}}</span>
<sc-if value="{{s.attn}}" hint-placeholder-val="{{ false }}"><span class="cnt" style="display: inline-flex; align-items: center; gap: 4px; color: var(--attn); letter-spacing: 0" aria-label="{{s.attnLabel}}"><span class="g g-attn g-sm" aria-hidden="true"></span>{{s.attn}}</span></sc-if>
<sc-if value="{{s.live}}" hint-placeholder-val="{{ false }}"><span class="cnt" style="display: inline-flex; align-items: center; gap: 6px; text-transform: none"><span class="dot"></span>Reading</span></sc-if>
<sc-if value="{{s.tag}}" hint-placeholder-val="{{ false }}"><span class="tag plain" style="letter-spacing: 0; text-transform: none">{{s.tag}}</span></sc-if>
<span class="cnt">{{s.cnt}}</span></button>
<sc-for list="{{s.rows}}" as="r" hint-placeholder-count="2"><button class="row {{r.cls}}" aria-label="{{r.aria}}" aria-current="{{r.cur}}" onClick="{{r.open}}" ref="{{r.ref}}"><span class="g {{r.g}}" aria-hidden="true"></span><span style="min-width: 0"><span class="l">{{r.n}}</span><span class="v">{{r.v}}</span></span><span class="rowtags"><sc-for list="{{r.tags}}" as="t" hint-placeholder-count="0"><span class="tag {{t.cls}}">{{t.t}}</span></sc-for></span></button></sc-for>
</sc-for>
<sc-if value="{{sum.has}}" hint-placeholder-val="{{ true }}"><button class="sec" style="margin-top: 16px" aria-current="{{sum.cur}}" onClick="{{sum.open}}">@@DCHEV@@<span style="flex: 1">Summary</span><sc-if value="{{sum.writing}}" hint-placeholder-val="{{ false }}"><span class="cnt" role="img" aria-label="The agent is writing" style="display: inline-flex; align-items: center"><span class="dot"></span></span></sc-if><span class="tag draft">{{sum.tag}}</span></button></sc-if>'''

HEAD = '''<div class="head"><h2 class="serif t-lg">{{c.name}}</h2><sc-for list="{{c.tags}}" as="t" hint-placeholder-count="1"><span class="tag {{t.cls}}">{{t.t}}</span></sc-for></div>'''


def boxcol(k):
    return (f'<div class="col"><div class="field {{{{c.{k}.cls}}}} {{{{c.vt}}}}"><span class="val">{{{{c.{k}.val}}}}</span></div>'
            f'<div class="facts"><sc-if value="{{{{c.{k}.hasPill}}}}" hint-placeholder-val="{{{{ true }}}}"><span class="pill {{{{c.{k}.pcls}}}}"><sc-if value="{{{{c.{k}.hasIcon}}}}" hint-placeholder-val="{{{{ false }}}}"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="{{{{c.{k}.icon}}}}"></path></svg></sc-if>{{{{c.{k}.pill}}}}</span></sc-if>'
            f'<sc-if value="{{{{c.{k}.who}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="who">{{{{c.{k}.who}}}}</span></sc-if></div></div>')


VALUE = '''<sc-if value="{{c.isOne}}" hint-placeholder-val="{{ true }}"><div class="field {{c.one.cls}} {{c.vt}} {{c.allCls}}"><span class="val">{{c.one.val}}</span></div>
<sc-if value="{{c.canShowAll}}" hint-placeholder-val="{{ false }}"><button class="link" onClick="{{c.toggleAll}}">{{c.allLabel}}</button></sc-if>
<div class="facts"><span class="pill {{c.facts.pcls}}"><sc-if value="{{c.facts.hasIcon}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="{{c.facts.icon}}"></path></svg></sc-if>{{c.facts.pill}}</span><span>{{c.facts.who}}</span></div></sc-if>
<sc-if value="{{c.isTwo}}" hint-placeholder-val="{{ false }}"><div class="two {{c.stack}}">''' + boxcol("a") + "@@RIGHT@@@@DARROW@@" + boxcol("b") + '''</div></sc-if>
<sc-if value="{{c.hasAlert}}" hint-placeholder-val="{{ false }}"><div class="alert" role="alert">@@WARN@@<span style="flex: 1">{{c.alert.t}}</span><sc-if value="{{c.alert.retry}}" hint-placeholder-val="{{ false }}"><button class="btn" onClick="{{c.alert.onRetry}}">Try again</button></sc-if></div></sc-if>
<sc-if value="{{c.hasEdit}}" hint-placeholder-val="{{ false }}"><div class="inp"><label for="pv">{{c.edit.label}}</label><input id="pv" class="{{c.edit.vt}}" value="{{c.edit.val}}" placeholder="{{c.edit.ph}}" autocomplete="off" onChange="{{onVal}}" onKeyDown="{{onEditKey}}" ref="{{editRef}}"></div>
<sc-if value="{{c.edit.reason}}" hint-placeholder-val="{{ false }}"><div class="inp"><label for="pr">Reason</label><input id="pr" class="reason" value="{{c.edit.rval}}" placeholder="Why the agent's value is wrong (one line)" autocomplete="off" onChange="{{onReason}}" onKeyDown="{{onEditKey}}"></div></sc-if></sc-if>'''

ACTION_BTN = '''<sc-for list="{{c.actions}}" as="a" hint-placeholder-count="3"><button class="btn {{a.cls}}" title="{{a.title}}" disabled="{{a.disabled}}" onClick="{{a.on}}"><sc-if value="{{a.hasIcon}}" hint-placeholder-val="{{ true }}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="{{a.sw}}" aria-hidden="true"><path d="{{a.d}}"></path></svg></sc-if>{{a.t}}</button></sc-for>'''

DETAILS = '''<sc-for list="{{c.details}}" as="d" hint-placeholder-count="0"><details class="dis" open="{{d.open}}"><summary>@@DCHEV@@{{d.title}}<sc-if value="{{d.meta}}" hint-placeholder-val="{{ false }}"><span class="t-sm ink-3" style="font-weight: 500">{{d.meta}}</span></sc-if></summary><div style="{{d.pad}}; display: flex; flex-direction: column; gap: 4px"><sc-for list="{{d.lines}}" as="ln" hint-placeholder-count="1"><p class="t-base ink-2" style="margin: 0">{{ln}}</p></sc-for></div></details></sc-for>'''

SUMMARY = '''<div class="head"><h2 class="serif t-lg">Summary</h2><span class="tag draft">{{sum.tag}}</span></div>
<p class="t-md ink-2" style="margin: 0; white-space: pre-wrap; overflow-wrap: anywhere"><sc-for list="{{sum.segs}}" as="x" hint-placeholder-count="1"><sc-if value="{{x.b}}" hint-placeholder-val="{{ false }}"><strong style="color: var(--ink); font-weight: 600">{{x.t}}</strong></sc-if><sc-if value="{{x.p}}" hint-placeholder-val="{{ true }}">{{x.t}}</sc-if></sc-for></p>
<sc-if value="{{sum.empty}}" hint-placeholder-val="{{ false }}"><p class="t-sm ink-3" style="margin: 0">The agent has not started the summary yet.</p></sc-if>
<sc-if value="{{sum.writing}}" hint-placeholder-val="{{ false }}"><span class="t-sm ink-3" style="display: inline-flex; align-items: center; gap: 6px"><span class="dot"></span>The agent is still writing</span></sc-if>
<sc-if value="{{sum.incomplete}}" hint-placeholder-val="{{ false }}"><p class="notein">{{sum.incomplete}}</p></sc-if>'''

DOC_TEXT = '''<div class="mono t-sm" style="padding: 24px 20px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--lift); color: var(--ink-2); white-space: pre-line; overflow-wrap: anywhere">{{p.before}}<sc-if value="{{p.mark}}" hint-placeholder-val="{{ true }}"><mark ref="{{markRef}}">{{p.mark}}</mark></sc-if>{{p.after}}</div>'''


def sk(w, h, extra_style=""):
    return f'<span class="sk" style="width: {w}; height: {h}px{extra_style}"></span>'


SK_ROWS_L = "".join(f'<div style="display: grid; grid-template-columns: 14px minmax(0, 1fr); column-gap: 10px; align-items: center; height: 40px; padding: 0 16px">{sk("14px", 14, "; border-radius: var(--r-full)")}<span style="display: flex; flex-direction: column; gap: 6px">{sk(a, 8)}{sk(b, 10)}</span></div>' for a, b in [("40%", "70%"), ("55%", "45%"), ("35%", "60%"), ("50%", "80%"), ("45%", "50%")])
SK_LIST_L = f'<div style="padding: 20px 16px 4px">{sk("30%", 10)}</div>' + SK_ROWS_L + f'<div style="padding: 20px 16px 4px">{sk("40%", 10)}</div>' + SK_ROWS_L
SK_DOC = "".join(sk(w, 10, "; margin-bottom: 10px") for w in ["60%", "85%", "70%", "90%", "40%", "80%", "75%", "55%"])

MSG_DOWN = '@@TRI_BIG@@<h2 class="serif t-xl">Can\'t reach the server</h2><p class="t-md ink-2">Check your connection, then try again.</p><button class="btn btn-primary" onClick="{{tryAgain}}">@@RETRY@@Try again</button>'
MSG_404 = '<h2 class="serif t-xl">Claim not found</h2><p class="t-md ink-2">There is no claim <span class="mono">CLM-2026-04817</span>.</p><a href="#" class="btn btn-primary" style="text-decoration: none">@@BACK@@Back to queue</a>'

DEV = '''<div class="dev" role="region" aria-label="Prototype controls" style="flex: 1">
<span class="eyebrow ink-3">Prototype · replay {{dv.cid}} · {{dv.mode}}</span>
<button class="ib" aria-label="{{dv.playLabel}}" title="{{dv.playLabel}}" disabled="{{dv.noPlay}}" onClick="{{dv.toggle}}" style="border: 1px solid var(--line)"><sc-if value="{{dv.playing}}" hint-placeholder-val="{{ false }}">@@PAUSE@@</sc-if><sc-if value="{{dv.paused}}" hint-placeholder-val="{{ true }}">@@PLAY@@</sc-if></button>
<button class="ib" aria-label="Restart the run from 0 s" title="Restart the run from 0 s" disabled="{{dv.noPlay}}" onClick="{{dv.restart}}">@@RETRY@@</button>
<div class="seg" role="group" aria-label="Replay speed" style="grid-template-columns: repeat(4, minmax(0, 1fr)); width: 176px"><sc-for list="{{dv.speeds}}" as="sp" hint-placeholder-count="4"><button aria-pressed="{{sp.p}}" onClick="{{sp.on}}">{{sp.t}}</button></sc-for></div>
<input type="range" class="scrub" aria-label="Replay position" min="0" max="{{dv.max}}" step="100" value="{{dv.t}}" disabled="{{dv.noPlay}}" onChange="{{dv.scrub}}">
<span class="mono t-sm ink-2" style="white-space: nowrap">{{dv.time}}</span>
<span style="position: relative; display: inline-flex; margin-left: auto"><button class="btn" aria-haspopup="menu" aria-expanded="{{dv.menuExp}}" onClick="{{dv.toggleMenu}}">Jump to state@@CHEV12@@</button>
<sc-if value="{{dv.menu}}" hint-placeholder-val="{{ false }}"><div class="menu" role="menu" aria-label="Claim states"><sc-for list="{{dv.states}}" as="o" hint-placeholder-count="15"><button role="menuitem" onClick="{{o.on}}">{{o.t}}</button></sc-for></div></sc-if></span>
</div>'''

STATES = [("start", "Start of the run · 4817, 0 s"), ("queued", "Queued · 4830"),
          ("running", "Running · 4817 at 80 s"), ("warning", "Step warning · 4817 at 100 s"),
          ("failed", "Failed part-way · 4822"), ("finished", "Finished, needs review · 4809"),
          ("blocked", "Blocked from completing · 4817 end"), ("ready", "Ready to complete · 4809"),
          ("reviewed", "Reviewed · 4809"), ("loading", "Loading"), ("reconnecting", "Reconnecting · 4817"),
          ("down", "Backend unreachable"), ("notfound", "Claim not found"),
          ("saveFailed", "Save failed · witness name"), ("refused", "Refused save · liability")]
DATA["states"] = STATES

# ---------- laptop ----------
HEADER_L = '''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<a href="Q-laptop.dc.html" class="ib" aria-label="Back to queue" title="Back to queue">@@BACK@@</a>
<h1 class="mono t-md" style="margin: 0; font-weight: 500">{{h.cid}}</h1>
<span class="t-base ink-2">{{h.who}}</span>
''' + CHIPS + '''
<span class="t-sm ink-3" role="status" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap"><sc-if value="{{h.reconnecting}}" hint-placeholder-val="{{ false }}"><span class="spin" aria-hidden="true"></span></sc-if>{{h.sub}}</span>
<span style="flex: 1"></span>
<sc-if value="{{h.hasProg}}" hint-placeholder-val="{{ true }}"><div style="display: flex; align-items: center; gap: 10px"><div role="progressbar" aria-label="Fields decided" aria-valuemin="0" aria-valuemax="{{h.total}}" aria-valuenow="{{h.done}}" style="width: 96px; height: 4px; border-radius: var(--r-full); background: var(--subtle); overflow: hidden"><div style="width: {{h.pct}}%; height: 100%; background: var(--you)"></div></div><span class="t-sm ink-2" style="white-space: nowrap"><strong class="mono" style="color: var(--you); font-weight: 600">{{h.done}}</strong> of {{h.total}} decided</span></div></sc-if>
<sc-if value="{{h.canComplete}}" hint-placeholder-val="{{ false }}"><button class="btn btn-primary" onClick="{{complete}}">Complete review</button></sc-if>
<sc-if value="{{h.blocked}}" hint-placeholder-val="{{ true }}"><span class="tw" style="position: relative; display: inline-flex"><button class="btn btn-primary" aria-disabled="true" aria-describedby="why-blk">{{h.cLabel}}</button><span class="tip" role="tooltip" id="why-blk" style="top: 44px; right: 0; width: 260px">{{h.why}}</span></span></sc-if>
</header>'''

BAND_L = '''<sc-if value="{{b.fail}}" hint-placeholder-val="{{ false }}"><div class="band alert" role="alert"><summary>@@TRI@@<span class="t-sm" style="font-weight: 600; white-space: nowrap; color: var(--attn)">{{b.title}}</span>
<span class="t-sm" style="flex: 1; min-width: 0; color: var(--attn); white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{b.text}}</span>
<sc-if value="{{b.retry}}" hint-placeholder-val="{{ true }}"><button class="btn" style="height: 32px" onClick="{{retryRun}}">@@RETRY@@Retry run</button></sc-if></summary></div></sc-if>
<sc-if value="{{b.line}}" hint-placeholder-val="{{ true }}"><details class="band"><summary>''' + BAND_GLYPH + '''<span class="t-sm" style="font-weight: 600; white-space: nowrap">{{b.title}}</span>
<span class="t-sm ink-2" style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{b.text}}</span><span class="meta">{{b.meta}}</span>@@CHEV@@</summary><ol class="steps" aria-label="Agent steps">''' + STEP_LI + '''</ol></details></sc-if>'''

MAIN_L = '''<main class="pane" aria-label="{{mainLabel}}" style="background: var(--surface); display: flex; flex-direction: column">
<sc-if value="{{showCard}}" hint-placeholder-val="{{ true }}">
<div style="flex: none; height: 48px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 24px; border-bottom: 1px solid var(--line)">
<span class="t-sm ink-3" style="flex: 1">{{c.group}}</span><button class="ib" aria-label="Previous field (K)" title="Previous field · K" onClick="{{prev}}">@@UP@@</button><button class="ib" aria-label="Next field (J)" title="Next field · J" onClick="{{next}}">@@DOWN@@</button></div>
<div style="padding: 24px; display: flex; flex-direction: column; gap: 12px; max-width: 560px">
''' + HEAD + VALUE + '''
<sc-if value="{{c.hasActions}}" hint-placeholder-val="{{ true }}"><div class="acts">''' + ACTION_BTN + '''<span style="flex: 1"></span><sc-if value="{{c.skip}}" hint-placeholder-val="{{ true }}"><button class="ib" aria-label="Skip for now (S)" title="Skip for now · S" style="width: 36px; height: 36px" onClick="{{skip}}">@@SKIP@@</button></sc-if><sc-if value="{{c.undo}}" hint-placeholder-val="{{ false }}"><button class="ib" aria-label="Undo your decision (U)" title="Undo · U" style="width: 36px; height: 36px" onClick="{{undo}}">@@UNDO@@</button></sc-if></div></sc-if>
<sc-if value="{{c.ro}}" hint-placeholder-val="{{ false }}"><div class="ro" style="margin-top: 4px">@@LOCK@@{{c.roText}}</div></sc-if>
</div>
<div style="flex: none">''' + DETAILS + '''</div>
<div style="flex: 1"></div>
<sc-if value="{{c.keys}}" hint-placeholder-val="{{ true }}"><div class="t-xs ink-3" style="flex: none; display: flex; gap: 16px; padding: 12px 24px; border-top: 1px solid var(--line)"><span><kbd>J</kbd> <kbd>K</kbd> move</span><span><kbd>A</kbd> <kbd>C</kbd> <kbd>R</kbd> decide</span><span><kbd>S</kbd> skip</span><span><kbd>U</kbd> undo</span></div></sc-if>
</sc-if>
<sc-if value="{{showSummary}}" hint-placeholder-val="{{ false }}"><div style="flex: none; height: 48px; display: flex; align-items: center; padding: 0 24px; border-bottom: 1px solid var(--line)"><span class="t-sm ink-3">Below the fields</span></div><div style="padding: 24px; display: flex; flex-direction: column; gap: 12px; max-width: 560px">''' + SUMMARY + '''</div></sc-if>
<sc-if value="{{showMsg}}" hint-placeholder-val="{{ false }}"><div style="flex: 1; display: flex; align-items: center; justify-content: center"><div class="msg"><h2 class="serif t-xl">{{msg.h}}</h2><p class="t-md ink-2">{{msg.p}}</p></div></div></sc-if>
</main>'''

ASIDE_L = '''<sc-if value="{{p.show}}" hint-placeholder-val="{{ true }}"><aside aria-label="Source document" style="min-height: 0; background: var(--bg); border-left: 1px solid var(--line); display: flex; flex-direction: column">
<div style="flex: none; height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 16px; border-bottom: 1px solid var(--line)">@@DOC@@<span class="t-base {{p.titleCls}}" style="flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{p.title}}</span></div>
<sc-if value="{{p.note}}" hint-placeholder-val="{{ false }}"><p class="notein" style="padding: 12px 16px 0">{{p.note}}</p></sc-if>
<sc-if value="{{p.hasDoc}}" hint-placeholder-val="{{ true }}"><div class="pane" ref="{{docRef}}" style="flex: 1; padding: 16px; position: relative">''' + DOC_TEXT + '''</div></sc-if>
<sc-if value="{{p.nosrc}}" hint-placeholder-val="{{ false }}"><div style="padding: 24px 16px"><p class="notein" style="margin: 0">No source</p><p class="t-sm ink-2" style="margin: 4px 0 0">The agent cited no document for this value.</p></div></sc-if>
<sc-if value="{{p.blank}}" hint-placeholder-val="{{ false }}"><p class="t-sm ink-2" style="margin: 0; padding: 24px 16px">{{p.blank}}</p></sc-if>
</aside></sc-if>'''

LOAD_L = f'''<div aria-busy="true" style="flex: 1; min-height: 0; display: flex; flex-direction: column"><span class="sr" role="status">Loading claim</span>
<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<a href="Q-laptop.dc.html" class="ib" aria-label="Back to queue" title="Back to queue">@@BACK@@</a><h1 class="mono t-md" style="margin: 0; font-weight: 500">CLM-2026-004817</h1>{sk("160px", 12)}{sk("72px", 24, "; border-radius: var(--r-full)")}<span style="flex: 1"></span>{sk("180px", 12)}{sk("150px", 36, "; border-radius: var(--r-md)")}</header>
<div style="flex: none; height: 36px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid var(--line)">{sk("420px", 10)}</div>
<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 320px minmax(0, 1fr) 400px">
<div style="background: var(--bg); border-right: 1px solid var(--line); min-height: 0; overflow: hidden"><div style="padding: 12px 16px 4px">{sk("100%", 32, "; border-radius: var(--r-md)")}</div>{SK_LIST_L}</div>
<div style="background: var(--surface); display: flex; flex-direction: column"><div style="height: 48px; border-bottom: 1px solid var(--line); display: flex; align-items: center; padding: 0 24px">{sk("90px", 10)}</div><div style="padding: 24px; display: flex; flex-direction: column; gap: 12px">{sk("200px", 18)}{sk("100%", 52, "; border-radius: var(--r-md)")}{sk("260px", 12)}<div style="display: flex; gap: 8px; margin-top: 4px">{sk("96px", 36, "; border-radius: var(--r-md)")}{sk("96px", 36, "; border-radius: var(--r-md)")}{sk("96px", 36, "; border-radius: var(--r-md)")}</div></div></div>
<div style="background: var(--bg); border-left: 1px solid var(--line)"><div style="height: 48px; border-bottom: 1px solid var(--line); display: flex; align-items: center; padding: 0 16px">{sk("180px", 12)}</div><div style="padding: 16px"><div style="padding: 24px 20px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--lift)">{SK_DOC}</div></div></div>
</div></div>'''


def centred_l(h1, inner):
    return f'''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box"><a href="Q-laptop.dc.html" class="ib" aria-label="Back to queue" title="Back to queue">@@BACK@@</a>{h1}</header>
<main style="flex: 1; display: flex; align-items: center; justify-content: center; background: var(--surface)"><div class="msg">{inner}</div></main>'''


H1_17 = '<h1 class="mono t-md" style="margin: 0; font-weight: 500">CLM-2026-004817</h1>'
LAPTOP_BODY = T(f'''<div class="app" onKeyDown="{{{{onKey}}}}" style="width: 1280px; height: {H_LAP}px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">
<div style="flex: none; height: 800px; display: flex; flex-direction: column; overflow: hidden; position: relative">
<sc-if value="{{{{scr.review}}}}" hint-placeholder-val="{{{{ true }}}}">{HEADER_L}{BAND_L}
<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: {{{{gridCols}}}}">
<nav aria-label="Fields" style="min-height: 0; display: flex; flex-direction: column; background: var(--bg); border-right: 1px solid var(--line)">
<div style="flex: none; padding: 12px 16px 4px">{SEG}</div>
<div class="pane" ref="{{{{listRef}}}}" style="flex: 1; padding-bottom: 16px; position: relative">{LIST}</div></nav>
{MAIN_L}{ASIDE_L}</div></sc-if>
<sc-if value="{{{{scr.loading}}}}" hint-placeholder-val="{{{{ false }}}}">{LOAD_L}</sc-if>
<sc-if value="{{{{scr.down}}}}" hint-placeholder-val="{{{{ false }}}}">{centred_l(H1_17, MSG_DOWN)}</sc-if>
<sc-if value="{{{{scr.notfound}}}}" hint-placeholder-val="{{{{ false }}}}">{centred_l('<span class="t-base ink-2">Claims queue</span>', MSG_404)}</sc-if>
</div>
{DEV}
</div>''')

# ---------- phone ----------
HEADER_P = '''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<a href="Q-phone.dc.html" class="ib" aria-label="Back to queue">@@BACK18@@</a>
<div style="flex: 1; min-width: 0"><h1 class="mono t-md" style="margin: 0; font-weight: 500">{{h.cid}}</h1>
<div class="t-sm ink-3" role="status" style="display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"><sc-if value="{{h.reconnecting}}" hint-placeholder-val="{{ false }}"><span class="spin" aria-hidden="true"></span></sc-if>{{h.psub}}</div></div>
''' + CHIPS + '''
</header>'''

BAND_P = '''<sc-if value="{{b.fail}}" hint-placeholder-val="{{ false }}"><div class="band alert" role="alert"><summary><span class="t-sm" style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--attn)">@@TRI@@{{b.title}}</span>
<span class="t-sm" style="color: var(--attn)">{{b.text}}</span>
<sc-if value="{{b.retry}}" hint-placeholder-val="{{ true }}"><button class="btn" style="width: 100%" onClick="{{retryRun}}">@@RETRY@@Retry run</button></sc-if></summary></div></sc-if>
<sc-if value="{{b.line}}" hint-placeholder-val="{{ true }}"><details class="band"><summary>''' + BAND_GLYPH + '''<span class="t-sm ink-2" style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"><strong style="color: var(--ink); font-weight: 600">{{b.title}}</strong>{{b.ptext}}</span><sc-if value="{{b.count}}" hint-placeholder-val="{{ false }}"><span class="mono t-xs ink-3">{{b.count}}</span></sc-if>@@CHEV@@</summary><ol class="steps" aria-label="Agent steps">''' + STEP_LI + '''</ol></details></sc-if>'''

FOOT_P = '''<footer style="flex: none; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px 16px; background: var(--surface); border-top: 1px solid var(--line)">
<sc-if value="{{h.hasProg}}" hint-placeholder-val="{{ true }}"><div style="display: flex; align-items: center; gap: 10px"><div role="progressbar" aria-label="Fields decided" aria-valuemin="0" aria-valuemax="{{h.total}}" aria-valuenow="{{h.done}}" style="flex: 1; height: 4px; border-radius: var(--r-full); background: var(--subtle); overflow: hidden"><div style="width: {{h.pct}}%; height: 100%; background: var(--you)"></div></div><span class="t-sm ink-2" style="white-space: nowrap"><strong class="mono" style="color: var(--you); font-weight: 600">{{h.done}}</strong> of {{h.total}} decided</span></div></sc-if>
<sc-if value="{{h.canComplete}}" hint-placeholder-val="{{ false }}"><button class="btn btn-primary" style="width: 100%" onClick="{{complete}}">Complete review</button></sc-if>
<sc-if value="{{h.blocked}}" hint-placeholder-val="{{ true }}"><button class="btn btn-primary" aria-disabled="true" aria-describedby="why-p" style="width: 100%">{{h.cLabel}}</button><span id="why-p" hidden="hidden">{{h.why}}</span></sc-if>
<sc-if value="{{h.roDone}}" hint-placeholder-val="{{ false }}"><div class="ro" style="justify-content: center; height: 28px">@@LOCK@@{{h.roDone}}</div></sc-if>
</footer>'''

LIST_P = '''<div style="flex: none; padding: 12px 16px 4px">''' + SEG + '''</div>
<nav class="pane" aria-label="Fields" ref="{{listRef}}" style="flex: 1; padding-bottom: 16px; position: relative">''' + LIST.replace('style="margin-top: 16px"', 'style="margin-top: 12px"') + '''</nav>'''

FIELD_P = '''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 2px; padding: 0 4px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<button class="ib" aria-label="Back to the list" onClick="{{toList}}">@@BACK18@@</button><div style="flex: 1; min-width: 0"><div class="t-base" style="font-weight: 600">{{c.group}}</div><div class="t-sm ink-3">{{c.pos}}</div></div>
<button class="ib" aria-label="Previous field" onClick="{{prev}}">@@UP18@@</button><button class="ib" aria-label="Next field" onClick="{{next}}">@@DOWN18@@</button></header>
<main class="pane" aria-label="{{c.name}}" style="flex: 1; background: var(--surface)"><div style="padding: 24px 16px; display: flex; flex-direction: column; gap: 12px">
''' + HEAD + VALUE + '''
<sc-if value="{{c.notein}}" hint-placeholder-val="{{ false }}"><p class="notein">{{c.notein}}</p></sc-if>
<sc-if value="{{c.hasQuote}}" hint-placeholder-val="{{ true }}"><button class="cite" aria-label="Open the cited text in the document" aria-haspopup="dialog" style="margin-top: 4px" onClick="{{openSheet}}"><span class="quote" style="white-space: pre-line">{{c.quote}}</span><span class="t-sm ink-3" style="display: flex; align-items: center; gap: 6px; width: 100%">@@DOC@@<span style="flex: 1">{{c.src}}</span>@@CHEV12@@</span></button></sc-if>
<sc-if value="{{c.nosrc}}" hint-placeholder-val="{{ false }}"><div style="display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: var(--r-md); background: var(--bg)"><p class="notein" style="margin: 0">No source</p><p class="t-sm ink-2" style="margin: 0">The agent cited no document for this value.</p></div></sc-if>
<sc-if value="{{c.ro}}" hint-placeholder-val="{{ false }}"><div class="ro">@@LOCK@@{{c.roText}}</div></sc-if>
<div class="pdet" style="margin: 0 -16px">''' + DETAILS + '''</div>
</div></main>
<sc-if value="{{c.hasActions}}" hint-placeholder-val="{{ true }}"><div class="pf {{c.pf}}" style="background: var(--surface)">''' + ACTION_BTN + '''<sc-if value="{{c.skipPhone}}" hint-placeholder-val="{{ true }}"><button class="ib" aria-label="Skip for now" title="Skip for now" style="width: 48px; height: 48px; border: 1px solid var(--line)" onClick="{{skip}}">@@SKIP18@@</button></sc-if><sc-if value="{{c.undoPhone}}" hint-placeholder-val="{{ false }}"><button class="ib" aria-label="Undo your decision" title="Undo" style="width: 48px; height: 48px; border: 1px solid var(--line)" onClick="{{undo}}">@@UNDO18@@</button></sc-if></div></sc-if>'''

SUMMARY_P = '''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 2px; padding: 0 4px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box">
<button class="ib" aria-label="Back to the list" onClick="{{toList}}">@@BACK18@@</button><div style="flex: 1; min-width: 0"><div class="t-base" style="font-weight: 600">Summary</div><div class="t-sm ink-3">Below the fields</div></div></header>
<main class="pane" style="flex: 1; background: var(--surface)"><div style="padding: 24px 16px; display: flex; flex-direction: column; gap: 12px">''' + SUMMARY + '''</div></main>'''

SHEET_P = '''<sc-if value="{{sheet.open}}" hint-placeholder-val="{{ false }}"><div aria-hidden="true" onClick="{{closeSheet}}" style="position: absolute; inset: 0; background: var(--ink); opacity: .4"></div>
<div role="dialog" aria-modal="true" aria-label="{{p.title}}" style="position: absolute; left: 0; right: 0; bottom: 0; height: 640px; display: flex; flex-direction: column; background: var(--surface); border-radius: var(--r-lg) var(--r-lg) 0 0; box-shadow: var(--lift)">
<div style="flex: none; display: flex; justify-content: center; padding-top: 8px"><span style="width: 36px; height: 4px; border-radius: var(--r-full); background: var(--line-strong)"></span></div>
<div style="flex: none; display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 4px 0 16px">@@DOC@@<span class="t-base" style="flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{p.title}}</span>
<button class="ib" aria-label="Close document" onClick="{{closeSheet}}">@@CLOSE18@@</button></div>
<sc-if value="{{p.note}}" hint-placeholder-val="{{ false }}"><p class="notein" style="padding: 0 16px 12px; margin: 0">{{p.note}}</p></sc-if>
<div class="pane" ref="{{docRef}}" style="flex: 1; min-height: 0; padding: 16px; border-top: 1px solid var(--line); background: var(--bg); position: relative">''' + DOC_TEXT.replace("padding: 24px 20px", "padding: 20px 16px") + '''</div></div></sc-if>'''

SK_ROWS_P = SK_ROWS_L.replace("height: 40px", "height: 52px")
LOAD_P = f'''<div aria-busy="true" style="flex: 1; min-height: 0; display: flex; flex-direction: column"><span class="sr" role="status">Loading claim</span>
<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box"><a href="Q-phone.dc.html" class="ib" aria-label="Back to queue">@@BACK18@@</a><div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px"><h1 class="mono t-md" style="margin: 0; font-weight: 500">CLM-2026-004817</h1>{sk("120px", 10)}</div>{sk("72px", 24, "; border-radius: var(--r-full)")}</header>
<div style="flex: none; height: 44px; display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid var(--line)">{sk("70%", 10)}</div>
<div style="padding: 12px 16px 4px">{sk("100%", 40, "; border-radius: var(--r-md)")}</div><div style="flex: 1; overflow: hidden">{SK_LIST_L.replace(SK_ROWS_L, SK_ROWS_P)}</div>
<footer style="flex: none; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px 16px; background: var(--surface); border-top: 1px solid var(--line)">{sk("100%", 12)}{sk("100%", 44, "; border-radius: var(--r-md)")}</footer></div>'''


def centred_p(h1, inner):
    return f'''<header style="flex: none; height: 56px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 2px; background: var(--surface); border-bottom: 1px solid var(--line); box-sizing: border-box"><a href="Q-phone.dc.html" class="ib" aria-label="Back to queue">@@BACK18@@</a>{h1}</header>
<main style="flex: 1; display: flex; align-items: center; padding: 0 24px; background: var(--surface)"><div class="msg">{inner}</div></main>'''


QUEUED_P = '''<main style="flex: 1; display: flex; align-items: center; padding: 0 24px; background: var(--surface)"><div class="msg"><h2 class="serif t-xl">{{msg.h}}</h2><p class="t-md ink-2">{{msg.p}}</p></div></main>'''

PHONE_BODY = T(f'''<div class="app phone" onKeyDown="{{{{onKey}}}}" style="width: 375px; height: {H_PH}px; display: flex; flex-direction: column; background: var(--bg); overflow: hidden">
<div style="flex: none; height: 844px; display: flex; flex-direction: column; overflow: hidden; position: relative; background: var(--bg)">
<sc-if value="{{{{scr.list}}}}" hint-placeholder-val="{{{{ true }}}}">{HEADER_P}{BAND_P}
<sc-if value="{{{{showMsgP}}}}" hint-placeholder-val="{{{{ false }}}}">{QUEUED_P}</sc-if>
<sc-if value="{{{{showList}}}}" hint-placeholder-val="{{{{ true }}}}">{LIST_P}</sc-if>
{FOOT_P}</sc-if>
<sc-if value="{{{{scr.field}}}}" hint-placeholder-val="{{{{ false }}}}">{FIELD_P}</sc-if>
<sc-if value="{{{{scr.summary}}}}" hint-placeholder-val="{{{{ false }}}}">{SUMMARY_P}</sc-if>
<sc-if value="{{{{scr.loading}}}}" hint-placeholder-val="{{{{ false }}}}">{LOAD_P}</sc-if>
<sc-if value="{{{{scr.down}}}}" hint-placeholder-val="{{{{ false }}}}">{centred_p(H1_17, MSG_DOWN)}</sc-if>
<sc-if value="{{{{scr.notfound}}}}" hint-placeholder-val="{{{{ false }}}}">{centred_p('<span class="t-base ink-2">Claims queue</span>', MSG_404)}</sc-if>
{SHEET_P}
</div>
{DEV}
</div>''')

# ---------- logic ----------
JS = r"""
var D = __DATA__;
var PHONE = __PHONE__;
var C17 = "CLM-2026-004817", C22 = "CLM-2026-004822", C09 = "CLM-2026-004809", C30 = "CLM-2026-004830";
var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var IC = { check: ["m3 8.5 3 3 7-7", "2"], pencil: ["M11 2.5 13.5 5 6 12.5H3.5V10z", "1.6"], x: ["M4 4l8 8M12 4l-8 8", "1.7"],
  shield: ["M8 1.8 13 3.8v4c0 3-2.2 5-5 6.2-2.8-1.2-5-3.2-5-6.2v-4z", "1.6"] };
var PILL_IC = { accept: "m3 8.5 3 3 7-7", correct: "M11 2.5 13.5 5 6 12.5H3.5V10z", override: "M3 5.5h9.5L10 3M13 10.5H3.5L6 13" };
var VERB = { accept: "accepted", correct: "corrected", override: "replaced" };
var SPEEDS = [1, 2, 5, 10];
var ILLUSTRATIVE = { accepted: "15:04", completed: "15:06" }; // 4809 reviewer times, as on G-states (not fixture data)

function pad(n) { return (n < 10 ? "0" : "") + n; }
function clockAt(cid, ms) { var s = D.started[cid] + Math.floor(ms / 1000); return pad(Math.floor(s / 3600) % 24) + ":" + pad(Math.floor(s / 60) % 60); }
function money(v) { var p = v.amount.split("."); var w = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return (v.currency === "EUR" ? "€" : v.currency) + " " + w + (p.length > 1 ? "." + p[1] : ""); }
function fmt(type, v) {
  if (v === null || v === undefined) return "Not found in documents";
  if (type === "money") return money(v);
  if (type === "date") { var a = v.split("-"); return parseInt(a[2], 10) + " " + MON[parseInt(a[1], 10) - 1] + " " + a[0]; }
  if (type === "boolean") return v ? "Yes" : "No";
  return String(v);
}
function pct(c) { return Math.round(c * 100); }
function confWord(c) { return (c < 0.6 ? "Low" : c < 0.85 ? "Medium" : "High") + " " + pct(c) + "%"; }
function cited(src) { if (!src) return null; var d = D.docs[src.document_id]; return d ? d.text.slice(src.start, src.end) : null; }
function inCite(type, value, text) {
  if (value === null || text === null) return null;
  if (type === "time") return text.indexOf(value) > -1;
  if (type === "number") return text.replace(/,/g, "").indexOf(String(value)) > -1;
  if (type === "money") { var p = value.amount.split("."); var g = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + p[1]; return text.indexOf(g) > -1 || text.indexOf(value.amount) > -1; }
  if (type === "date") { var a = value.split("-"); return text.indexOf(parseInt(a[2], 10) + " " + MONTHS[parseInt(a[1], 10) - 1] + " " + a[0]) > -1 || text.indexOf(value) > -1; }
  return null;
}
function vclass(t) { return (t === "money" || t === "date" || t === "time" || t === "number" || t === "boolean") ? "v-num" : (t === "long_text" ? "v-long" : "v-text"); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function secs(ms) { return (Math.max(0, ms) / 1000).toFixed(1) + " s"; }

// Fold a run's events up to t (run-relative ms). Duplicate seq is dropped: it changes nothing.
function fold(cid, t) {
  var ev = D.runs[cid], seen = {}, s = { status: "queued", steps: [], summary: "", fields: {}, error: null, lastFid: null, endAt: null };
  for (var i = 0; i < ev.length; i++) {
    var e = ev[i]; if (e.at_ms > t) break;
    if (seen[e.seq]) continue; seen[e.seq] = true;
    var p = e.payload, f, st, k;
    if (e.type === "run_started") s.status = "running";
    else if (e.type === "step_started") s.steps.push({ id: p.step_id, label: p.label, state: "running", note: null });
    else if (e.type === "step_finished") { for (k = 0; k < s.steps.length; k++) if (s.steps[k].id === p.step_id) { s.steps[k].state = p.outcome; s.steps[k].note = p.note || null; } }
    else if (e.type === "summary_delta") s.summary += p.text;
    else if (e.type === "field_extracted") {
      s.fields[p.field_id] = { id: p.field_id, label: p.label, type: p.value_type, value: p.value, conf: p.confidence, source: p.source,
        version: 1, firstAt: e.at_ms, versions: [{ v: 1, value: p.value, conf: p.confidence, source: p.source, at: e.at_ms, reason: null }], confs: [] };
      s.lastFid = p.field_id;
    } else if (e.type === "field_revised") {
      f = s.fields[p.field_id];
      if (!same(f.value, p.value)) { f.version += 1; f.versions.push({ v: f.version, value: p.value, conf: p.confidence, source: p.source, at: e.at_ms, reason: p.reason }); }
      else f.confs.push({ from: f.conf, to: p.confidence, reason: p.reason, at: e.at_ms });
      f.value = p.value; f.conf = p.confidence; f.source = p.source;
    } else if (e.type === "confidence_changed") {
      f = s.fields[p.field_id]; f.confs.push({ from: f.conf, to: p.confidence, reason: p.reason, at: e.at_ms }); f.conf = p.confidence;
    } else if (e.type === "run_finished") { s.status = "finished"; s.endAt = e.at_ms; }
    else if (e.type === "run_failed") {
      s.status = "failed"; s.endAt = e.at_ms; s.error = { step: p.step_id, message: p.error.message, retryable: p.error.retryable };
      for (k = 0; k < s.steps.length; k++) if (s.steps[k].id === p.step_id) s.steps[k].state = "failed";
    }
  }
  return s;
}

// Markdown from the whole text so far: **bold** pairs; a lone ** stays as typed until its pair arrives.
function segs(text) {
  var out = [], parts = text.split("**"), n = parts.length;
  for (var i = 0; i < n; i++) {
    if (i % 2 === 1 && i === n - 1) { out.push({ t: "**" + parts[i], b: false, p: true }); continue; }  // opening ** without its pair yet
    if (parts[i]) out.push({ t: parts[i], b: i % 2 === 1, p: i % 2 === 0 });
  }
  return out;
}

function sampleDecisions() {
  var o = {}, st = D.started[C17];
  D.sample.forEach(function (d) {
    var hh = parseInt(d.at.slice(11, 13), 10), mm = parseInt(d.at.slice(14, 16), 10), ss = parseInt(d.at.slice(17, 19), 10);
    o[d.field_id] = { action: d.action, value: d.value === undefined ? null : d.value, reason: d.reason || null, v: d.based_on_version,
      atMs: (hh * 3600 + mm * 60 + ss - st) * 1000, hh: d.at.slice(11, 16), sample: true };
  });
  return o;
}

var DEFAULTS = { cid: C17, t: 0, playing: false, speed: 1, screen: "review", conn: "ok", frozenT: null, decisions: {}, sel: null,
  mode: null, alert: null, completed: null, filter: "all", exp: {}, keep: {}, pview: "list", sheet: false, showAll: {}, lastSel: null };

class Component extends DCLogic {
  S() { return Object.assign({}, DEFAULTS, this.state || {}); }
  componentDidMount() {
    var self = this;
    this._tick = setInterval(function () {
      var s = self.S(); if (!s.playing || s.screen !== "review") return;
      var max = D.dur[s.cid], nt = Math.min(max, s.t + 100 * s.speed);
      self.setState({ t: nt, playing: nt < max });
    }, 100);
  }
  componentWillUnmount() { clearInterval(this._tick); this.clearTimers(); }
  clearTimers() { ["_failT", "_recT", "_loadT"].forEach(function (k) { if (this[k]) { clearTimeout(this[k]); this[k] = null; } }, this); }
  componentDidUpdate() {
    var s = this.S(), key = s.cid + "|" + s.sel + "|" + s.sheet + "|" + s.screen + "|" + s.pview;
    if (key !== this._lastKey) {
      this._lastKey = key;
      var pane = this._doc, mark = this._mark;
      if (pane && mark) pane.scrollTop = Math.max(0, mark.offsetTop - pane.clientHeight / 3);
      else if (pane) pane.scrollTop = 0;
      var lp = this._list, row = this._row;
      if (lp && row && (row.offsetTop < lp.scrollTop || row.offsetTop + row.offsetHeight > lp.scrollTop + lp.clientHeight))
        lp.scrollTop = Math.max(0, row.offsetTop - lp.clientHeight / 3);
    }
    if (s.mode && this._editFor !== s.mode.fid + s.mode.kind) { this._editFor = s.mode.fid + s.mode.kind; if (this._edit) this._edit.focus(); }
    if (!s.mode) this._editFor = null;
    if (!s.sel && s.screen === "review") {  // open the first field once one exists; never moves after that
      var snap = this.snap(s), views = this.views(s, snap), ord = this.order(Object.assign({}, s, { filter: "all" }), snap, views);
      if (ord.length) this.setState({ sel: ord[0] });
    }
  }

  // ----- time -----
  viewT(s) { return s.conn === "reconnecting" && s.frozenT !== null ? s.frozenT : s.t; }
  snap(s) { var m = D.meta[s.cid]; return fold(s.cid, m.preloaded ? Infinity : this.viewT(s)); }
  reviewerClock(s) { return D.meta[s.cid].preloaded ? ILLUSTRATIVE.accepted : clockAt(s.cid, Math.max(0, s.t)); }
  scrubTo(nt) {
    var s = this.S(), dec = {}, k;
    for (k in s.decisions) if (D.meta[s.cid].preloaded || s.decisions[k].atMs <= nt) dec[k] = s.decisions[k];
    this.setState({ t: nt, decisions: dec, mode: nt < s.t ? null : s.mode, alert: nt < s.t ? null : s.alert });
  }

  // ----- deciding -----
  setDecision(fid, d) {
    var s = this.S(), dec = Object.assign({}, s.decisions), keep = Object.assign({}, s.keep);
    if (d) dec[fid] = d; else delete dec[fid];
    keep[fid] = true;
    this.setState({ decisions: dec, keep: keep, mode: null, alert: null });
  }
  stamp(s, f, action, value, reason) { return { action: action, value: value, reason: reason || null, v: f.version, atMs: s.t, hh: this.reviewerClock(s) }; }
  accept(fid) { var s = this.S(), f = this.snap(s).fields[fid]; if (f) this.setDecision(fid, this.stamp(s, f, "accept", null)); }
  keepMine(fid) {
    var s = this.S(), f = this.snap(s).fields[fid], d = s.decisions[fid]; if (!f || !d) return;
    var mine = d.action === "accept" ? fmt(f.type, f.versions[d.v - 1].value) : d.value;
    this.setDecision(fid, this.stamp(s, f, d.action === "override" ? "override" : "correct", mine, d.reason));
  }
  startEdit(fid, kind) {
    var s = this.S(), f = this.snap(s).fields[fid]; if (!f) return;
    var val = kind === "correct" ? (f.value === null ? "" : fmt(f.type, f.value)) : "";
    this.setState({ mode: { fid: fid, kind: kind, val: val, reason: "", v: f.version, label: "Your value" }, alert: null });
  }
  save() {
    var s = this.S(), m = s.mode; if (!m) return;
    var f = this.snap(s).fields[m.fid]; if (!f) return;
    var val = (m.val || "").trim(), why = (m.reason || "").trim();
    if (!val || (m.kind === "reject" && !why)) return;
    if (f.version > m.v) {  // the agent changed it while you were deciding: refused, your text stays
      this.setState({ mode: Object.assign({}, m, { v: f.version, label: m.kind === "reject" ? "Your value (kept)" : "Your correction (kept)" }),
        alert: { fid: m.fid, kind: "refused" } });
      return;
    }
    this.setDecision(m.fid, this.stamp(s, f, m.kind === "reject" ? "override" : "correct", val, m.kind === "reject" ? why : null));
  }
  undo(fid) { var s = this.S(); if (s.completed) return; this.setDecision(fid, null); }
  failSave(fid) {  // the decision shows at once, then the save fails and the field goes back
    var self = this; this.accept(fid);
    this._failT = setTimeout(function () {
      var s = self.S(), dec = Object.assign({}, s.decisions); delete dec[fid];
      self.setState({ decisions: dec, alert: { fid: fid, kind: "failed" } });
    }, 900);
  }

  // ----- navigation -----
  order(s, snap, views) {
    var out = [];
    D.groups[s.cid].forEach(function (g) { g[1].forEach(function (fid) { var v = views[fid]; if (v && this.inFilter(s, v)) out.push(fid); }, this); }, this);
    return out;
  }
  inFilter(s, v) { if (s.keep[v.id]) return true; if (s.filter === "needs") return v.attn; if (s.filter === "review") return !v.decided; return true; }
  move(dir) {
    var s = this.S(), snap = this.snap(s), views = this.views(s, snap), ord = this.order(s, snap, views);
    if (!ord.length) return;
    var i = ord.indexOf(s.sel), j = i < 0 ? 0 : Math.max(0, Math.min(ord.length - 1, i + dir));
    this.setState({ sel: ord[j], mode: null, sheet: false });
  }
  skip() {
    var s = this.S(), snap = this.snap(s), views = this.views(s, snap), ord = this.order(s, snap, views), i = ord.indexOf(s.sel);
    for (var k = 1; k <= ord.length; k++) { var fid = ord[(i + k) % ord.length]; if (!views[fid].decided) { this.setState({ sel: fid, mode: null }); return; } }
  }

  // ----- the merge rule and field statuses (fieldView) -----
  views(s, snap) {
    var out = {}, k;
    for (k in snap.fields) out[k] = this.fieldView(s, snap, snap.fields[k], s.decisions[k] || null);
    return out;
  }
  fieldView(s, snap, f, d) {
    if (d && d.v > f.version) d = null;  // a decision from a later moment of the run (scrubbed back)
    var stale = !!d && d.v < f.version;  // decided, then the agent revised the value: the decision stays
    var alert = s.alert && s.alert.fid === f.id ? s.alert.kind : null;
    var text = cited(f.source), notin = inCite(f.type, f.value, text) === false;
    var probs = [];
    if (f.source === null) probs.push("No source");
    if (notin) probs.push("Not in source");
    if (f.value === null) probs.push("Empty");
    if (f.conf < 0.6) probs.push("Low " + pct(f.conf) + "%");
    var decided = !!d && !stale;
    var attn = !!alert || stale || (!d && probs.length > 0);
    return { id: f.id, f: f, d: d, stale: stale, alert: alert, probs: probs, notin: notin, cite: text, decided: decided, attn: attn };
  }
  agentWho(cid, f, low) {
    var last = f.versions[f.versions.length - 1];
    var w = "Agent · " + (f.version > 1 ? "changed " + clockAt(cid, last.at) : (f.value === null ? "looked " : "found ") + clockAt(cid, f.firstAt));
    return w + (low ? "" : " · " + confWord(f.conf));
  }
  mineVal(v) { var d = v.d; return d.action === "accept" ? fmt(v.f.type, v.f.versions[d.v - 1].value) : d.value; }

  row(s, v, live, ro) {
    var f = v.f, d = v.d, tags = [], g = "g-pend", cls = [], val = fmt(f.type, f.value), shown = f.value;
    if (v.alert === "failed") tags.push({ t: "Not saved", cls: "attn" });
    if (v.alert === "refused") tags.push({ t: "Decide again", cls: "attn" });
    if (v.stale) tags.push({ t: "Changed after you", cls: "attn" });
    if (v.decided) {
      g = "g-done"; cls.push("mine"); val = this.mineVal(v); shown = val;
      if (d.action === "correct") tags.push({ t: "Corrected", cls: "you" });
      if (d.action === "override") tags.push({ t: "Replaced", cls: "you" });
    } else {
      if (v.attn) g = "g-attn";
      if (!d) v.probs.forEach(function (p) { tags.push({ t: p, cls: "attn" }); });
      if (!tags.length && f.version > 1) tags.push({ t: "Changed", cls: "plain" });
    }
    if (tags.length > 1) tags = [tags[0], { t: "+" + (tags.length - 1), cls: "plain" }];
    if (shown === null) { val = "Not found"; cls.push("empty"); }
    var sel = s.sel === v.id;
    if (sel) cls.push("is-sel");
    if (ro) cls.push("locked");
    if (live && f.firstAt > s.t - 1200) cls.push("fresh");
    var self = this, meaning = v.decided ? "decided by you" : v.attn ? "needs you" : "to check";
    return { n: f.label, v: val, g: g, tags: tags, cls: cls.join(" "), cur: sel ? "true" : "false",
      aria: f.label + ": " + val + ", " + meaning + tags.map(function (t) { return ", " + t.t; }).join(""),
      ref: sel ? this._refs.row : null,
      open: function () { self.setState({ sel: v.id, mode: null, pview: "field", sheet: false }); } };
  }

  card(s, snap, v, ro, pos) {
    var self = this, f = v.f, d = v.d, cid = s.cid, vt = vclass(f.type), low = f.conf < 0.6;
    var c = { name: f.label, group: "", pos: pos, vt: vt, tags: [], isOne: false, isTwo: false, stack: (PHONE || f.type === "text" || f.type === "long_text") ? "stack" : "",
      one: { val: "", cls: "" }, a: {}, b: {}, facts: { pill: "", pcls: "", icon: "", hasIcon: false, who: "" },
      hasAlert: false, alert: { t: "", retry: false, onRetry: null }, hasEdit: false, edit: { label: "", val: "", ph: "", reason: false, rval: "", vt: "" },
      actions: [], hasActions: false, skip: false, undo: false, skipPhone: false, undoPhone: false, pf: "c3t", ro: ro, roText: "",
      details: [], keys: !ro, canShowAll: false, allCls: "", allLabel: "Show all", toggleAll: null,
      notein: "", hasQuote: false, quote: "", src: "", nosrc: f.source === null };
    D.groups[cid].forEach(function (g) { if (g[1].indexOf(f.id) > -1) c.group = g[0]; });
    // tags: orange = still needs you, grey = already decided or information
    if (v.stale) {
      c.tags.push({ t: "Changed after you", cls: "attn" });
      v.probs.forEach(function (p) { c.tags.push({ t: p, cls: "attn" }); });
      c.tags.push({ t: "Blocks sign-off", cls: "attn" });
    } else v.probs.forEach(function (p) { c.tags.push({ t: p, cls: d ? "plain" : "attn" }); });
    if (!d && f.version > 1 && v.alert !== "refused") c.tags.push({ t: "Changed by agent", cls: "plain" });
    var lastV = f.versions[f.versions.length - 1], cc = f.confs.filter(function (x) { return x.at > lastV.at; });
    if (cc.length) c.tags.push({ t: "Confidence " + pct(cc[0].from) + "% → " + pct(cc[cc.length - 1].to) + "%", cls: "plain" });

    var agentNow = { val: fmt(f.type, f.value), cls: "open" + (f.value === null ? " empty" : ""), pill: "Not decided", pcls: "open", hasPill: true, icon: "", hasIcon: false, who: this.agentWho(cid, f, low) };
    var mine = d ? { val: this.mineVal(v), cls: "yours", pill: "You · " + VERB[d.action] + " " + d.hh, pcls: "yours", hasPill: true, icon: PILL_IC[d.action], hasIcon: true, who: "" } : null;
    if (mine && mine.val === "Not found in documents") mine.cls = "yours empty";
    var editing = s.mode && s.mode.fid === f.id;
    if (editing) {
      var m = s.mode;
      c.hasEdit = true;
      c.edit = { label: m.label, val: m.val, ph: m.kind === "reject" ? "Enter the right value" : "", reason: m.kind === "reject", rval: m.reason, vt: vt === "v-num" ? "" : "v-text" };
      if (v.alert === "refused") {  // show what the agent has now, above your kept text
        c.isOne = true; c.one = { val: agentNow.val, cls: agentNow.cls };
        c.facts = { pill: "Not decided", pcls: "open", icon: "", hasIcon: false, who: agentNow.who };
      }
    } else if (v.stale) {
      c.isTwo = true; c.a = mine; c.b = agentNow;
    } else if (d && d.action !== "accept") {
      c.isTwo = true; c.a = Object.assign({}, agentNow, { cls: "open old" + (f.value === null ? " empty" : ""), pill: "", hasPill: false, who: this.agentWho(cid, f, false) }); c.b = mine;
    } else if (!d && f.version > 1) {
      var prev = f.versions[f.versions.length - 2];
      c.isTwo = true; c.a = { val: fmt(f.type, prev.value), cls: "open old", pill: "", hasPill: false, icon: "", hasIcon: false, who: "Agent · found " + clockAt(cid, prev.at) }; c.b = agentNow;
    } else {
      c.isOne = true;
      c.one = d ? { val: mine.val, cls: mine.cls } : { val: agentNow.val, cls: agentNow.cls };
      c.facts = d ? { pill: mine.pill, pcls: "yours", icon: mine.icon, hasIcon: true, who: this.agentWho(cid, f, false) } : { pill: "Not decided", pcls: "open", icon: "", hasIcon: false, who: agentNow.who };
      if (vt === "v-long" && f.value !== null) {
        var all = !!s.showAll[f.id];
        c.canShowAll = true; c.allCls = all ? "all" : ""; c.allLabel = all ? "Show less" : "Show all";
        c.toggleAll = function () { var o = Object.assign({}, self.S().showAll); o[f.id] = !all; self.setState({ showAll: o }); };
      }
    }
    if (v.alert === "failed") { c.hasAlert = true; c.alert = { t: "Couldn't save.", retry: true, onRetry: function () { self.accept(f.id); } }; }
    if (v.alert === "refused") { c.hasAlert = true; c.alert = { t: "The agent changed this while you were deciding. Please decide again.", retry: false, onRetry: null }; }

    function act(t, icon, primary, on, title, disabled) { var ic = IC[icon] || ["", "1.6"]; return { t: t, d: ic[0], sw: ic[1], hasIcon: !!icon, cls: primary ? "btn-primary" : "", on: on, title: title || t, disabled: !!disabled }; }
    var correct = act("Correct", "pencil", false, function () { self.startEdit(f.id, "correct"); }, "Correct · C");
    var reject = act("Reject", "x", false, function () { self.startEdit(f.id, "reject"); }, "Reject and enter your own value · R");
    if (ro) {
      c.roText = "Read-only · review completed " + s.completed;
    } else if (editing) {
      var m2 = s.mode, ok = (m2.val || "").trim() && (m2.kind !== "reject" || (m2.reason || "").trim());
      c.actions = [act("Save", "check", true, function () { self.save(); }, ok ? "Save · Enter" : (m2.kind === "reject" ? "Needs a value and a reason" : "Needs a value"), !ok),
        act("Cancel", "", false, function () { self.setState({ mode: null, alert: null }); }, "Cancel · Esc")];
    } else if (v.stale) {
      c.actions = [act("Use new", "check", true, function () { self.accept(f.id); }, "Use the new value · A"), act("Keep mine", "shield", false, function () { self.keepMine(f.id); }, "Keep your earlier decision"), correct, reject];
      c.skip = true;
    } else if (d) { c.actions = [correct, reject]; c.undo = true; }
    else { c.actions = [act("Accept", "check", true, function () { self.accept(f.id); }, "Accept · A"), correct, reject]; c.skip = true; }
    c.hasActions = c.actions.length > 0;
    var n = c.actions.length;
    c.pf = (n === 4 || (n === 2 && !c.skip && !c.undo)) ? "c2" : (n === 2 ? "c2t" : "c3t");
    c.skipPhone = c.skip && n !== 4; c.undoPhone = c.undo;

    // details: closed unless it matters for this field
    var pad = PHONE ? "padding: 0 16px 16px 34px" : "padding: 0 24px 16px 42px";
    if (f.version > 1) c.details.push({ title: "Why it changed", open: true, meta: "", lines: [lastV.reason], pad: pad });
    if (cc.length) c.details.push({ title: "Why confidence changed", open: true, meta: "", lines: [cc[cc.length - 1].reason], pad: pad });
    if (d && d.reason) c.details.push({ title: "Your reason", open: true, meta: "", lines: [d.reason], pad: pad });
    if (f.versions.length > 1) c.details.push({ title: "History", open: false, meta: f.versions.length + " versions", pad: pad,
      lines: f.versions.map(function (x) { return "Version " + x.v + " · " + fmt(f.type, x.value) + " · " + clockAt(cid, x.at) + " · " + confWord(x.conf); }) });

    // evidence on phone (laptop: the document panel)
    if (v.notin && !d) c.notein = fmt(f.type, f.value) + " not found in the cited text";
    if (v.cite !== null) {
      c.hasQuote = true; c.src = D.docs[f.source.document_id].title;
      c.quote = v.cite.length > 150 ? v.cite.slice(0, 150).replace(/\s+\S*$/, "") + " …" : v.cite;
    }
    if (editing || v.stale) c.notein = "";
    return c;
  }

  // ----- jumps -----
  jump(k) {
    this.clearTimers();
    var self = this, base = { screen: "review", conn: "ok", frozenT: null, playing: false, decisions: {}, sel: null, mode: null, alert: null,
      completed: null, filter: "all", exp: {}, keep: {}, pview: "list", sheet: false, showAll: {} };
    function all09() { var o = {}; fold(C09, Infinity); Object.keys(fold(C09, Infinity).fields).forEach(function (fid) { o[fid] = { action: "accept", value: null, reason: null, v: 1, atMs: 0, hh: ILLUSTRATIVE.accepted }; }); return o; }
    var st = null;
    if (k === "start") st = { cid: C17, t: 0 };
    else if (k === "queued") st = { cid: C30, t: -1 };
    else if (k === "running") st = { cid: C17, t: 80000, decisions: sampleDecisions(), sel: "total_incl_vat", playing: true };
    else if (k === "warning") st = { cid: C17, t: 100800, decisions: sampleDecisions(), sel: "liability_assessment" };
    else if (k === "failed") st = { cid: C22, t: D.dur[C22], sel: "discovered_at" };
    else if (k === "finished") st = { cid: C09, t: D.dur[C09], sel: "claim_type" };
    else if (k === "blocked") st = { cid: C17, t: D.dur[C17], decisions: sampleDecisions(), sel: "total_incl_vat" };
    else if (k === "ready") st = { cid: C09, t: D.dur[C09], decisions: all09(), sel: "claim_type" };
    else if (k === "reviewed") st = { cid: C09, t: D.dur[C09], decisions: all09(), sel: "claim_type", completed: ILLUSTRATIVE.completed };
    else if (k === "loading") st = { cid: C17, t: 80000, screen: "loading" };
    else if (k === "down") st = { cid: C17, t: 80000, screen: "down" };
    else if (k === "notfound") st = { cid: C17, t: 80000, screen: "notfound" };
    else if (k === "reconnecting") {
      st = { cid: C17, t: 80000, decisions: sampleDecisions(), sel: "total_incl_vat", playing: true, conn: "reconnecting", frozenT: 80000 };
      this._recT = setTimeout(function () { self.setState({ conn: "ok", frozenT: null }); }, 4000);
    } else if (k === "saveFailed") {
      st = { cid: C17, t: 80000, decisions: sampleDecisions(), sel: "witness_name", pview: "field" };
      this.setState(Object.assign(base, st));
      setTimeout(function () { self.failSave("witness_name"); }, 400);
      return;
    } else if (k === "refused") {
      var dd = sampleDecisions(); delete dd.liability_assessment;
      st = { cid: C17, t: 66000, decisions: dd, sel: "liability_assessment", pview: "field",
        mode: { fid: "liability_assessment", kind: "correct", val: "Third party at fault", reason: "", v: 2, label: "Your correction (kept)" },
        alert: { fid: "liability_assessment", kind: "refused" } };
    }
    if (st) this.setState(Object.assign(base, st));
  }

  // ----- keys -----
  onKey(e) {
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
    var s = this.S(); if (s.screen !== "review" || !s.sel || s.sel === "summary") { if (e.key === "j" || e.key === "k") this.move(e.key === "j" ? 1 : -1); return; }
    var v = this.views(s, this.snap(s))[s.sel]; if (!v) return;
    var ro = !!s.completed, k = e.key.toLowerCase();
    if (k === "j") this.move(1); else if (k === "k") this.move(-1); else if (k === "s") this.skip();
    else if (ro) return;
    else if (k === "a" && (!v.d || v.stale)) this.accept(s.sel);
    else if (k === "c") this.startEdit(s.sel, "correct");
    else if (k === "r") this.startEdit(s.sel, "reject");
    else if (k === "u" && v.d) this.undo(s.sel);
    else return;
    e.preventDefault();
  }

  renderVals() {
    var self = this, s = this.S();
    if (!this._refs) this._refs = { doc: function (el) { self._doc = el; }, mark: function (el) { self._mark = el; }, list: function (el) { self._list = el; },
      row: function (el) { self._row = el; }, edit: function (el) { self._edit = el; } };
    var m = D.meta[s.cid], snap = this.snap(s), views = this.views(s, snap), ro = !!s.completed;
    var live = snap.status === "running" && !m.preloaded;
    var ids = Object.keys(views), total = ids.length, done = 0, needs = 0, left = 0, k;
    for (k in views) { if (views[k].decided) done++; else left++; if (views[k].attn) needs++; }
    if (s.sel && s.sel !== "summary" && !views[s.sel]) s = Object.assign({}, s, { sel: null });
    if (!s.sel && ids.length) { var first = this.order(Object.assign({}, s, { filter: "all" }), snap, views)[0]; s = Object.assign({}, s, { sel: first }); }

    // header
    var lastRun = null; snap.steps.forEach(function (x) { if (x.state === "running") lastRun = x; });
    var status = ro ? "reviewed" : snap.status;
    var sub = status === "queued" ? "Received " + m.received : status === "running" ? (lastRun ? lastRun.label : "Working") :
      status === "failed" ? "Stopped at " + snap.steps.filter(function (x) { return x.state === "failed"; })[0].label :
      status === "reviewed" ? "Completed " + s.completed : "Agent finished " + clockAt(s.cid, snap.endAt);
    var ended = snap.status === "finished" || snap.status === "failed";
    var cLabel = "Complete review", why = "";
    if (status === "queued") { cLabel = "Complete review · not started"; why = "Available when the agent has finished"; }
    else if (left > 0) { cLabel = "Complete review · " + left + " left"; why = left + (left === 1 ? " field still needs" : " fields still need") + " a decision"; }
    else if (!ended) { cLabel = "Complete review · agent working"; why = "Available when the agent has finished"; }
    var reconnecting = s.conn === "reconnecting";
    var h = { cid: s.cid, who: m.name + " · " + m.product, psub: reconnecting ? "Reconnecting…" : m.name + " · " + m.product,
      sub: reconnecting ? "Reconnecting…" : sub, reconnecting: reconnecting,
      chipQueued: status === "queued", chipRunning: status === "running", chipReview: status === "finished", chipFailed: status === "failed", chipReviewed: status === "reviewed",
      hasProg: status !== "queued" && total > 0, total: total, done: done, pct: total ? Math.round(100 * done / total) : 0,
      canComplete: !ro && ended && left === 0 && total > 0, blocked: !ro && !(ended && left === 0 && total > 0), cLabel: cLabel, why: why,
      roDone: ro ? "Read-only · completed " + s.completed : "" };

    // agent step line
    var notes = snap.steps.filter(function (x) { return x.note; }), fin = snap.steps.filter(function (x) { return x.state !== "running"; }).length;
    var stepsMeta = "Agent steps " + fin + " of " + snap.steps.length;
    var latest = notes[notes.length - 1];
    var b = { fail: snap.status === "failed", line: snap.status !== "failed" && snap.steps.length > 0, retry: !ro,
      gAttn: !!latest, gOk: !latest && !live, gRun: !latest && live,
      title: latest ? latest.label : (live && lastRun ? lastRun.label : "No notes"), text: latest ? latest.note : "",
      ptext: latest ? " · " + latest.note : "", count: notes.length > 1 ? String(notes.length) : "",
      meta: (notes.length > 1 ? notes.length + " notes · " : "") + stepsMeta,
      steps: snap.steps.map(function (x) {
        var fail = x.state === "failed", run = x.state === "running", note = !!x.note && !fail && !run;
        return { label: x.label, ok: !fail && !run && !note, note: note, run: run, fail: fail, lab: (fail || run || note) ? "lab" : "lab dim",
          text: fail ? snap.error.message : run ? "Running" : (x.note || "") };
      }) };
    if (b.fail) { b.title = snap.steps.filter(function (x) { return x.state === "failed"; })[0].label + " failed"; b.text = snap.error.message + (D.notChecked[s.cid] ? " Not checked: policy cover and excess." : ""); b.retry = !ro && snap.error.retryable; }

    // list
    var seg = { needsN: needs, reviewN: left, allN: total, needsP: s.filter === "needs" ? "true" : "false", reviewP: s.filter === "review" ? "true" : "false", allP: s.filter === "all" ? "true" : "false",
      needs: function () { self.setState({ filter: "needs", keep: {} }); }, review: function () { self.setState({ filter: "review", keep: {} }); }, all: function () { self.setState({ filter: "all", keep: {} }); } };
    var sections = [];
    D.groups[s.cid].forEach(function (g) {
      var vs = g[1].map(function (fid) { return views[fid]; }).filter(Boolean); if (!vs.length) return;
      var exp = !!s.exp[g[0]], dec = vs.filter(function (v) { return v.decided; }).length, at = vs.filter(function (v) { return v.attn; }).length;
      var shown = vs.filter(function (v) {
        if (s.filter !== "all") return self.inFilter(s, v);
        return exp || v.attn || v.id === s.sel || s.keep[v.id];
      });
      if (s.filter !== "all" && !shown.length) return;
      sections.push({ name: g[0], cnt: dec + "/" + vs.length, attn: at ? String(at) : "", attnLabel: at + " need you", exp: (exp || s.filter !== "all") ? "true" : "false",
        rot: (exp || s.filter !== "all") ? "transform: rotate(90deg)" : "", live: live && g[1].indexOf(snap.lastFid) > -1, tag: "",
        rows: shown.map(function (v) { return self.row(s, v, live && s.playing, ro); }),
        toggle: function () { if (self.S().filter !== "all") return; var o = Object.assign({}, self.S().exp); o[g[0]] = !exp; self.setState({ exp: o }); } });
    });
    if (D.notChecked[s.cid] && snap.status === "failed") sections.push({ name: D.notChecked[s.cid], cnt: "", attn: "", attnLabel: "", exp: "false", rot: "", live: false, tag: "Not checked", rows: [], toggle: null });

    // summary
        var sum = { has: snap.status !== "queued", cur: s.sel === "summary" ? "true" : "false", tag: snap.status === "failed" ? "AI draft · incomplete" : "AI draft · not verified",
      segs: segs(snap.summary), empty: !snap.summary, writing: live && snap.summary.length > 0,
      incomplete: snap.status === "failed" ? "Incomplete: the run stopped before " + snap.steps.filter(function (x) { return x.state === "failed"; })[0].label.toLowerCase() + "." : "",
      open: function () { self.setState({ sel: "summary", mode: null, pview: "summary", sheet: false }); } };

    // open field
    var ord = this.order(s, snap, views), selV = s.sel && s.sel !== "summary" ? views[s.sel] : null;
    var fl = { needs: "Needs you", review: "To review", all: "All" }[s.filter];
    var pos = selV ? fl + " · " + (ord.indexOf(s.sel) + 1 || "—") + " of " + ord.length : "";
    var c = selV ? this.card(s, snap, selV, ro, pos) : this.card(s, snap, { id: "", f: { id: "", label: "", type: "text", value: "", conf: 1, source: null, version: 1, versions: [{ v: 1, at: 0 }], confs: [], firstAt: 0 }, d: null, probs: [], cite: null }, ro, "");
    var msg = status === "queued" ? { h: "Waiting for the agent to start", p: "Fields appear here as the agent reads the documents." } : { h: "Waiting for the first field", p: "Fields appear here as the agent reads the documents." };

    // evidence panel
    var p = { show: status !== "queued", title: "Source", titleCls: "ink-2", note: "", hasDoc: false, nosrc: false, blank: "", before: "", mark: "", after: "" };
    if (selV && selV.f.source) {
      var doc = D.docs[selV.f.source.document_id], src = selV.f.source;
      p.title = doc.title; p.titleCls = ""; p.hasDoc = true;
      p.before = doc.text.slice(0, src.start); p.mark = doc.text.slice(src.start, src.end); p.after = doc.text.slice(src.end);
      if (selV.notin) p.note = fmt(selV.f.type, selV.f.value) + " not found in the cited text";
    } else if (selV) p.nosrc = true;
    else p.blank = s.sel === "summary" ? "The summary is the agent's own draft. It cites no single document." : "Open a field to see its cited text.";

    // prototype panel
    var maxT = D.dur[s.cid];
    var dv = { cid: s.cid, mode: m.preloaded ? (PHONE ? "loaded at once" : "loaded at once (run finished before the session)") : (s.speed + "×" + (PHONE ? "" : " · agent times from the fixture")),
      playing: s.playing, paused: !s.playing, playLabel: s.playing ? "Pause" : "Play", noPlay: m.preloaded || s.screen !== "review", max: maxT, t: Math.max(0, s.t),
      time: m.preloaded ? "final" : secs(s.t) + " / " + secs(maxT),
      speeds: SPEEDS.map(function (x) { return { t: x + "×", p: s.speed === x ? "true" : "false", on: function () { self.setState({ speed: x }); } }; }),
      toggle: function () { var q = self.S(); if (q.t >= D.dur[q.cid]) self.scrubTo(0); self.setState({ playing: !q.playing }); },
      restart: function () { self.setState({ t: 0, decisions: {}, mode: null, alert: null, completed: null, keep: {}, sel: null, playing: true }); },
      scrub: function (e) { self.scrubTo(parseInt(e.target.value, 10)); },
      menu: !!s.menu, menuExp: s.menu ? "true" : "false", toggleMenu: function () { self.setState({ menu: !self.S().menu }); },
      states: D.states.map(function (o) { return { t: o[1], on: function () { self.setState({ menu: false }); self.jump(o[0]); } }; }) };

    var scrLap = { review: s.screen === "review", loading: s.screen === "loading", down: s.screen === "down", notfound: s.screen === "notfound" };
    var pv = s.pview;
    if (pv === "field" && !selV) pv = "list";
    if (pv === "summary" && s.sel !== "summary") pv = "list";
    var scrPhone = { list: scrLap.review && pv === "list", field: scrLap.review && pv === "field", summary: scrLap.review && pv === "summary",
      loading: scrLap.loading, down: scrLap.down, notfound: scrLap.notfound };

    return {
      scr: PHONE ? scrPhone : scrLap, h: h, b: b, seg: seg, sections: sections, sum: sum, c: c, p: p, dv: dv, msg: msg,
      gridCols: status === "queued" ? "320px minmax(0, 1fr)" : "320px minmax(0, 1fr) 400px",
      noFields: !total, noFieldsText: "No fields yet",
      showCard: !!selV, showSummary: s.sel === "summary", showMsg: !total && s.sel !== "summary", showMsgP: status === "queued", showList: status !== "queued",
      mainLabel: selV ? selV.f.label : (s.sel === "summary" ? "Summary" : "Field"),
      sheet: { open: PHONE && s.sheet && !!selV && !!selV.f.source && scrPhone.field },
      docRef: this._refs.doc, markRef: this._refs.mark, listRef: this._refs.list, editRef: this._refs.edit,
      onKey: function (e) { self.onKey(e); },
      onVal: function (e) { var q = self.S(); if (q.mode) self.setState({ mode: Object.assign({}, q.mode, { val: e.target.value }) }); },
      onReason: function (e) { var q = self.S(); if (q.mode) self.setState({ mode: Object.assign({}, q.mode, { reason: e.target.value }) }); },
      onEditKey: function (e) { if (e.key === "Enter") { e.preventDefault(); self.save(); } else if (e.key === "Escape") { e.preventDefault(); self.setState({ mode: null, alert: null }); } e.stopPropagation(); },
      prev: function () { self.move(-1); }, next: function () { self.move(1); }, skip: function () { self.skip(); },
      undo: function () { if (s.sel) self.undo(s.sel); },
      complete: function () { var q = self.S(); self.setState({ completed: D.meta[q.cid].preloaded ? ILLUSTRATIVE.completed : self.reviewerClock(q), mode: null, alert: null, playing: false }); },
      retryRun: function () { self.setState({ t: 0, playing: true, alert: null, mode: null }); },
      tryAgain: function () { self.setState({ screen: "loading" }); self._loadT = setTimeout(function () { self.jump("running"); }, 1200); },
      toList: function () { self.setState({ pview: "list", sheet: false, mode: null }); },
      openSheet: function () { self.setState({ sheet: true }); }, closeSheet: function () { self.setState({ sheet: false }); }
    };
  }
}
"""


def js_data(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def page(title, body, w, h, phone):
    script = JS.replace("__DATA__", js_data(DATA)).replace("__PHONE__", "true" if phone else "false")
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
{script}
</script>
</body>
</html>
'''


(OUT / "project").mkdir(parents=True, exist_ok=True)
for name, title, body, w, h, phone in [("G-proto-laptop", "Review prototype, laptop", LAPTOP_BODY, 1280, H_LAP, False),
                                       ("G-proto-phone", "Review prototype, phone", PHONE_BODY, 375, H_PH, True)]:
    t = page(title, body, w, h, phone)
    root = t[t.index(":root{"): t.index("}", t.index(":root{"))]
    style = t[t.index("<style>"): t.index("</style>")].replace(root, "")
    tmpl = body
    hexes = set(re.findall(r"#[0-9A-Fa-f]{3,8}\b", style + tmpl))
    assert "@@" not in t and "%%" not in t, name
    assert "innerHTML" not in t and "dangerouslySetInnerHTML" not in t
    (OUT / f"project/{name}.dc.html").write_text(t)
    print(name, w, "x", h, len(t), "stray hex:", hexes)
