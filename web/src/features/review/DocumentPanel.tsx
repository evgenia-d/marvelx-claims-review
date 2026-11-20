import { useEffect, useRef } from "react";
import type { ClaimDetail } from "@shared/contract";
import { citedText, formatValue, type FieldView } from "@shared/domain";
import { Highlight } from "../../ui";
import { EvidenceNote } from "./EvidenceNote";

type Props = { view: FieldView | undefined; documents: ClaimDetail["documents"] };

/**
 * The open field's source document with the cited span highlighted (T6). Document text is data:
 * it renders as plain text, including any text addressed to the claims system.
 */
export function DocumentPanel({ view, documents }: Props) {
  const source = view?.agent.source ?? null;
  const doc = source ? documents.find((d) => d.document_id === source.document_id) : undefined;
  const cited = source && doc ? citedText({ [doc.document_id]: doc.text }, source) : null;
  const markRef = useRef<HTMLSpanElement>(null);

  // Scroll the one highlighted span into view whenever the open field or its citation changes.
  const fieldId = view?.field_id;
  const start = source?.start;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    markRef.current?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [fieldId, doc?.document_id, start]);

  if (!view) return <PanelTop title="Source" />;

  if (!source) {
    return (
      <>
        <PanelTop title="Source" />
        <div className="p-4">
          <EvidenceNote title="No source">The agent cited no document for this value.</EvidenceNote>
        </div>
      </>
    );
  }

  if (!doc || cited === null) {
    return (
      <>
        <PanelTop title={doc?.title ?? "Source"} />
        <div className="p-4">
          <EvidenceNote title="Source not available">
            The passage the agent cited can't be found in the claim's documents.
          </EvidenceNote>
        </div>
      </>
    );
  }

  const value = formatValue(view.value_type, view.agent.value);
  return (
    <>
      <PanelTop title={doc.title} />
      <div className="flex flex-col gap-3 p-4">
        {view.citation === "not_found" && value !== null && (
          <EvidenceNote title={`${value} not found in the cited text`}>“{cited}”</EvidenceNote>
        )}
        <div className="rounded-md bg-surface p-6 font-mono text-sm whitespace-pre-wrap wrap-break-word text-ink shadow-lift">
          {doc.text.slice(0, source.start)}
          <span ref={markRef}>
            <Highlight>{cited}</Highlight>
          </span>
          {doc.text.slice(source.end)}
        </div>
      </div>
    </>
  );
}

function PanelTop({ title }: { title: string }) {
  return (
    <div className="sticky top-0 flex h-12 items-center border-b border-line bg-ground px-4">
      <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
    </div>
  );
}
