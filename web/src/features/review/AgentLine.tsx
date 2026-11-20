import { confidenceLevel, formatInstant, type FieldState } from "@shared/domain";
import { confidenceText } from "./fieldText";

// When an entry arrived: the run start plus the event's offset. No time without a start.
function arrivedAt(startedAt: string | null, atMs: number): string | null {
  if (startedAt === null) return null;
  const ms = Date.parse(startedAt);
  return Number.isNaN(ms) ? null : formatInstant(new Date(ms + atMs).toISOString());
}

// What the agent's latest entry did, so the verb and the time always describe the same entry.
function verbOf(field: FieldState): string {
  const { current } = field;
  switch (current.kind) {
    case "extracted":
      return current.value === null ? "looked" : "found";
    case "confidence":
      return "rescored";
    case "revised": {
      // A revision that kept the value didn't change it: the version moves only on a value change.
      const before = field.history.at(-2);
      return before && before.version === current.version ? "rechecked" : "changed";
    }
    default: {
      const never: never = current.kind;
      return never;
    }
  }
}

/** "Agent · changed 10:07 · High 95%". Low confidence is an orange tag by the name instead. */
export function AgentLine({ field, startedAt }: { field: FieldState; startedAt: string | null }) {
  const { current } = field;
  const low = confidenceLevel(current.confidence) === "low";
  const time = arrivedAt(startedAt, current.at_ms);
  return (
    <p className="text-sm text-ink-2">
      Agent · {verbOf(field)}
      {time && <> {time}</>}
      {!low && <> · {confidenceText(current.confidence)}</>}
    </p>
  );
}
