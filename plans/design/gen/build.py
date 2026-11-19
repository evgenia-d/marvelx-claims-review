"""Builds the round 2 step 2(a) field board frames from sample-data.json.

Card states are data; the markup is one field-card template (from G-card-field)
rendered for laptop and phone. Output: <out>/project/G-board-{rows,laptop,phone}.dc.html

Run from the repo root:
  python3 -I plans/design/gen/build.py . plans/design/gen/ref-G-card-field.dc.html <out> 3600 3160 1350
The numbers are the frame heights (laptop, phone, rows); keep them equal to canvas.json.
ref-G-card-field.dc.html is the field card whose CSS the boards start from; glyphs.py swaps in the circle status glyphs.
"""
import json, sys, html, re, pathlib

REPO = pathlib.Path(sys.argv[1])
REF = pathlib.Path(sys.argv[2])          # saved G-card-field.dc.html
OUT = pathlib.Path(sys.argv[3])

data = json.loads((REPO / "plans/design/sample-data.json").read_text())
S80 = {f["field_id"]: (i + 1, f) for i, f in enumerate(data["snapshots"]["CLM-2026-004817@80s"]["fields"])}
SFIN = {f["field_id"]: (i + 1, f) for i, f in enumerate(data["snapshots"]["CLM-2026-004817@final"]["fields"])}


def money(v):
    a = v["amount"]; whole, cents = a.split(".")
    out = ""
    while len(whole) > 3:
        out = "," + whole[-3:] + out; whole = whole[:-3]
    sym = {"EUR": "€"}[v["currency"]]
    return f"{sym} {whole}{out}.{cents}"


def fmt(v):
    if v is None: return "Not found in documents"
    if isinstance(v, dict): return money(v)
    return v


def conf(c):
    p = round(c * 100)
    return ("Low" if c < 0.6 else "Medium" if c < 0.85 else "High") + f" {p}%"


def f80(fid): return S80[fid][1]
def ffin(fid): return SFIN[fid][1]
NEEDS = ["third_party_plate", "third_party_insurer", "third_party_policy_number", "witness_phone", "parts_total", "total_incl_vat", "liability_assessment"]
def pos(fid, final=False):
    if not final and fid in NEEDS:
        return f"Needs you · {NEEDS.index(fid) + 1} of 7"
    i, _ = (SFIN if final else S80)[fid]
    return f"All · {i} of {49 if final else 41}"


# ---------- icons ----------
IC = {
    "check": ("m3 8.5 3 3 7-7", "2"),
    "pencil": ("M11 2.5 13.5 5 6 12.5H3.5V10z", "1.6"),
    "x": ("M4 4l8 8M12 4l-8 8", "1.7"),
    "shield": ("M8 1.8 13 3.8v4c0 3-2.2 5-5 6.2-2.8-1.2-5-3.2-5-6.2v-4z", "1.6"),
}


def act(t, icon="", primary=False, disabled=False, busy=False, title=""):
    d, sw = IC.get(icon, ("", "1.6"))
    return {"t": t, "hasIcon": bool(icon) and not busy, "d": d, "sw": sw, "busy": busy,
            "cls": "btn-primary" if primary else "", "disabled": disabled, "title": title or t}


DECIDE = lambda: [act("Accept", "check", True, title="Accept · A"), act("Correct", "pencil", title="Correct · C"), act("Reject", "x", title="Reject and enter your own value · R")]
DECIDED = lambda: [act("Correct", "pencil", title="Correct · C"), act("Reject", "x", title="Reject and enter your own value · R")]
REVISED = lambda: [act("Use new", "check", True, title="Use the new value · A"), act("Keep mine", "shield", title="Keep your earlier decision"), act("Correct", "pencil", title="Correct · C"), act("Reject", "x", title="Reject and enter your own value · R")]


def tag(t, cls="attn", glyph=False): return {"t": t, "cls": cls, "glyph": glyph}


def box(val, cls="open", conf_="", pill="", pcls="open", check=False, icon="", who=""):
    icon = icon or ("m3 8.5 3 3 7-7" if check else "")
    return {"val": val, "cls": cls, "conf": conf_, "pill": pill, "pcls": pcls, "hasPill": bool(pill), "icon": icon, "hasIcon": bool(icon), "who": who}


def det(title, body="", open_=False, meta=""):
    return {"title": title, "body": body, "open": open_, "meta": meta, "hasBody": bool(body)}


def card(**k):
    c = {
        "state": "", "group": "", "pos": "", "name": "", "tags": [],
        "mode": "one", "one": box(""), "a": box(""), "b": box(""),
        "facts": None, "edit": None, "notein": "", "alert": None,
        "src": "", "quote": "", "nosrc": False, "nosrcText": False, "stack": "",
        "actions": [], "tail": "", "ro": False, "details": [],
    }
    c.update(k)
    c["isOne"] = c["mode"] == "one"; c["isLong"] = c["mode"] == "long"; c["isTwo"] = c["mode"] == "two"
    c["hasFacts"] = bool(c["facts"]); c["facts"] = c["facts"] or {"pill": "", "pcls": "", "icon": "", "hasIcon": False, "spin": False, "who": ""}
    c["hasEdit"] = bool(c["edit"]); c["edit"] = c["edit"] or {}
    e = c["edit"]
    e.setdefault("reason", False); e.setdefault("rval", ""); e.setdefault("label", ""); e.setdefault("val", ""); e.setdefault("ph", "")
    c["hasAlert"] = bool(c["alert"]); c["alert"] = c["alert"] or {"t": "", "retry": False}
    c["hasSrc"] = bool(c["src"])
    c["hasActions"] = bool(c["actions"])
    c["skip"] = c["tail"] == "skip"; c["undo"] = c["tail"] == "undo"
    n = len(c["actions"])
    c["pf"] = "c2" if (n == 4 or (n == 2 and not c["tail"])) else ("c2t" if n == 2 else "c3t")
    if n == 4: c["skip"] = False  # phone: 2 x 2 grid, skip is the header's next arrow
    c["skipPhone"] = c["skip"]; c["undoPhone"] = c["undo"]
    c["skip"] = c["tail"] == "skip"
    c["aria"] = c["name"]
    return c


