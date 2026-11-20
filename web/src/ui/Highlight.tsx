import type { ReactNode } from "react";

export type HighlightProps = { children: ReactNode };

export function Highlight({ children }: HighlightProps) {
  return <mark className="rounded-xs bg-cite text-ink">{children}</mark>;
}
