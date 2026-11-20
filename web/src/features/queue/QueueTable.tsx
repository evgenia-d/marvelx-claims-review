import type { QueueItem } from "@shared/contract";
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from "../../ui";
import { QueueRow } from "./QueueRow";

const COLUMNS = ["Priority", "Reference", "Claimant", "Product", "Status", "Needs you", "Confidence", "Received", "Updated"];

/** Fixed sort (the server's): the table doesn't re-sort, rows only change in place. */
export function QueueTable({ claims }: { claims: QueueItem[] }) {
  return (
    <div>
      <div className="overflow-hidden rounded-lg border-line bg-surface lg:border">
        <Table aria-label="Claims">
          <TableHead>
            <TableRow>
              {COLUMNS.map((name) => (
                <TableHeaderCell key={name}>{name}</TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {claims.map((item) => (
              <QueueRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-base text-ink-3">Sorted by priority, then oldest received.</p>
    </div>
  );
}