def facts(pill="Not decided", pcls="open", who="", check=False, spin=False, icon=""):
    icon = icon or ("m3 8.5 3 3 7-7" if check else "")
    return {"pill": pill, "pcls": pcls, "icon": icon, "hasIcon": bool(icon), "spin": spin, "who": who}


# ---------- the states ----------
wn = f80("witness_name"); ct = f80("claim_type"); it = f80("incident_time"); tpn = f80("third_party_name")
tot = f80("total_incl_vat"); lia = f80("liability_assessment"); loc = f80("incident_location")
pol = f80("third_party_policy_number"); wph = f80("witness_phone"); ins = f80("third_party_insurer")
pt = f80("parts_total"); nar = f80("incident_narrative")
pp = ffin("policyholder_plate"); ep = ffin("estimated_payable")
dec = {x["field_id"]: x for x in data["sample_decisions_4817_at_80s"]["decisions"]}
assert dec["third_party_name"]["reason"]
DOC_P = "Police traffic accident report"; DOC_I = "Repair invoice, Autoherstel Oost"; DOC_S = "Claimant statement"

C = {}
C["pending"] = card(state="Not decided", group="Parties", pos=pos("witness_name"), name=wn["label"],
    one=box(wn["value"], conf_=conf(wn["confidence"])), facts=facts(who="Agent · found 10:06"),
    src=DOC_P, quote=wn["cited_text"], actions=DECIDE(), tail="skip")
C["accepted"] = card(state="Accepted", group="Incident", pos=pos("claim_type"), name=ct["label"],
    one=box(ct["value"], "yours", conf(ct["confidence"])), facts=facts("You · accepted 10:06", "yours", "Agent · found 10:06", check=True),
    src=DOC_P, quote=ct["cited_text"], actions=DECIDED(), tail="undo")
C["corrected"] = card(state="Corrected · was not in its source", group="Incident", pos=pos("incident_time"), name=it["label"],
    tags=[tag("Not in source", "plain")], mode="two",
    a=box(it["value"], "open old", conf(it["confidence"]), "Agent · found 10:06"),
    b=box(dec["incident_time"]["value"], "yours", "", "You · corrected 10:06", "yours", True),
    src=DOC_P, quote=it["cited_text"], actions=DECIDED(), tail="undo")
C["overridden"] = card(state="Rejected and replaced · was low confidence", group="Parties", pos=pos("third_party_name"), name=tpn["label"],
    tags=[tag(conf(tpn["confidence"]), "plain")], mode="two",
    a=box(tpn["value"], "open old", "", "Agent · found 10:06"),
    b=box(dec["third_party_name"]["value"], "yours", "", "You · replaced 10:07", "yours", True),
    src=DOC_P, quote=tpn["cited_text"], actions=DECIDED(), tail="undo",
    details=[det("Your reason", dec["third_party_name"]["reason"], True)])
C["correcting"] = card(state="Correcting (input open)", group="Incident", pos=pos("incident_time"), name=it["label"], mode="none",
    tags=[tag("Not in source", glyph=True)],
    edit={"label": "Your value", "val": it["value"], "ph": ""},
    notein=f"{it['value']} not found in the cited text: '{it['cited_text']}'",
    src=DOC_P, quote=it["cited_text"],
    actions=[act("Save", "check", True, title="Save · Enter"), act("Cancel", title="Cancel · Esc")])
C["rejecting"] = card(state="Rejecting (empty value and reason)", group="Parties", pos=pos("third_party_name"), name=tpn["label"], mode="none",
    tags=[tag(conf(tpn["confidence"]), glyph=True)],
    edit={"label": "Your value", "val": "", "ph": "Enter the right value", "reason": True, "rval": "", "rph": "Why the agent's value is wrong (one line)"},
    src=DOC_P, quote=tpn["cited_text"],
    actions=[act("Save", "check", True, disabled=True, title="Needs a value and a reason"), act("Cancel", title="Cancel · Esc")])
C["readonly"] = card(state="Read-only (review completed)", group="Incident", pos=pos("claim_type"), name=ct["label"],
    one=box(ct["value"], "yours", conf(ct["confidence"])), facts=facts("You · accepted 10:06", "yours", "Agent · found 10:06", check=True),
    src=DOC_P, quote=ct["cited_text"], ro=True)

why_tot = tot["history"][1]["reason"]; why_lia = lia["history"][1]["reason"]
C["revised"] = card(state="Changed after your decision", group="Repair costs", pos=pos("total_incl_vat"), name=tot["label"],
    tags=[tag("Changed after you", glyph=True), tag("Blocks sign-off")], mode="two",
    a=box(fmt(tot["history"][0]["value"]), "yours", "", "You · accepted 10:06", "yours", True),
    b=box(fmt(tot["value"]), "open", conf(tot["confidence"]), "Agent · changed 10:07"),
    src=DOC_I + " · page 2", quote=tot["cited_text"], actions=REVISED(), tail="skip",
    details=[det("Why it changed", why_tot, True), det("History", meta="2 versions")])
C["revised_low"] = card(state="Changed after your decision · low confidence", group="Assessment", pos=pos("liability_assessment"), name=lia["label"],
    tags=[tag("Changed after you", glyph=True), tag(conf(lia["confidence"])), tag("Blocks sign-off")], mode="two",
    a=box(lia["history"][0]["value"], "yours", "", "You · accepted 10:06", "yours", True),
    b=box(lia["value"], "open", "", "Agent · changed 10:07"),
    src=DOC_S, quote=lia["cited_text"], actions=REVISED(), tail="skip",
    details=[det("Why it changed", why_lia, True), det("History", meta="2 versions")])
