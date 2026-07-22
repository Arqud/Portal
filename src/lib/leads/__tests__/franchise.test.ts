import { describe, expect, it } from "vitest";
import { FRANCHISE_FORM_IDS, isFranchiseLead } from "@/lib/leads/franchise";

// A stand-in for the allow-list AFTER the real franchise Meta form is registered —
// proves the form-id mechanics while the production set stays empty (injectable set
// mirrors the branchForForm(id, map) convention already used in formBranches.ts).
const WITH_FRANCHISE_FORM: ReadonlySet<string> = new Set(["9990000000000099"]);

describe("FRANCHISE_FORM_IDS (wired but empty until the form exists)", () => {
  it("is empty by default — no form id is hard-coded yet", () => {
    expect(FRANCHISE_FORM_IDS.size).toBe(0);
  });
});

describe("isFranchiseLead — allow-list (form id)", () => {
  it("is true when the form id is in the set", () => {
    expect(isFranchiseLead({ form_id: "9990000000000099" }, WITH_FRANCHISE_FORM)).toBe(true);
  });

  it("trims the form id before matching", () => {
    expect(isFranchiseLead({ form_id: "  9990000000000099  " }, WITH_FRANCHISE_FORM)).toBe(true);
  });

  it("is false when the form id is NOT in the set and no name signals franchise", () => {
    expect(isFranchiseLead({ form_id: "1445058691003630" }, WITH_FRANCHISE_FORM)).toBe(false);
  });

  it("uses the empty production set by default — a known wash form id is not franchise", () => {
    // No injected set → the real (empty) FRANCHISE_FORM_IDS is consulted.
    expect(isFranchiseLead({ form_id: "1713965523197151" })).toBe(false);
  });
});

describe("isFranchiseLead — name safety net (interim, before the form id is known)", () => {
  it("is true when the campaign name contains 'franchise' (case-insensitive)", () => {
    expect(isFranchiseLead({ campaign_name: "Sparkling Franchise — Rivonia" })).toBe(true);
    expect(isFranchiseLead({ campaign_name: "SPARKLING FRANCHISE RECRUITMENT" })).toBe(true);
  });

  it("is true when the ad name contains 'franchise'", () => {
    expect(isFranchiseLead({ ad_name: "Franchise investor 46s video" })).toBe(true);
  });

  it("is true when the form name contains 'franchise'", () => {
    expect(isFranchiseLead({ form_name: "Become a Franchisee — Higher Intent" })).toBe(true);
  });

  it("matches 'franchise' as a substring (e.g. 'franchisee')", () => {
    expect(isFranchiseLead({ campaign_name: "Franchisee applications" })).toBe(true);
  });
});

describe("isFranchiseLead — normal wash leads are NEVER franchise (protects the live pipeline)", () => {
  it("a normal We Wash lead is not franchise", () => {
    expect(
      isFranchiseLead({
        form_id: "1445058691003630",
        campaign_name: "We Wash — Auto Detailing Complete R599",
        ad_name: "WW R599 carousel",
      }),
    ).toBe(false);
  });

  it("a normal Sparkling WASH lead is not franchise ('sparkling' must not trip it)", () => {
    expect(
      isFranchiseLead({
        form_id: "1713965523197151",
        campaign_name: "Sparkling — Book a Detail",
        ad_name: "Full Monty R199",
      }),
    ).toBe(false);
  });
});

describe("isFranchiseLead — edge cases behave exactly as today (all null/empty ⇒ forward)", () => {
  it("is false for an empty input", () => {
    expect(isFranchiseLead({})).toBe(false);
  });

  it("is false for all-null fields", () => {
    expect(isFranchiseLead({ form_id: null, campaign_name: null, ad_name: null, form_name: null })).toBe(false);
  });

  it("is false for an unknown form id with a non-franchise name", () => {
    expect(isFranchiseLead({ form_id: "000000000000000", campaign_name: "Some Wash Promo" })).toBe(false);
  });

  it("is false for empty-string / whitespace fields", () => {
    expect(isFranchiseLead({ form_id: "   ", campaign_name: "", ad_name: "  " })).toBe(false);
  });
});
