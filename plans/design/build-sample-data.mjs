// Builds plans/design/sample-data.json from fixtures/ for the design step.
// Design tooling only, not app code. Reads fixtures, never writes them.
// Run: node plans/design/build-sample-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fx = (p) => join(root, "fixtures", p);
const claims = JSON.parse(readFileSync(fx("claims.json"), "utf8"));
const docIndex = JSON.parse(readFileSync(fx("documents/index.json"), "utf8"));
const docs = Object.fromEntries(
  docIndex.map((d) => [d.document_id, { ...d, text: readFileSync(fx(`documents/${d.document_id}.txt`), "utf8") }]),
);
const runOf = (claim) =>
  readFileSync(fx(claim.run), "utf8").trim().split("\n").map((l) => JSON.parse(l));

const cited = (source) => (source ? docs[source.document_id].text.slice(source.start, source.end) : null);

// Rough design-only checks; the real rules live in shared/domain/ later.
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function valueInCitation(type, value, text) {
  if (value === null || text === null) return null;
  if (type === "time") return text.includes(value);
  if (type === "number") return text.replace(/,/g, "").includes(String(value));
  if (type === "money") {
    const [i, d] = value.amount.split(".");
    const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + d;
    return text.includes(grouped) || text.includes(value.amount);
  }
  if (type === "date") {
    const [y, m, d] = value.split("-");
    return text.includes(`${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`) || text.includes(value);
  }
  return null; // text, long_text, boolean: not checked
}
const level = (c) => (c < 0.6 ? "low" : c < 0.85 ? "medium" : "high");

// Apply events up to atMs (run-relative), dropping duplicate seq.
function snapshot(claim, atMs = Infinity) {
  const seen = new Set();
  const s = { claim_id: claim.claim_id, run_status: "queued", at_ms: null, steps: [], summary: "", fields: [], error: null, overall_confidence: null };
  const fields = new Map();
  for (const e of runOf(claim)) {
    if (e.at_ms > atMs) break;
    if (seen.has(e.seq)) { s.duplicates_dropped = [...(s.duplicates_dropped ?? []), e.seq]; continue; }
    seen.add(e.seq);
    s.at_ms = e.at_ms;
    const p = e.payload;
    switch (e.type) {
      case "run_started": s.run_status = "running"; break;
      case "step_started": s.steps.push({ step_id: p.step_id, label: p.label, state: "running", note: null }); break;
      case "step_finished": Object.assign(s.steps.find((x) => x.step_id === p.step_id), { state: p.outcome, note: p.note ?? null }); break;
      case "summary_delta": s.summary += p.text; break;
      case "field_extracted":
        fields.set(p.field_id, {
          field_id: p.field_id, label: p.label, value_type: p.value_type,
          value: p.value, confidence: p.confidence, source: p.source, agent_version: 1,
          history: [{ seq: e.seq, at_ms: e.at_ms, kind: "extracted", value: p.value, confidence: p.confidence, reason: null }],
        });
        break;
      case "field_revised": {
        const f = fields.get(p.field_id);
        if (JSON.stringify(f.value) !== JSON.stringify(p.value)) f.agent_version += 1;
        Object.assign(f, { value: p.value, confidence: p.confidence, source: p.source });
        f.history.push({ seq: e.seq, at_ms: e.at_ms, kind: "revised", value: p.value, confidence: p.confidence, reason: p.reason });
        break;
      }
      case "confidence_changed": {
        const f = fields.get(p.field_id);
        f.confidence = p.confidence;
        f.history.push({ seq: e.seq, at_ms: e.at_ms, kind: "confidence", value: f.value, confidence: p.confidence, reason: p.reason });
        break;
      }
      case "run_finished": s.run_status = "finished"; s.overall_confidence = p.overall_confidence; break;
      case "run_failed":
        s.run_status = "failed"; s.error = { step_id: p.step_id, ...p.error };
        s.steps.find((x) => x.step_id === p.step_id).state = "failed";
        break;
    }
  }
  s.fields = [...fields.values()].map((f) => {
    const text = cited(f.source);
    const inCitation = valueInCitation(f.value_type, f.value, text);
    const flags = [];
    if (f.confidence < 0.6) flags.push("low_confidence");
    if (f.value === null) flags.push("empty_value");
    if (f.source === null) flags.push("no_source");
    if (inCitation === false) flags.push("value_not_in_citation");
    return { ...f, confidence_level: level(f.confidence), cited_text: text, cited_document: f.source && docs[f.source.document_id].title, flags };
  });
  return s;
}

const byId = Object.fromEntries(claims.map((c) => [c.claim_id, c]));
const REPLAY_T = 80000; // queue moment: 80 s into the replay
const queue = claims.map((c) => {
  const runT = c.start_after_ms === null ? Infinity : REPLAY_T - c.start_after_ms;
  const snap = runT < 0 ? null : snapshot(c, runT);
  const status = !snap || snap.run_status === "queued" ? "queued"
    : snap.run_status === "running" ? "running"
    : snap.run_status === "failed" ? "failed" : "needs_review";
  return {
    claim_id: c.claim_id, claimant_name: c.claimant_name, product: c.product, priority: c.priority,
    received_at: c.received_at, status, overall_confidence: snap?.overall_confidence ?? null,
    field_count: snap?.fields.length ?? 0,
  };
});

const out = {
  _about: "Derived from fixtures/ by plans/design/build-sample-data.mjs for the design step. Do not edit by hand. `flags` and `confidence_level` are rough design-only checks (low < 0.60, medium < 0.85).",
  queue_at_80s: queue,
  documents: Object.values(docs),
  snapshots: {
    "CLM-2026-004817@80s": snapshot(byId["CLM-2026-004817"], 80000),
    "CLM-2026-004817@final": snapshot(byId["CLM-2026-004817"]),
    "CLM-2026-004822@final": snapshot(byId["CLM-2026-004822"]),
    "CLM-2026-004809@final": snapshot(byId["CLM-2026-004809"]),
    "CLM-2026-004830@final": snapshot(byId["CLM-2026-004830"]),
  },
  sample_decisions_4817_at_80s: {
    _about: "Invented reviewer decisions, only so the mocks can show every field state. Not fixture data.",
    decisions: [
      { field_id: "claim_type", action: "accept", based_on_version: 1, at: "2026-09-18T10:06:40+02:00" },
      { field_id: "police_report_number", action: "accept", based_on_version: 1, at: "2026-09-18T10:06:44+02:00" },
      { field_id: "incident_date", action: "accept", based_on_version: 1, at: "2026-09-18T10:06:47+02:00" },
      { field_id: "incident_time", action: "correct", value: "23:40", based_on_version: 1, at: "2026-09-18T10:06:55+02:00" },
      { field_id: "third_party_name", action: "override", value: "Unknown", reason: "Police report says the driver's details were not verified.", based_on_version: 1, at: "2026-09-18T10:07:10+02:00" },
      { field_id: "total_incl_vat", action: "accept", based_on_version: 1, at: "2026-09-18T10:06:58+02:00", _note: "Agent revised it to version 2 afterwards: 'revised after your decision'." },
      { field_id: "liability_assessment", action: "accept", based_on_version: 1, at: "2026-09-18T10:06:59+02:00", _note: "Agent revised it to version 2 afterwards." },
    ],
  },
};

writeFileSync(join(root, "plans/design/sample-data.json"), JSON.stringify(out, null, 2) + "\n");
console.log("wrote plans/design/sample-data.json");
