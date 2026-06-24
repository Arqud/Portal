// Per-brand branch rosters. These are the full, canonical lists of physical
// branches for each brand so the Leads filter pills can show every branch even
// before any leads have come in. Labels must match exactly what the Meta lead
// forms send so leads slot under the right pill.

export const WE_WASH_BRANCHES = [
  "Eldo Glen (Centurion)",
  "Old Farm Road / Faerie Glen (Pretoria)",
  "Sunnyside (Pretoria)",
  "Greenhills (Randfontein)",
  "Maraisburg (Roodepoort)",
  "Sunward (Boksburg)",
  "Lagoon / Stamford Hill (Durban)",
] as const;

export const SPARKLING_BRANCHES = [
  "Menlyn (Pretoria)",
  "Glen Village / Faerie Glen (Pretoria)",
  "Rustenburg",
  "Amanzimtoti (Durban)",
  "Somerset West (Cape Town)",
] as const;

export type BrandName = "We Wash" | "Sparkling";

// Returns the full branch roster for a given brand. Used to seed the branch
// filter pills scoped to the selected brand tab.
export function branchesForBrand(brand: BrandName): readonly string[] {
  return brand === "We Wash" ? WE_WASH_BRANCHES : SPARKLING_BRANCHES;
}
