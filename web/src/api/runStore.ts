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
  apply: (claimId: string, event: RunEvent) => void;
  reset: (claimId: string) => void;
  setConnection: (claimId: string, connection: Connection) => void;
};

export const useRunStore = create<RunStore>()((set) => ({
  runs: {},
  connection: {},
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
      if (!(claimId in s.runs)) return s;
      const runs = { ...s.runs };
      delete runs[claimId];
      return { runs };
    }),
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

export const useConnection = (claimId: string): Connection => useRunStore((s) => s.connection[claimId] ?? "connecting");
