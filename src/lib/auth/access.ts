// Client-portal access rules, derived PURELY from profiles.brand. Kept as pure
// functions so the routing/gating logic is unit-testable independently of Next's
// server-component + redirect() machinery.
//
// profiles.brand meanings:
//   null                 → Arno: full client account (dashboard, leads, franchise, …)
//   'Franchise'          → Marissa: franchise-only (Sparkling Franchise Leads only)
//   'We Wash'|'Sparkling'(any other non-null value) → wash staff: Leads-only
//
// 'Franchise' is a USER SCOPE, not a lead brand — getBrand() (lead brand logic) is
// intentionally untouched.

export type NavMode = "full" | "leadsOnly" | "franchiseOnly";

/**
 * Which sidebar/nav a signed-in client sees:
 *   - full          → Arno (brand null): the complete client nav (incl. franchise item)
 *   - franchiseOnly → Marissa (brand 'Franchise'): only the Sparkling Franchise Leads item
 *   - leadsOnly     → wash staff (brand 'We Wash'/'Sparkling'): only the Leads item
 */
export function navModeForBrand(brand: string | null | undefined): NavMode {
  if (brand === "Franchise") return "franchiseOnly";
  if (brand) return "leadsOnly";
  return "full";
}

/**
 * True when this brand scope may view the Sparkling Franchise Leads page. Only Arno
 * (full account, brand null) and Marissa (brand 'Franchise') — wash staff are never
 * allowed. Callers redirect a disallowed brand to /client/leads.
 */
export function canViewFranchise(brand: string | null | undefined): boolean {
  return brand == null || brand === "Franchise";
}
