// Parses one SSE `run` message. The stream is input from the network: anything that is not a
// valid RunEvent is dropped with a warning instead of reaching the reducer.
import { RunEvent } from "@shared/contract";

export function parseRunEvent(data: string): RunEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    console.warn("Dropped a run event that is not JSON.");
    return null;
  }
  const parsed = RunEvent.safeParse(json);
  if (!parsed.success) {
    console.warn("Dropped a run event that does not match the contract.", parsed.error.issues);
    return null;
  }
  return parsed.data;
}
