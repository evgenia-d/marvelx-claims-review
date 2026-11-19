// The review screen's field groups: the configured groups narrowed to the fields the run has
// emitted, plus a trailing "Other" group for fields the config doesn't list.
export type FieldGroup = { name: string; field_ids: string[] };

export function groupFields(groups: FieldGroup[], fieldOrder: string[]): FieldGroup[] {
  const emitted = new Set(fieldOrder);
  const listed = new Set(groups.flatMap((g) => g.field_ids));
  const known = groups
    .map((g) => ({ name: g.name, field_ids: g.field_ids.filter((id) => emitted.has(id)) }))
    .filter((g) => g.field_ids.length > 0);
  const other = fieldOrder.filter((id) => !listed.has(id));
  return other.length > 0 ? [...known, { name: "Other", field_ids: other }] : known;
}
