// Product config, not fixture data: how each claim's fields are grouped on the review screen
// (copied from plans/design/gen/proto.py) and what a failed step left unchecked.
type Groups = { name: string; field_ids: string[] }[];

export const FIELD_GROUPS: Record<string, Groups> = {
  "CLM-2026-004817": [
    { name: "Incident", field_ids: ["claim_type", "police_report_number", "incident_date", "incident_time", "incident_location", "road_conditions", "injuries_reported", "incident_narrative", "statement_date", "claimant_injured"] },
    { name: "Parties", field_ids: ["policyholder_name", "claimant_phone", "claimant_email", "third_party_name", "third_party_plate", "third_party_insurer", "third_party_policy_number", "witness_name", "witness_phone"] },
    { name: "Vehicle and damage", field_ids: ["policyholder_vehicle", "policyholder_plate", "vehicle_mileage", "damage_description", "vehicle_drivable"] },
    { name: "Repair costs", field_ids: ["garage_name", "invoice_number", "invoice_date", "repair_completed_date", "parts_total", "labour_hours", "labour_rate", "labour_total", "paint_materials", "supplements_total", "courtesy_car_days", "subtotal_excl_vat", "vat_amount", "total_incl_vat"] },
    { name: "Policy and cover", field_ids: ["policy_number", "cover_type", "policy_start_date", "policy_end_date", "excess", "courtesy_car_cover", "courtesy_car_limit_days", "no_claims_years", "courtesy_car_within_limit"] },
    { name: "Assessment", field_ids: ["liability_assessment", "estimated_payable"] },
  ],
  "CLM-2026-004822": [
    { name: "Incident", field_ids: ["claim_type", "discovered_at", "cause_of_damage", "rooms_affected"] },
    { name: "Repair", field_ids: ["repairer", "visit_date", "repair_cost"] },
    { name: "Contents", field_ids: ["damaged_items", "estimated_contents_loss"] },
  ],
  "CLM-2026-004809": [
    { name: "Incident", field_ids: ["claim_type", "damage"] },
    { name: "Vehicle", field_ids: ["vehicle", "plate"] },
    { name: "Repair costs", field_ids: ["repair_cost"] },
    { name: "Policy and cover", field_ids: ["glass_covered", "excess"] },
  ],
  "CLM-2026-004830": [
    { name: "Incident", field_ids: ["claim_type", "police_report_number", "theft_date", "theft_location"] },
    { name: "Bicycle", field_ids: ["bicycle", "frame_number", "locked"] },
    { name: "Purchase", field_ids: ["purchase_date", "purchase_price"] },
  ],
};

// step_id → what the claim was not checked for when that step failed.
export const NOT_CHECKED: Record<string, Record<string, string>> = {
  "CLM-2026-004822": { lookup_policy: "policy cover and excess" },
};
