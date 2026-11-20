import { ClaimStatus, type QueueQuery, type QueueResponse } from "@shared/contract";
import { Select, SegmentedControl } from "../../ui";

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Needs review",
  failed: "Failed",
  reviewed: "Reviewed",
};

type Props = {
  query: QueueQuery;
  counts: QueueResponse["counts"]["status"] | undefined;
  total: number | undefined; 
  onChange: (q: QueueQuery) => void;
};

/** Segmented control from lg, the platform's own select below it. Counts cover the whole queue. */
export function QueueFilters({ query, counts, total, onChange }: Props) {
  const items = [
    { id: "all", label: "All", count: total },
    ...ClaimStatus.options.map((id) => ({ id, label: STATUS_LABEL[id], count: counts?.[id] })),
  ];
  const value = query.status ?? "all";
  const choose = (id: string) => {
    const parsed = ClaimStatus.safeParse(id);
    onChange(parsed.success ? { status: parsed.data } : {});
  };

  return (
    <div>
      <div className="hidden items-center gap-3 lg:flex">
        <span className="text-base text-ink-3">Status</span>
        <SegmentedControl label="Status" items={items} value={value} onChange={choose} />
      </div>
      <Select label="Status" className="lg:hidden" value={value} onChange={(e) => choose(e.target.value)}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.count === undefined ? item.label : `${item.label} (${item.count})`}
          </option>
        ))}
      </Select>
    </div>
  );
}
