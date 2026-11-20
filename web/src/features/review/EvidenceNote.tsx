import type { ReactNode } from "react";

/** A plain note about the evidence. Says what was found, never "wrong" or "mismatch". */
export function EvidenceNote({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-sm text-attn">{title}</p>
      {children && <p className="line-clamp-3 text-sm text-ink-2">{children}</p>}
    </div>
  );
}
