import { describe, expect, it } from "vitest";
import { groupFields } from "./groups";

const config = [
  { name: "Incident", field_ids: ["claim_type", "incident_date"] },
  { name: "Repair", field_ids: ["repair_cost", "garage_name"] },
];

describe("groupFields", () => {
  it("keeps only emitted fields, in config order within each group", () =>
    expect(groupFields(config, ["incident_date", "garage_name", "claim_type"])).toEqual([
      { name: "Incident", field_ids: ["claim_type", "incident_date"] },
      { name: "Repair", field_ids: ["garage_name"] },
    ]));

  it("drops groups with no emitted fields", () =>
    expect(groupFields(config, ["claim_type"])).toEqual([{ name: "Incident", field_ids: ["claim_type"] }]));

  it("puts unlisted fields in a trailing Other group in arrival order", () =>
    expect(groupFields(config, ["weather", "claim_type", "notes"])).toEqual([
      { name: "Incident", field_ids: ["claim_type"] },
      { name: "Other", field_ids: ["weather", "notes"] },
    ]));

  it("returns no groups before any field arrives", () => expect(groupFields(config, [])).toEqual([]));
});
