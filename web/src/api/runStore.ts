// Live run state per claim, fed only by the SSE subscription and built by the shared reducer.
// The UI reads it through the granular selectors below and never edits it.
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { RunEvent } from "@shared/contract";
import { applyEvent, initialRunState, type FieldState, type RunState, type Step } from "@shared/domain";

export type Connection = "connecting" | "live" | "reconnecting" | "closed";

type RunStore = {
  runs: Record<string, RunState>;
  connection: Record<string, Connection>;
  /**
   * Set when the stream says its connect backlog is done: the number of fields there were then.
   * One map answers both "is the screen caught up" (present) and "did this row arrive live"
   * (its arrival index is at or past the count).
   */
  synced: Record<string, number>;
  apply: (claimId: string, event: RunEvent) => void;
  /** Clears the claim's run state and synced, before a new EventSource starts it over. */
  reset: (claimId: string) => void;
  markSynced: (claimId: string) => void;
  setConnection: (claimId: string, connection: Connection) => void;
};

export const useRunStore = create<RunStore>()((set) => ({
  runs: {},
  connection: {},
  synced: {},
  // Returning the unchanged store state makes zustand skip the update, so a duplicate seq
  // (applyEvent hands back the same object) notifies no subscriber.
  apply: (claimId, event) =>
    set((s) => {
      const prev = s.runs[claimId] ?? initialRunState(claimId);
      const next = applyEvent(prev, event);
      return next === prev ? s : { runs: { ...s.runs, [claimId]: next } };
    }),
  reset: (claimId) =>
    set((s) => {
      if (!(claimId in s.runs) && !(claimId in s.synced)) return s;
      const runs = { ...s.runs };
      const synced = { ...s.synced };
      delete runs[claimId];
      delete synced[claimId];
      return { runs, synced };
    }),
  // A reconnect of the same EventSource gets another `synced`: keep the first, so the screen never
  // goes back to loading mid-review and rows that already faded in aren't re-counted.
  markSynced: (claimId) =>
    set((s) =>
      claimId in s.synced ? s : { synced: { ...s.synced, [claimId]: s.runs[claimId]?.field_order.length ?? 0 } },
    ),
  setConnection: (claimId, connection) =>
    set((s) => (s.connection[claimId] === connection ? s : { connection: { ...s.connection, [claimId]: connection } })),
}));

// Constants, so a claim with no run yet gives selectors the same values on every render.
const NO_STEPS: Step[] = [];
const NO_FIELDS: string[] = [];

// The reducer keeps an untouched field as the same object, so a row re-renders only when its field changes.
export const useRunField = (claimId: string, fieldId: string): FieldState | undefined =>
  useRunStore((s) => s.runs[claimId]?.fields[fieldId]);

// Each piece is a stable reference from the reducer; useShallow keeps the wrapper object stable too.
type RunMeta = Pick<RunState, "status" | "steps" | "error" | "overall_confidence">;

export const useRunMeta = (claimId: string): RunMeta =>
  useRunStore(
    useShallow((s): RunMeta => {
      const run = s.runs[claimId];
      return {
        status: run?.status ?? "not_started",
        steps: run?.steps ?? NO_STEPS,
        error: run?.error ?? null,
        overall_confidence: run?.overall_confidence ?? null,
      };
    }),
  );

export const useFieldOrder = (claimId: string): string[] => useRunStore((s) => s.runs[claimId]?.field_order ?? NO_FIELDS);

export const useSummary = (claimId: string): string => useRunStore((s) => s.runs[claimId]?.summary ?? "");

export const useSynced = (claimId: string): boolean => useRunStore((s) => claimId in s.synced);

/** How many fields were there when the stream caught up; rows past it arrived live. */
export const useFieldsAtSync = (claimId: string): number => useRunStore((s) => s.synced[claimId] ?? 0);

export const useConnection = (claimId: string): Connection => useRunStore((s) => s.connection[claimId] ?? "connecting");
