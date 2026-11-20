import type { ReactNode } from "react";

/** Phone: the decisions, pinned to the bottom of the screen. One row of 44 high buttons fits the 48 high bar. */
export function PhoneActionBar({ children }: { children: ReactNode }) {
  return <div role="group" aria-label="Decisions" className="sticky bottom-0 min-h-12 border-t border-line bg-surface px-4 py-0.5">{children}</div>;
}