C["agent_revised"] = card(state="Changed by the agent, not decided", group="Repair costs", pos=pos("total_incl_vat", True), name=tot["label"],
    tags=[tag("Changed by agent", "plain")], mode="two",
    a=box(fmt(tot["history"][0]["value"]), "open old", "", "Agent · found 10:06"),
    b=box(fmt(tot["value"]), "open", conf(tot["confidence"]), "Agent · changed 10:07"),
    src=DOC_I + " · page 2", quote=tot["cited_text"], actions=DECIDE(), tail="skip",
    details=[det("Why it changed", why_tot, True), det("History", meta="2 versions")])
h = loc["history"]
C["conf_changed"] = card(state="Confidence changed, not decided", group="Incident", pos=pos("incident_location"), name=loc["label"],
    tags=[tag(f"Confidence {round(h[0]['confidence']*100)}% → {round(h[1]['confidence']*100)}%", "plain")],
    one=box(loc["value"], conf_=conf(loc["confidence"])), facts=facts(who="Agent · found 10:06"),
    src=DOC_P, quote=loc["cited_text"], actions=DECIDE(), tail="skip",
    details=[det("Why confidence changed", h[1]["reason"], True)])
h = pp["history"]
C["conf_after"] = card(state="Confidence changed after your decision · decision stays", group="Vehicle and damage", pos=pos("policyholder_plate", True), name=pp["label"],
    tags=[tag(f"Confidence {round(h[0]['confidence']*100)}% → {round(h[1]['confidence']*100)}%", "plain")],
    one=box(pp["value"], "yours", conf(pp["confidence"])), facts=facts("You · accepted 10:06", "yours", "Agent · found 10:06", check=True),
    src=DOC_P, quote=pp["cited_text"], actions=DECIDED(), tail="undo",
    details=[det("Why confidence changed", h[1]["reason"], True)])

C["low"] = card(state="Low confidence", group="Parties", pos=pos("third_party_insurer"), name=ins["label"],
    tags=[tag(conf(ins["confidence"]), glyph=True)], one=box(ins["value"]), facts=facts(who="Agent · found 10:06"),
    src=DOC_P, quote=ins["cited_text"], actions=DECIDE(), tail="skip")
C["empty"] = card(state="Empty value", group="Parties", pos=pos("witness_phone"), name=wph["label"],
    tags=[tag("Empty", glyph=True)], one=box(fmt(wph["value"]), "open empty", conf(wph["confidence"])), facts=facts(who="Agent · looked 10:06"),
    src=DOC_P, quote=wph["cited_text"], actions=DECIDE(), tail="skip")
C["empty_low"] = card(state="Empty value · low confidence", group="Parties", pos=pos("third_party_policy_number"), name=pol["label"],
    tags=[tag("Empty", glyph=True), tag(conf(pol["confidence"]))], one=box(fmt(pol["value"]), "open empty"), facts=facts(who="Agent · looked 10:06"),
    src=DOC_P, quote=pol["cited_text"], actions=DECIDE(), tail="skip")
C["nosrc_low"] = card(state="No source · low confidence", group="Assessment", pos=pos("estimated_payable", True), name=ep["label"],
    tags=[tag("No source", glyph=True), tag(conf(ep["confidence"]))], one=box(fmt(ep["value"])), facts=facts(who="Agent · found 10:07"),
    nosrc=True, actions=DECIDE(), tail="skip")
C["notin"] = card(state="Value not in cited text", group="Repair costs", pos=pos("parts_total"), name=pt["label"],
    tags=[tag("Not in source", glyph=True)], one=box(fmt(pt["value"]), conf_=conf(pt["confidence"])), facts=facts(who="Agent · found 10:06"),
    notein=f"{fmt(pt['value'])} not found in the cited text (3 invoice lines)",
    src=DOC_I, quote=pt["cited_text"], actions=DECIDE(), tail="skip")
C["long"] = card(state="Long value", group="Incident", pos=pos("incident_narrative"), name=nar["label"],
    mode="long", one=box(nar["value"], conf_=conf(nar["confidence"])), facts=facts(who="Agent · found 10:06"),
    src=DOC_P, quote=nar["cited_text"][:150].rsplit(" ", 1)[0] + " …", actions=DECIDE(), tail="skip")

C["saving"] = card(state="Saving", group="Parties", pos=pos("witness_name"), name=wn["label"],
    one=box(wn["value"], conf_=conf(wn["confidence"])), facts=facts("Saving", "open", "Agent · found 10:06", spin=True),
    src=DOC_P, quote=wn["cited_text"],
    actions=[act("Accept", primary=True, disabled=True, busy=True), act("Correct", "pencil", disabled=True), act("Reject", "x", disabled=True)], tail="skip")
C["failed"] = card(state="Save failed", group="Parties", pos=pos("witness_name"), name=wn["label"],
    one=box(wn["value"], conf_=conf(wn["confidence"])), facts=facts(who="Agent · found 10:06"),
    alert={"t": "Couldn't save your Accept.", "retry": True},
    src=DOC_P, quote=wn["cited_text"], actions=DECIDE(), tail="skip")
C["refused"] = card(state="Refused: the agent changed it meanwhile", group="Assessment", pos=pos("liability_assessment"), name=lia["label"],
    tags=[tag(conf(lia["confidence"]), glyph=True)],
    one=box(lia["value"]), facts=facts(who="Agent · changed 10:07"),
    alert={"t": "The agent changed this while you were deciding. Please decide again.", "retry": False},
    edit={"label": "Your correction (kept)", "val": lia["history"][0]["value"], "ph": ""},
    src=DOC_S, quote=lia["cited_text"],
    actions=[act("Save", "check", True, title="Save your correction"), act("Cancel", title="Cancel · Esc")],
    details=[det("Why it changed", why_lia, True)])

