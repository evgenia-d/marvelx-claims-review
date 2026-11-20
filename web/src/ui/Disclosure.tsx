import type { ReactNode } from "react";
import { cx, focusRing } from "./cx";
import { IconChevron } from "./icons";

export type DisclosureProps = {
  summary: ReactNode;
  children: ReactNode;
};

/** Native `details`, closed by default. */
export function Disclosure({ summary, children }: DisclosureProps) {
  return (
    <details className="group">
      <summary
        className={cx(
          "flex h-11 cursor-pointer list-none items-center gap-2 rounded-md text-base text-ink-2 lg:h-10",
          focusRing,
        )}
      >
        <IconChevron
          className="shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
        {summary}
      </summary>
      <div className="pl-6 text-base text-ink-2">{children}</div>
    </details>
  );
}
