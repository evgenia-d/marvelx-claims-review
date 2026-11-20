import type { ClaimDetail } from "@shared/contract";
import type { RunState, Step } from "@shared/domain";
import { Busy, IconCheck, StatusGlyph } from "../../ui";

function StepGlyph({ step }: { step: Step }) {
  switch (step.state) {
    case "running":
      return <span className="flex size-3.5 items-center justify-center"><Busy /></span>;
    case "failed":
      return <StatusGlyph kind="error" />;
    case "warning":
      return <StatusGlyph kind="attn" />;
    case "ok":
      return step.note ? <StatusGlyph kind="attn" /> : <IconCheck size={14} className="text-ink-3" />;
    default: {
      const never: never = step.state;
      return never;
    }
  }
}

const STATE_WORDS: Record<Step["state"], string> = {
  running: "running",
  ok: "done",
  warning: "done with a warning",
  failed: "failed",
};

type Props = { steps: Step[]; error: RunState["error"]; notChecked: ClaimDetail["not_checked"] };

/** The agent's steps in the order they started. Notes and errors are model text: plain text only. */
export function AgentSteps({ steps, error, notChecked }: Props) {
  if (steps.length === 0) return <p className="py-2 text-sm text-ink-3">No steps yet.</p>;
  return (
    <ol className="flex flex-col gap-2 py-2">
      {steps.map((step) => {
        const failed = step.state === "failed" && error?.step_id === step.step_id;
        const missed = failed ? notChecked[step.step_id] : undefined;
        return (
          <li key={step.step_id} className="flex items-start gap-2 text-sm">
            <span className="flex h-4 items-center">
              <StepGlyph step={step} />
            </span>
            <span className="min-w-0">
              <span className="font-medium text-ink">{step.label}</span>
              <span className="sr-only">, {STATE_WORDS[step.state]}</span>
              {step.note && <span className="text-ink-2"> · {step.note}</span>}
              {failed && <span className="text-attn"> · {error.message}</span>}
              {missed && <span className="text-attn"> Not checked: {missed}.</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
