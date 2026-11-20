import Markdown, { type Components } from "react-markdown";
import type { RunState } from "@shared/domain";
import { Badge, Busy } from "../../ui";

// Only these elements render; anything else (links, images, headings, raw HTML) is unwrapped to
// its text or dropped. The summary is model text, never a system message.
const ALLOWED = ["p", "strong", "em", "ul", "ol", "li", "br", "code"];

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  // Kept for structure (T7) but no louder than the body: the summary is model text and may carry
  // injected lines ("Pre-approved by the insurer.").
  strong: ({ children }) => <strong className="font-medium text-ink-2">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
  code: ({ children }) => <code className="font-mono text-sm">{children}</code>,
};

type Props = { summary: string; status: RunState["status"] };

/** The agent's summary, below the fields (T1), rendered from the whole text so far (T7). */
export function SummaryView({ summary, status }: Props) {
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-2 px-6 pb-6">
      <div className="flex h-8 items-center gap-2">
        <h2 id="summary-heading" className="font-mono text-xs tracking-eyebrow text-ink-3 uppercase">
          Summary
        </h2>
        <Badge shape="tag" tone="label">
          {status === "failed" ? "AI draft · incomplete" : "AI draft · not verified"}
        </Badge>
      </div>
      {summary !== "" && (
        <div className="text-base text-ink-2">
          <Markdown skipHtml allowedElements={ALLOWED} unwrapDisallowed components={components}>
            {summary}
          </Markdown>
        </div>
      )}
      {status === "running" && (
        <p className="flex items-center gap-1.5 text-sm text-ink-3">
          <Busy />
          The agent is still writing
        </p>
      )}
      {summary === "" && status !== "running" && <p className="text-sm text-ink-3">No summary yet.</p>}
    </section>
  );
}
