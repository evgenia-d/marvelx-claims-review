// The run reducer: folds fixture events into one RunState per claim.
// Pure and immutable. Server and browser both use it, so the merge rule exists once.
import type { FieldValue, RunEvent, Source, ValueType } from "@shared/contract";
import { sameValue } from "./values";

export type StepState = "running" | "ok" | "warning" | "failed";
export type Step = { step_id: string; label: string; state: StepState; note: string | null };
export type FieldEntry = {
  seq: number;
  kind: "extracted" | "revised" | "confidence";
  value: FieldValue;
  confidence: number;
  source: Source;
  reason: string | null;
  version: number;
};
export type FieldState = {
  field_id: string;
  label: string;
  value_type: ValueType;
  step_id: string | null; // step running when extracted
  version: number;
  current: FieldEntry;
  history: FieldEntry[];
};
export type RunState = {
  claim_id: string;
  status: "not_started" | "running" | "finished" | "failed";
  started_at: string | null;
  seen: ReadonlySet<number>;
  last_seq: number;
  steps: Step[];
  summary: string;
  fields: Record<string, FieldState>;
  field_order: string[];
  overall_confidence: number | null;
  error: { step_id: string; code: string; message: string; retryable: boolean } | null;
};

export function initialRunState(claimId: string): RunState {
  return {
    claim_id: claimId,
    status: "not_started",
    started_at: null,
    seen: new Set(),
    last_seq: 0,
    steps: [],
    summary: "",
    fields: {},
    field_order: [],
    overall_confidence: null,
    error: null,
  };
}

// Returns a new steps array with one step changed, or the same array if the step is unknown
// (so an event for an unknown step leaves `steps` identical).
function updateStep(steps: Step[], step_id: string, change: Partial<Step>): Step[] {
  if (!steps.some((s) => s.step_id === step_id)) return steps;
  return steps.map((s) => (s.step_id === step_id ? { ...s, ...change } : s));
}

// Steps can nest (the invoice page 2 step starts inside the invoice step), so the field belongs
// to the most recently started step that is still running.
function runningStep(steps: Step[]): string | null {
  return steps.findLast((s) => s.state === "running")?.step_id ?? null;
}

// Adds an agent entry to a field. The version moves only when the value actually changes.
function addEntry(field: FieldState, entry: Omit<FieldEntry, "version">): FieldState {
  const version = sameValue(entry.value, field.current.value) ? field.version : field.version + 1;
  const full: FieldEntry = { ...entry, version };
  return { ...field, version, current: full, history: [...field.history, full] };
}

// Applies one event. A seq already seen returns the identical state (delivery is at least once).
// Events for an unknown field or step are dropped: only `seen` and `last_seq` move.
export function applyEvent(state: RunState, event: RunEvent): RunState {
  if (state.seen.has(event.seq)) return state;
  const base: RunState = {
    ...state,
    seen: new Set(state.seen).add(event.seq),
    last_seq: Math.max(state.last_seq, event.seq),
  };

  switch (event.type) {
    case "run_started":
      // Also the start of a retry after a failure: keep fields, steps and summary, clear the error.
      return { ...base, status: "running", started_at: event.payload.started_at, error: null };

    case "step_started": {
      const { step_id, label } = event.payload;
      const exists = base.steps.some((s) => s.step_id === step_id);
      // A retry restarts the failed step in place rather than adding a second row.
      const steps = exists
        ? updateStep(base.steps, step_id, { label, state: "running", note: null })
        : [...base.steps, { step_id, label, state: "running" as const, note: null }];
      return { ...base, steps };
    }

    case "step_finished": {
      const { step_id, outcome, note } = event.payload;
      return { ...base, steps: updateStep(base.steps, step_id, { state: outcome, note: note ?? null }) };
    }

    case "summary_delta":
      return { ...base, summary: base.summary + event.payload.text };

    case "field_extracted": {
      const p = event.payload;
      // Changes to a known field arrive as field_revised (fixtures/README), so a second extraction is dropped.
      if (base.fields[p.field_id]) return base;
      const entry: FieldEntry = {
        seq: event.seq, kind: "extracted", value: p.value, confidence: p.confidence, source: p.source, reason: null, version: 1,
      };
      const field: FieldState = {
        field_id: p.field_id,
        label: p.label,
        value_type: p.value_type,
        step_id: runningStep(base.steps),
        version: 1,
        current: entry,
        history: [entry],
      };
      return { ...base, fields: { ...base.fields, [p.field_id]: field }, field_order: [...base.field_order, p.field_id] };
    }

    case "field_revised": {
      const p = event.payload;
      const existing = base.fields[p.field_id];
      if (!existing) return base;
      const field = addEntry(existing, {
        seq: event.seq, kind: "revised", value: p.value, confidence: p.confidence, source: p.source, reason: p.reason,
      });
      return { ...base, fields: { ...base.fields, [p.field_id]: field } };
    }

    case "confidence_changed": {
      const p = event.payload;
      const existing = base.fields[p.field_id];
      if (!existing) return base;
      // Value and source are unchanged, so addEntry keeps the version.
      const field = addEntry(existing, {
        seq: event.seq, kind: "confidence", value: existing.current.value, confidence: p.confidence,
        source: existing.current.source, reason: p.reason,
      });
      return { ...base, fields: { ...base.fields, [p.field_id]: field } };
    }

    case "run_finished":
      return { ...base, status: "finished", overall_confidence: event.payload.overall_confidence };

    case "run_failed": {
      const { step_id, error } = event.payload;
      return { ...base, status: "failed", steps: updateStep(base.steps, step_id, { state: "failed" }), error: { step_id, ...error } };
    }

    default:
      // An event type that slipped past the schema: record its seq, change nothing else.
      return base;
  }
}

export function applyEvents(state: RunState, events: RunEvent[]): RunState {
  return events.reduce((s, e) => applyEvent(s, e), state);
}
