import { useId, type ReactNode } from "react";
import { Busy } from "../../ui";

type Props = { name: string; reading: boolean; hidden: boolean; children: ReactNode };

/** A plain group heading with its rows. Groups never collapse (cut 19 Nov). */
export function FieldSection({ name, reading, hidden, children }: Props) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} hidden={hidden}>
      <h2
        id={headingId}
        className="flex h-8 items-center gap-2 px-2 font-mono text-xs tracking-eyebrow text-ink-3 uppercase"
      >
        {name}
        {reading && (
          <span className="ml-auto flex items-center gap-1.5 font-sans tracking-normal normal-case">
            <Busy />
            Reading
          </span>
        )}
      </h2>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}