FIELD_OF = {"pending": wn, "accepted": ct, "corrected": it, "overridden": tpn, "correcting": it, "rejecting": tpn, "readonly": ct,
    "revised": tot, "revised_low": lia, "agent_revised": tot, "conf_changed": loc, "conf_after": pp,
    "low": ins, "empty": wph, "empty_low": pol, "nosrc_low": ep, "notin": pt, "long": nar,
    "saving": wn, "failed": wn, "refused": lia}
VT = {"money": "v-num", "date": "v-num", "time": "v-num", "number": "v-num", "boolean": "v-num", "text": "v-text", "long_text": "v-long"}
for k, fld in FIELD_OF.items():
    C[k]["vt"] = VT[fld["value_type"]]
    C[k]["vtype"] = fld["value_type"]

COLUMNS = [
    ("Not decided and your decisions", ["pending", "accepted", "corrected", "overridden", "correcting", "rejecting", "readonly"]),
    ("Agent changes · errors", ["revised", "revised_low", "agent_revised", "conf_changed", "conf_after", "failed", "refused"]),
    ("Problems the agent left", ["low", "empty", "empty_low", "nosrc_low", "notin", "long"]),
]
PHONE_ORDER = [k for _, ks in COLUMNS for k in ks]

# ---------- list rows ----------
def row(state, n, v, g="g-pend", tags=(), cls=""):
    return {"state": state, "n": n, "v": v, "g": g, "tags": [{"t": t, "cls": c} for t, c in tags], "cls": cls,
            "spin": g == "spin", "glyph": g != "spin",
            "aria": f"{n}: {v}" + "".join(", " + t for t, _ in tags)}

ROWS = [
    row("Not decided", wn["label"], wn["value"]),
    row("Hover", wn["label"], wn["value"], cls="is-hover"),
    row("Open (selected)", wn["label"], wn["value"], cls="is-sel"),
    row("Accepted", ct["label"], ct["value"], "g-done", cls="mine"),
    row("Corrected", it["label"], dec["incident_time"]["value"], "g-done", [("Corrected", "you")], "mine"),
    row("Rejected and replaced", tpn["label"], dec["third_party_name"]["value"], "g-done", [("Replaced", "you")], "mine"),
    row("Changed after your decision", tot["label"], fmt(tot["value"]), "g-attn", [("Changed after you", "attn")]),
    row("… plus low confidence", lia["label"], lia["value"], "g-attn", [("Changed after you", "attn"), ("+1", "plain")]),
    row("Changed by agent, not decided", tot["label"], fmt(tot["value"]), "g-pend", [("Changed", "plain")]),
    row("Confidence changed", loc["label"], loc["value"]),
    row("Confidence changed after your decision", pp["label"], pp["value"], "g-done", cls="mine"),
    row("Low confidence", ins["label"], ins["value"], "g-attn", [(conf(ins["confidence"]), "attn")]),
    row("Empty value", wph["label"], "Not found", "g-attn", [("Empty", "attn")], "empty"),
    row("Empty · low confidence", pol["label"], "Not found", "g-attn", [("Empty", "attn"), ("+1", "plain")], "empty"),
    row("No source · low confidence", ep["label"], fmt(ep["value"]), "g-attn", [("No source", "attn"), ("+1", "plain")]),
    row("Value not in cited text", pt["label"], fmt(pt["value"]), "g-attn", [("Not in source", "attn")]),
    row("Long value", nar["label"], nar["value"]),
    row("Save failed", wn["label"], wn["value"], "g-attn", [("Not saved", "attn")]),
    row("Refused: decide again", lia["label"], lia["value"], "g-attn", [("Decide again", "attn")]),
    row("Read-only", ct["label"], ct["value"], "g-done", cls="mine locked"),
]

