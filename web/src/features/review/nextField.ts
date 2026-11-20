/**
 * The field to open after a decision: the first candidate below the current one in list order,
 * then from the top. Never the current field; null when no candidate is left (the screen stays).
 */
export function nextFieldId(ordered: readonly string[], current: string, isCandidate: (id: string) => boolean): string | null {
  const at = ordered.indexOf(current);
  const rotated = at === -1 ? ordered : [...ordered.slice(at + 1), ...ordered.slice(0, at)];
  return rotated.find((id) => id !== current && isCandidate(id)) ?? null;
}

/**
 * The row to focus when the phone returns to the list: the field just viewed, or if the filter
 * now hides it (it was decided) the next field the filter shows. Null when it shows none.
 */
export function returnFocusId(ordered: readonly string[], viewed: string, shows: (id: string) => boolean): string | null {
  return shows(viewed) ? viewed : nextFieldId(ordered, viewed, shows);
}
