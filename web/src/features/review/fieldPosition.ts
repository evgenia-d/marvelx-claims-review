import type { FilterId } from "./FieldFilter";

export type FieldPosition = {
  /** 0-based place of the open field in the sequence. */
  index: number;
  total: number;
  prev: string | null;
  next: string | null;
  /** False when the open field is outside the filter: the sequence is then every field. */
  inFilter: boolean;
};

export const FILTER_LABEL: Record<FilterId, string> = { needs_you: "Needs you", to_review: "To review", all: "All" };

/**
 * Where the open field sits among the fields the filter shows, and its neighbours (no wrap).
 * A field the filter no longer shows (it was decided) falls back to the whole list.
 */
export function fieldPosition(ordered: readonly string[], openId: string, shows: (id: string) => boolean): FieldPosition | null {
  const shown = ordered.filter(shows);
  const inFilter = shown.includes(openId);
  const sequence = inFilter ? shown : ordered;
  const index = sequence.indexOf(openId);
  if (index === -1) return null;
  return { index, total: sequence.length, prev: sequence[index - 1] ?? null, next: sequence[index + 1] ?? null, inFilter };
}

export const positionLabel = (pos: FieldPosition, filter: FilterId): string =>
  `${pos.inFilter ? FILTER_LABEL[filter] : FILTER_LABEL.all} · ${pos.index + 1} of ${pos.total}`;