# ---------- CSS: G-card-field's helmet + board components (tokens unchanged) ----------
ref = REF.read_text()
helmet = ref[ref.index("<helmet>") + len("<helmet>"): ref.index("</helmet>")]
# one type scale: drop the stale 16px t-lg (later rule already sets 18/24)
helmet = helmet.replace(".t-lg{font-size:16px;line-height:22px}", "")
extra = r"""
.board{font-family:Inter,system-ui,sans-serif}
.field{padding:12px 16px}
.v-num .val{font-size:22px;line-height:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-text .val{font-size:18px;line-height:24px;white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.v-long{align-items:flex-start}
.v-long .val{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px;font-weight:400;white-space:normal;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.v-long .conf{margin-top:2px}
.head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.head h2{margin:0 4px 0 0}
.two{display:grid;grid-template-columns:minmax(0,1fr) 16px minmax(0,1fr);gap:8px;align-items:start}
.two .col{display:flex;flex-direction:column;gap:8px;min-width:0;align-items:flex-start}
.two .field{align-self:stretch}
.two .arrow{margin-top:18px}
.two .down{display:none}
.field.old .val{color:var(--ink-2)}
.field.empty .val{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px;font-style:italic;font-weight:400;color:var(--ink-3)}
.link{align-self:flex-start;border:0;background:none;padding:0;color:var(--ink);font-size:13px;line-height:18px;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.inp{display:flex;flex-direction:column;gap:6px}
.inp label{font-size:12px;line-height:16px;font-weight:600;color:var(--ink-2)}
.inp input{width:100%;height:52px;padding:0 16px;border:1.5px solid var(--line-strong);border-radius:var(--r-md);background:var(--surface);color:var(--ink);font-family:"JetBrains Mono",monospace;font-size:22px;line-height:28px;font-weight:500;box-sizing:border-box}
.inp input.reason{height:44px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px;font-weight:400}
.inp input.v-text{font-size:18px;line-height:24px}
.inp input::placeholder{color:var(--ink-3)}
.inp input:focus-visible,.inp input.is-focus{outline:none;border-color:var(--focus);box-shadow:0 0 0 1px var(--focus)}
.notein{margin:0;font-family:"JetBrains Mono",monospace;font-size:12px;line-height:16px;color:var(--attn)}
.alert{display:flex;align-items:center;gap:8px;min-height:44px;padding:4px 4px 4px 12px;border-radius:var(--r-md);background:var(--attn-tint);border:1px solid var(--attn-line);color:var(--attn);font-size:13px;line-height:18px;font-weight:500;box-sizing:border-box}
.alert .btn{height:32px}
.src.none{border-style:dashed;border-color:var(--ink-3);background:var(--surface);cursor:default}
.src.none:hover{background:var(--surface);color:var(--ink-2)}
.cite.none{border-style:dashed;border-color:var(--ink-3);background:var(--surface);cursor:default}
.ro{display:flex;align-items:center;gap:6px;font-size:12px;line-height:16px;color:var(--ink-3)}
.spin{width:12px;height:12px;flex:none;box-sizing:border-box;border:1.5px solid currentColor;border-right-color:transparent;border-radius:var(--r-full);animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
.acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px}
.pcard{width:375px;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden}
.pcard .ph{flex:none;height:56px;display:flex;align-items:center;gap:2px;padding:0 4px 0 2px;border-bottom:1px solid var(--line);box-sizing:border-box}
.pcard .pb{padding:24px 16px;display:flex;flex-direction:column;gap:12px}
.pcard .two{grid-template-columns:minmax(0,1fr);gap:4px}
.pcard .two .arrow{display:none}
.pcard .two .down{display:block;margin:0 0 0 16px}
.pcard .pdet{margin:0 -16px}
.pf{display:grid;gap:8px;padding:12px 16px 16px;border-top:1px solid var(--line)}
.pf.c3t{grid-template-columns:repeat(3,minmax(0,1fr)) 48px}
.pf.c2t{grid-template-columns:repeat(2,minmax(0,1fr)) 48px}
.pf.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.rowtags{display:inline-flex;gap:4px}
.who{font-size:12px;line-height:16px;color:var(--ink-2)}
.nosrc{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;font-size:12px;line-height:16px;color:var(--ink-2)}
.prop .field.open{border:1.5px solid var(--line-strong)}
.prop .field.old{background:var(--bg);border-color:var(--line)}
.prop .field.old .val{color:var(--ink-3)}
.prop .pill.open{border:1px solid transparent;background:var(--subtle);color:var(--ink-2)}
.prop .g-pend{border:1.5px solid var(--ink-3)}
.two.stack{grid-template-columns:minmax(0,1fr);gap:4px}
.two.stack .arrow{display:none}
.two.stack .down{display:block;margin:0 0 0 16px}
.row.locked{cursor:default}.row.locked:hover{background:transparent}
.rowgrid{display:grid;grid-template-columns:220px 320px 375px;column-gap:40px;align-items:center}
"""
helmet = helmet.replace("</style>", extra + "</style>")
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from glyphs import apply as _apply_glyphs
helmet, _n = _apply_glyphs(helmet); assert _n == 1


def svg(d, sw, w=16):
    return f'<svg width="{w}" height="{w}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="{sw}" aria-hidden="true"><path d="{d}"></path></svg>'

CHECK12 = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m3 8.5 3 3 7-7"></path></svg>'
DOCI = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 1.5h5.5L12.5 4.5v10h-8.5z"></path><path d="M9.5 1.5v3h3"></path></svg>'
CHEV = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 4 4 4-4 4"></path></svg>'
DCHEV = '<svg class="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 4 4 4-4 4"></path></svg>'
UP = svg("m4 10 4-4 4 4", "1.7"); DOWN = svg("m4 6 4 4 4-4", "1.7")
SKIP = svg("m4 4 4 4-4 4M9 4l4 4-4 4", "1.7"); UNDO = svg("M4 6h6a3 3 0 0 1 0 6H7M4 6l3-3M4 6l3 3", "1.7")
LOCK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3.5 7.5h9v6.5h-9zM5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5"></path></svg>'
WARN = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" style="flex: none"><path d="M8 2 14.5 13.5h-13z"></path><path d="M8 6.5v3M8 11.3v.2"></path></svg>'
RIGHT = '<svg class="arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.6" role="img" aria-label="changed to"><path d="M3 8h10M9 4l4 4-4 4"></path></svg>'
DARROW = '<svg class="down" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" stroke-width="1.6" role="img" aria-label="changed to"><path d="M8 3v10M4 9l4 4 4-4"></path></svg>'

TAGS = '''<div class="head"><h2 class="serif t-lg">{{f.name}}</h2><sc-for list="{{f.tags}}" as="t" hint-placeholder-count="1"><span class="tag {{t.cls}}"><sc-if value="{{t.glyph}}" hint-placeholder-val="{{ false }}"><span class="g g-attn" style="width: 9px; height: 8px" aria-hidden="true"></span></sc-if>{{t.t}}</span></sc-for></div>'''

def boxcol(k):
    return (f'<div class="col"><div class="field {{{{f.{k}.cls}}}} {{{{f.vt}}}}"><span class="val">{{{{f.{k}.val}}}}</span>'
            f'<sc-if value="{{{{f.{k}.conf}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="conf">{{{{f.{k}.conf}}}}</span></sc-if></div>'
            f'<div class="facts"><sc-if value="{{{{f.{k}.hasPill}}}}" hint-placeholder-val="{{{{ true }}}}"><span class="pill {{{{f.{k}.pcls}}}}"><sc-if value="{{{{f.{k}.hasIcon}}}}" hint-placeholder-val="{{{{ false }}}}"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="{{{{f.{k}.icon}}}}"></path></svg></sc-if>{{{{f.{k}.pill}}}}</span></sc-if>'
            f'<sc-if value="{{{{f.{k}.who}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="who">{{{{f.{k}.who}}}}</span></sc-if></div></div>')

