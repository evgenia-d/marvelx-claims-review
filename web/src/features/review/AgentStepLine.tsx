import type { ClaimDetail } from "@shared/contract";
import type { RunState, Step } from "@shared/domain";
import { Disclosure, StatusGlyph } from "../../ui";
import { AgentSteps } from "./AgentSteps";

type Props = { steps: Step[]; status: RunState["status"]; error: RunState["error"]; notChecked: ClaimDetail["not_checked"] };

type Line = { label: string; text: string; earlier: number };

// The most recent step note (T1), with a count of the other notes so an earlier one (e.g. the
// injection note) is never silently dropped. A failure is not here: the failed-run band says it.
function latest(steps: Step[]): Line | null {
  const notes = steps.filter((s) => s.note !== null);
  const last = notes.at(-1);
  return last ? { label: last.label, text: last.note ?? "", earlier: notes.length - 1 } : null;
}

/** One line under the header: the latest note and how many more, opening to every step. */
export function AgentStepLine({ steps, status, error, notChecked }: Props) {
  const line = latest(steps);
  const waiting = steps.length === 0 && status === "not_started";
  const done = steps.filter((s) => s.state !== "running").length;
  return (
    <div className="border-b border-line bg-ground px-4">
      <Disclosure
        summary={
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {line ? (
              <>
                <StatusGlyph kind="attn" />
                <span className="min-w-0 truncate text-ink-2">
                  <span className="font-medium text-ink">{line.label}</span> {line.text}
                </span>
                {line.earlier > 0 && (
                  <span className="shrink-0 text-ink-3">
                    +{line.earlier} {line.earlier === 1 ? "note" : "notes"}
                  </span>
                )}
              </>
            ) : (
              <span className="min-w-0 truncate text-ink-3">{waiting ? "Waiting for the agent to start" : "No notes"}</span>
            )}
            {!waiting && (
              <span className="ml-auto shrink-0 pl-4 text-ink-3">
                Agent steps {done} of {steps.length}
              </span>
            )}
          </span>
        }
      >
        <AgentSteps steps={steps} error={error} notChecked={notChecked} />
      </Disclosure>
    </div>
  );
}
