import { useRef } from "react";
import type { ClaimDetail } from "@shared/contract";
import { citedText, formatValue, type FieldView } from "@shared/domain";
import { ClampToggle, useClamp } from "../../ui";
import { EvidenceNote } from "./EvidenceNote";

type Props = { view: FieldView; documents: ClaimDetail["documents"] };

/**
 * Phone only: the passage the agent cited, under the value, with the document's title. The laptop
 * has the whole document (DocumentPanel). Document text is data: plain text, never a link.
 */
export function CitedText({ view, documents }: Props) {
  const source = view.agent.source;
  const doc = source ? documents.find((d) => d.document_id === source.document_id) : undefined;
  const cited = source && doc ? citedText({ [doc.document_id]: doc.text }, source) : null;
  const textRef = useRef<HTMLParagraphElement>(null);
  const clamp = useClamp(textRef, true, cited);

  if (!source) {
    return <EvidenceNote title="No source">The agent cited no document for this value.</EvidenceNote>;
  }
  if (!doc || cited === null) {
    return (
      <EvidenceNote title="Source not available">The passage the agent cited can't be found in the claim's documents.</EvidenceNote>
    );
  }

  const value = formatValue(view.value_type, view.agent.value);
  return (
    <div className="flex flex-col gap-2">
      {view.citation === "not_found" && value !== null && <EvidenceNote title={`${value} not found in the cited text`} />}
      <div className="flex flex-col items-start gap-2 rounded-md border border-line bg-ground p-4">
        <p
          ref={textRef}
          className={`w-full font-mono text-sm whitespace-pre-wrap wrap-break-word text-ink ${clamp.expanded ? "" : "line-clamp-4"}`}
        >
          {cited}
        </p>
        {clamp.showToggle && <ClampToggle expanded={clamp.expanded} onToggle={clamp.toggle} />}
        <p className="text-sm text-ink-3">{doc.title}</p>
      </div>
    </div>
  );
}