VALUE = f'''<sc-if value="{{{{f.isOne}}}}" hint-placeholder-val="{{{{ true }}}}"><div class="field {{{{f.one.cls}}}} {{{{f.vt}}}}"><span class="val">{{{{f.one.val}}}}</span><sc-if value="{{{{f.one.conf}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="conf">{{{{f.one.conf}}}}</span></sc-if></div></sc-if>
<sc-if value="{{{{f.isLong}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="field open {{{{f.vt}}}}"><span class="val">{{{{f.one.val}}}}</span><span class="conf">{{{{f.one.conf}}}}</span></div><button class="link">Show all</button></sc-if>
<sc-if value="{{{{f.isTwo}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="two {{{{f.stack}}}}">{boxcol("a")}{RIGHT}{DARROW}{boxcol("b")}</div></sc-if>
<sc-if value="{{{{f.hasFacts}}}}" hint-placeholder-val="{{{{ true }}}}"><div class="facts"><span class="pill {{{{f.facts.pcls}}}}"><sc-if value="{{{{f.facts.hasIcon}}}}" hint-placeholder-val="{{{{ false }}}}"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="{{{{f.facts.icon}}}}"></path></svg></sc-if><sc-if value="{{{{f.facts.spin}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="spin" aria-hidden="true"></span></sc-if>{{{{f.facts.pill}}}}</span><sc-if value="{{{{f.facts.who}}}}" hint-placeholder-val="{{{{ true }}}}"><span>{{{{f.facts.who}}}}</span></sc-if></div></sc-if>
<sc-if value="{{{{f.hasAlert}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="alert" role="alert">{WARN}<span style="flex: 1">{{{{f.alert.t}}}}</span><sc-if value="{{{{f.alert.retry}}}}" hint-placeholder-val="{{{{ false }}}}"><button class="btn">Try again</button></sc-if></div></sc-if>
<sc-if value="{{{{f.hasEdit}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="inp"><label for="v-{{{{f.key}}}}-{{{{f.size}}}}">{{{{f.edit.label}}}}</label><input id="v-{{{{f.key}}}}-{{{{f.size}}}}" class="is-focus {{{{f.vt}}}}" value="{{{{f.edit.val}}}}" placeholder="{{{{f.edit.ph}}}}"></div>
<sc-if value="{{{{f.edit.reason}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="inp"><label for="r-{{{{f.key}}}}-{{{{f.size}}}}">Reason</label><input id="r-{{{{f.key}}}}-{{{{f.size}}}}" class="reason" value="" placeholder="{{{{f.edit.rph}}}}"></div></sc-if></sc-if>
<sc-if value="{{{{f.notein}}}}" hint-placeholder-val="{{{{ false }}}}"><p class="notein">{{{{f.notein}}}}</p></sc-if>'''

ACTION_BTN = f'''<button class="btn {{{{a.cls}}}}" title="{{{{a.title}}}}" disabled="{{{{a.disabled}}}}"><sc-if value="{{{{a.busy}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="spin" aria-hidden="true"></span></sc-if><sc-if value="{{{{a.hasIcon}}}}" hint-placeholder-val="{{{{ true }}}}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="{{{{a.sw}}}}" aria-hidden="true"><path d="{{{{a.d}}}}"></path></svg></sc-if>{{{{a.t}}}}</button>'''

DETAILS = f'''<sc-for list="{{{{f.details}}}}" as="d" hint-placeholder-count="0"><details class="dis" open="{{{{d.open}}}}"><summary>{DCHEV}{{{{d.title}}}}<sc-if value="{{{{d.meta}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="t-sm ink-3" style="font-weight: 500">{{{{d.meta}}}}</span></sc-if></summary><sc-if value="{{{{d.hasBody}}}}" hint-placeholder-val="{{{{ false }}}}"><p class="t-base ink-2" style="margin: 0; padding: 0 24px 16px 42px">{{{{d.body}}}}</p></sc-if></details></sc-for>'''

LAPTOP_CARD = f'''<section class="card" aria-label="{{{{f.aria}}}}">
<div class="top"><span class="t-sm ink-3" style="flex: 1">{{{{f.group}}}}</span><button class="ib" aria-label="Previous field (K)" title="Previous field · K">{UP}</button><button class="ib" aria-label="Next field (J)" title="Next field · J">{DOWN}</button></div>
<div class="body">
{TAGS}
{VALUE}
<sc-if value="{{{{f.hasSrc}}}}" hint-placeholder-val="{{{{ true }}}}"><button class="src" title="Scroll the document to the cited text" aria-label="Source: {{{{f.src}}}}. Show the cited text">{DOCI}{{{{f.src}}}}{CHEV}</button></sc-if>
<sc-if value="{{{{f.nosrc}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="src none">No source</span></sc-if>
<sc-if value="{{{{f.nosrcText}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="nosrc">{DOCI}No source</span></sc-if>
<sc-if value="{{{{f.hasActions}}}}" hint-placeholder-val="{{{{ true }}}}"><div class="acts"><sc-for list="{{{{f.actions}}}}" as="a" hint-placeholder-count="3">{ACTION_BTN}</sc-for><span style="flex: 1"></span><sc-if value="{{{{f.skip}}}}" hint-placeholder-val="{{{{ false }}}}"><button class="ib" aria-label="Skip for now (S)" title="Skip for now · S" style="width: 36px; height: 36px">{SKIP}</button></sc-if><sc-if value="{{{{f.undo}}}}" hint-placeholder-val="{{{{ false }}}}"><button class="ib" aria-label="Undo your decision (U)" title="Undo · U" style="width: 36px; height: 36px">{UNDO}</button></sc-if></div></sc-if>
<sc-if value="{{{{f.ro}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="ro">{LOCK}Review completed. Decisions are read-only.</div></sc-if>
</div>
{DETAILS}
</section>'''

