import { Link, useNavigate } from "react-router";
import type { QueueItem } from "@shared/contract";
import { formatDayTime } from "@shared/domain";
import { claimPath } from "../../api/queries";
import { TableCell, TableRow } from "../../ui";
import { confidenceText } from "../review/fieldText";
import { RunStatusChip, statusText } from "../review/RunStatusChip";
import { NeedsYouCount, needsYouText } from "./NeedsYouCount";
import { PriorityMark } from "./PriorityMark";

function confidenceCell(item: QueueItem): string {
  if (item.confidence === null) return item.run_failed ? "— run failed" : "—";
  return confidenceText(item.confidence);
}

/** One claim: a table row from lg, a card below. The reference is the only link; the row click is a mouse shortcut to it. */
export function QueueRow({ item }: { item: QueueItem }) {
  const navigate = useNavigate();
  const href = claimPath(item.claim_id);
  const label = `${item.claim_id}, ${item.claimant_name}, ${item.product}, ${statusText(item.status)}, ${needsYouText(item.needs_you)}`;

  return (
    <TableRow
      onClick={(event) => {
        // Leave the link, modified clicks (new tab) and drag-selecting text alone.
        if (event.target instanceof Element && event.target.closest("a")) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        if (window.getSelection()?.isCollapsed === false) return;
        void navigate(href);
      }}
    >
      <TableCell className="max-lg:order-6 max-lg:ml-auto lg:w-32">
        <PriorityMark priority={item.priority} />
      </TableCell>
      <TableCell className="max-lg:order-1 max-lg:w-3/5 max-lg:grow">
        <Link
          to={href}
          aria-label={label}
          className="font-mono text-md font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {item.claim_id}
        </Link>
      </TableCell>
      <TableCell className="max-lg:order-4 max-lg:text-md max-lg:text-ink-2">{item.claimant_name}</TableCell>
      <TableCell className="text-ink-2 capitalize max-lg:order-5 max-lg:text-md">
        <span aria-hidden="true" className="lg:hidden">
          {"· "}
        </span>
        {item.product}
      </TableCell>
      <TableCell className="max-lg:order-2 max-lg:ml-auto">
        <RunStatusChip status={item.status} />
      </TableCell>
      {/* Phone only: starts the needs-you line, whatever room the line above has left. */}
      <td role="presentation" aria-hidden="true" className="p-0 max-lg:order-7 max-lg:h-0 max-lg:basis-full lg:hidden" />
      <TableCell className="max-lg:order-8">
        <NeedsYouCount count={item.needs_you} />
      </TableCell>
      <TableCell className="font-mono text-sm text-ink-2 max-lg:order-9">
        <span className="font-sans text-ink-3 lg:hidden">Confidence </span>
        {confidenceCell(item)}
      </TableCell>
      <TableCell className="font-mono text-sm text-ink-3 max-lg:order-10 max-lg:basis-full max-lg:font-sans">
        <span className="lg:hidden">Received </span>
        <time dateTime={item.received_at}>{formatDayTime(item.received_at)}</time>
        <span className="lg:hidden">
          {" · Updated "}
          <time dateTime={item.updated_at}>{formatDayTime(item.updated_at)}</time>
        </span>
      </TableCell>
      <TableCell className="font-mono text-sm text-ink-3 max-lg:hidden">
        <time dateTime={item.updated_at}>{formatDayTime(item.updated_at)}</time>
      </TableCell>
    </TableRow>
  );
}
