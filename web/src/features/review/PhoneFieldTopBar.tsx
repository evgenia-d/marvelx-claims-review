import { IconButton, IconBack, IconChevron } from "../../ui";
import { useConnection, useRunMeta } from "../../api/runStore";
import { claimStatus } from "@shared/domain";
import { statusText } from "./RunStatusChip";

type Props = {
  claimId: string;
  completedAt: string | null;
  group: string | null;
  /** "Needs you · 2 of 7", or null when the open field isn't one of the claim's fields. */
  position: string | null;
  onBack: () => void;
  /** The neighbouring field ids, or null at either end. */
  prev: string | null;
  next: string | null;
  onGo: (fieldId: string) => void;
};

/** Phone field screen: back, the group over the position, and previous / next (blocked at the ends, never disabled). */
export function PhoneFieldTopBar({ claimId, completedAt, group, position, onBack, prev, next, onGo }: Props) {
  const meta = useRunMeta(claimId);
  const connection = useConnection(claimId);
  return (
    <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-surface px-2">
      <IconButton label="Back to fields" icon={<IconBack />} onClick={onBack} tooltipAlign="start" />
      <div className="flex min-w-0 flex-1 flex-col px-2">
        <span className="truncate text-base font-medium text-ink">{group}</span>
        {position && <span className="truncate text-sm text-ink-3">{position}</span>}
      </div>
      {/* The list screen, with the status chip, is hidden here: say status changes from this screen too. */}
      <div aria-live="polite" className="sr-only">
        {statusText(claimStatus(meta.status, completedAt))}
        {connection === "reconnecting" && ". Reconnecting"}
      </div>
      <IconButton
        label="Previous field"
        icon={<IconChevron className="rotate-180" />}
        aria-disabled={prev === null || undefined}
        onClick={() => prev !== null && onGo(prev)}
        className={prev === null ? "text-ink-3" : undefined}
        tooltipAlign="end"
      />
      <IconButton
        label="Next field"
        icon={<IconChevron />}
        aria-disabled={next === null || undefined}
        onClick={() => next !== null && onGo(next)}
        className={next === null ? "text-ink-3" : undefined}
        tooltipAlign="end"
      />
    </div>
  );
}