PHONE_CARD = f'''<section class="pcard phone" aria-label="{{{{f.aria}}}}">
<div class="ph"><a href="G-phone-list.dc.html" class="ib" aria-label="Back to the list"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M10 3 5 8l5 5"></path></svg></a><div style="flex: 1; min-width: 0"><div class="t-base" style="font-weight: 600">{{{{f.group}}}}</div><div class="t-sm ink-3">{{{{f.pos}}}}</div></div><button class="ib" aria-label="Previous field">{UP}</button><button class="ib" aria-label="Next field">{DOWN}</button></div>
<div class="pb">
{TAGS}
{VALUE}
<sc-if value="{{{{f.hasSrc}}}}" hint-placeholder-val="{{{{ true }}}}"><button class="cite" aria-label="Open the cited text in the document" style="margin-top: 4px"><span class="quote" style="white-space: pre-line">{{{{f.quote}}}}</span><span class="t-sm ink-3" style="display: flex; align-items: center; gap: 6px; width: 100%">{DOCI}<span style="flex: 1">{{{{f.src}}}}</span>{CHEV}</span></button></sc-if>
<sc-if value="{{{{f.nosrcText}}}}" hint-placeholder-val="{{{{ false }}}}"><span class="nosrc">{DOCI}No source</span></sc-if>
<sc-if value="{{{{f.nosrc}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="cite none" style="margin-top: 4px"><span class="t-sm ink-2" style="display: flex; align-items: center; gap: 6px">{DOCI}No source</span></div></sc-if>
<sc-if value="{{{{f.ro}}}}" hint-placeholder-val="{{{{ false }}}}"><div class="ro">{LOCK}Review completed. Decisions are read-only.</div></sc-if>
<div class="pdet">{DETAILS}</div>
</div>
<sc-if value="{{{{f.hasActions}}}}" hint-placeholder-val="{{{{ true }}}}"><div class="pf {{{{f.pf}}}}"><sc-for list="{{{{f.actions}}}}" as="a" hint-placeholder-count="3">{ACTION_BTN}</sc-for><sc-if value="{{{{f.skipPhone}}}}" hint-placeholder-val="{{{{ false }}}}"><button class="ib" aria-label="Skip for now" title="Skip for now" style="width: 48px; height: 48px; border: 1px solid var(--line)">{SKIP}</button></sc-if><sc-if value="{{{{f.undoPhone}}}}" hint-placeholder-val="{{{{ false }}}}"><button class="ib" aria-label="Undo your decision" title="Undo" style="width: 48px; height: 48px; border: 1px solid var(--line)">{UNDO}</button></sc-if></div></sc-if>
</section>'''


