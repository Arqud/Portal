import { describe, expect, it } from "vitest";
import { navModeForBrand, canViewFranchise } from "@/lib/auth/access";

// These pure functions are exactly the rules the franchise page gate and the sidebar
// nav consult, so testing them proves the access behaviour for each persona.

describe("navModeForBrand — sidebar/nav scope per profiles.brand", () => {
  it("Arno (brand null) → full nav", () => {
    expect(navModeForBrand(null)).toBe("full");
    expect(navModeForBrand(undefined)).toBe("full");
  });

  it("Marissa (brand 'Franchise') → franchiseOnly nav", () => {
    expect(navModeForBrand("Franchise")).toBe("franchiseOnly");
  });

  it("wash staff (brand 'We Wash' / 'Sparkling') → leadsOnly nav", () => {
    expect(navModeForBrand("We Wash")).toBe("leadsOnly");
    expect(navModeForBrand("Sparkling")).toBe("leadsOnly");
  });
});

describe("canViewFranchise — franchise page access gate", () => {
  it("Arno (brand null) is allowed", () => {
    expect(canViewFranchise(null)).toBe(true);
    expect(canViewFranchise(undefined)).toBe(true);
  });

  it("Marissa (brand 'Franchise') is allowed", () => {
    expect(canViewFranchise("Franchise")).toBe(true);
  });

  it("We Wash staff are NOT allowed (redirected to /client/leads)", () => {
    expect(canViewFranchise("We Wash")).toBe(false);
  });

  it("Sparkling staff are NOT allowed (redirected to /client/leads)", () => {
    expect(canViewFranchise("Sparkling")).toBe(false);
  });
});