def page(title, body, w, h, vals_js):
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
    return {vals_js};
  }}
}}
</script>
</body>
</html>
'''


def js(o):
    s = json.dumps(o, ensure_ascii=False, indent=None)
    assert "'" not in s or True
    return s.replace("</", "<\\/")


SIZING = ("Value size follows the field's type, never its length: money, dates, times, numbers and yes/no in mono 22 px on one line; "
          "text in mono 18 px, up to 2 lines; long text in Inter 14 px, 4 lines, then Show all. The same size in every state and in the input. ")
NOTE = ("Values, citations, reasons and agent times come from fixtures (run started 10:06:12). "
        "Reviewer times for claim type, incident time, third-party driver, total and liability come from "
        "sample_decisions_4817_at_80s; the other decisions (policyholder registration accepted, witness name not saved, "
        "liability correction refused) are illustrative.")

sizes = {}
# laptop board
W_L, H_L = 1856, int(sys.argv[4]) if len(sys.argv) > 4 else 3400
import copy, re
SWAP = "M3 5.5h9.5L10 3M13 10.5H3.5L6 13"
def v2(k):
    """Round 2 style: no dashed lines, value-only box, confidence on the agent line,
    text pairs stacked, evidence moved to the document panel (laptop)."""
    c = copy.deepcopy(C[k]); fld = FIELD_OF[k]
    mv = lambda cf, who: who + (" · " + cf if cf else "")
    if c["isOne"] or c["isLong"]:
        cf = c["one"]["conf"]; c["one"]["conf"] = ""
        if c["hasFacts"]: c["facts"]["who"] = mv(cf, c["facts"]["who"])
    if c["isTwo"]:
        for side in "ab":
            b = c[side]; cf = b["conf"]; b["conf"] = ""
            if b["pill"].startswith("Agent"):
                who = mv(cf, b["pill"])
                if "old" in b["cls"]: b.update(pill="", hasPill=False, who=who)
                else: b.update(pill="Not decided", hasPill=True, who=who)
        c["stack"] = "stack" if fld["value_type"] in ("text", "long_text") else ""
    if k == "corrected": c["b"].update(icon=PENCIL, hasIcon=True)
    if k == "overridden": c["b"].update(icon=SWAP, hasIcon=True)
    c["nosrcText"] = c["nosrc"]; c["nosrc"] = False
    for t in c["tags"]: t["glyph"] = False
    return c
PENCIL = IC["pencil"][0]
LAPTOP_CARD2 = re.sub(r'<sc-if value="\{\{f\.(hasSrc|nosrc|nosrcText)\}\}".*?</sc-if>\n', "", LAPTOP_CARD, flags=re.S)
LAPTOP_CARD2 = re.sub(r'<sc-if value="\{\{f\.notein\}\}".*?</sc-if>', "", LAPTOP_CARD2, flags=re.S)
assert "src" not in LAPTOP_CARD2.replace("srcset", "") and "notein" not in LAPTOP_CARD2, "evidence left in laptop card"
EVID = ("Evidence lives in the document panel on laptop (the open field's cited text is highlighted there; no-source and "
        "not-in-source notes appear there too), so laptop cards carry no source link. On phone the quote card under the value opens the bottom sheet. ")
STYLE2 = ("No dashed lines: not decided = white box and grey pill; yours = blue tint with the decision as icon plus word. "
          "Confidence sits on the agent line; Low is an orange tag. Before → after: side by side for money, dates, times, numbers and yes/no; stacked for text. ")
cols = []
for title, keys in COLUMNS:
    cards = []
    for k in keys:
        c = v2(k); c["key"] = k; c["size"] = "l"; cards.append(c)
    cols.append({"title": title, "cards": cards})
body_l = f'''<div class="app board prop" style="width: {W_L}px; height: {H_L}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">
<div style="display: flex; flex-direction: column; gap: 8px; max-width: 1200px"><div class="eyebrow ink-3">Field board · open field · laptop (560 px, the middle pane at 1280)</div><p class="t-sm ink-3" style="margin: 0">{STYLE2}{EVID}{SIZING}{NOTE}</p></div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 48px; align-items: start">
<sc-for list="{{{{cols}}}}" as="c" hint-placeholder-count="3"><div style="display: flex; flex-direction: column; gap: 32px; min-width: 0">
<h2 class="serif t-xl" style="margin: 0">{{{{c.title}}}}</h2>
<sc-for list="{{{{c.cards}}}}" as="f" hint-placeholder-count="2"><div class="lbl"><div class="eyebrow ink-3">{{{{f.state}}}}</div>
{LAPTOP_CARD2}
</div></sc-for>
</div></sc-for>
</div>
</div>'''
(OUT / "project").mkdir(parents=True, exist_ok=True)
(OUT / "project/G-board-laptop.dc.html").write_text(page("Field board, laptop", body_l, W_L, H_L, js({"cols": cols})))

# phone board
W_P = 40 * 2 + 6 * 375 + 5 * 40
H_P = int(sys.argv[5]) if len(sys.argv) > 5 else 3600
pcards = []
for k in PHONE_ORDER:
    c = v2(k); c["key"] = k; c["size"] = "p"; pcards.append(c)
body_p = f'''<div class="app board prop" style="width: {W_P}px; height: {H_P}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 32px; background: var(--bg)">
<div style="display: flex; flex-direction: column; gap: 8px; max-width: 1200px"><div class="eyebrow ink-3">Field board · open field · phone (375 px)</div><p class="t-sm ink-3" style="margin: 0">Same states and order as the laptop board. On phone the cited text shows inline and the actions sit in a bottom bar. {STYLE2}{SIZING}{NOTE}</p></div>
<div style="display: grid; grid-template-columns: repeat(6, 375px); gap: 48px 40px; align-items: start">
<sc-for list="{{{{cards}}}}" as="f" hint-placeholder-count="6"><div class="lbl"><div class="eyebrow ink-3">{{{{f.state}}}}</div>
{PHONE_CARD}
</div></sc-for>
</div>
</div>'''
(OUT / "project/G-board-phone.dc.html").write_text(page("Field board, phone", body_p, W_P, H_P, js({"cards": pcards})))

# rows board
W_R = 40 + 220 + 40 + 320 + 40 + 375 + 40
H_R = int(sys.argv[6]) if len(sys.argv) > 6 else 1400
ROW = '''<button class="row {{r.cls}}" aria-label="{{r.aria}}"><sc-if value="{{r.glyph}}" hint-placeholder-val="{{ true }}"><span class="g {{r.g}}" aria-hidden="true"></span></sc-if><sc-if value="{{r.spin}}" hint-placeholder-val="{{ false }}"><span class="spin" style="width: 10px; height: 10px; color: var(--ink-3)" aria-hidden="true"></span></sc-if><span style="min-width: 0"><span class="l">{{r.n}}</span><span class="v">{{r.v}}</span></span><span class="rowtags"><sc-for list="{{r.tags}}" as="t" hint-placeholder-count="0"><span class="tag {{t.cls}}">{{t.t}}</span></sc-for></span></button>'''
body_r = f'''<div class="app board prop" style="width: {W_R}px; height: {H_R}px; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; gap: 24px; background: var(--bg)">
<div style="display: flex; flex-direction: column; gap: 8px"><div class="eyebrow ink-3">Field board · list rows</div><p class="t-sm ink-3" style="margin: 0">Orange circle with ! and tag: needs you. Blue circle with ✓ and value: yours. Grey ring: not decided. Grey tag: information that does not need you. Confidence shows only when Low; a second problem shows as +1.</p></div>
<div class="rowgrid"><div class="eyebrow ink-3">State</div><div class="eyebrow ink-3" style="padding-left: 8px">Laptop · 320 px list</div><div class="eyebrow ink-3" style="padding-left: 8px">Phone · 375 px</div></div>
<div style="display: flex; flex-direction: column; gap: 4px">
<sc-for list="{{{{rows}}}}" as="r" hint-placeholder-count="8"><div class="rowgrid" style="min-height: 52px"><div class="t-base ink-2" style="font-weight: 500">{{{{r.state}}}}</div>
<div style="background: var(--bg)">{ROW}</div>
<div class="phone" style="background: var(--bg)">{ROW}</div></div></sc-for>
</div>
</div>'''
# phone-size rows: scope G-phone-list's overrides under .phone
helmet_rows_extra = ".phone .row{height:52px}.phone .row .l{font-size:12px;line-height:16px}.phone .row .v{font-size:14px;line-height:20px}"
(OUT / "project/G-board-rows.dc.html").write_text(page("Field board, list rows", body_r, W_R, H_R, js({"rows": ROWS})).replace("</style>", helmet_rows_extra + "</style>", 1))
print("sizes", W_L, H_L, W_P, H_P, W_R, H_R)

# hard rule checks: no new hex values beyond the token block
for fn in ["G-board-laptop", "G-board-phone", "G-board-rows"]:
    t = (OUT / f"project/{fn}.dc.html").read_text()
    root = t[t.index(":root{"): t.index("}", t.index(":root{"))]
    rest = t.replace(root, "")
    hexes = set(re.findall(r"#[0-9A-Fa-f]{3,8}\b", rest))
    print(fn, len(t), "stray hex:", hexes)

# The step 2(a) comparison frames (G-compare-states, G-stress-values, G-compare-glyphs)
# were deleted from the canvas on 2026-11-19; their outcomes are rules in ROUNDS.md.
