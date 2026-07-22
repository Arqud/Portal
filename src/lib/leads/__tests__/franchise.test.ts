import { describe, expect, it } from "vitest";
import { FRANCHISE_FORM_IDS, isFranchiseLead, isFranchiseLeadRow, partitionFranchise } from "@/lib/leads/franchise";

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

describe("isFranchiseLeadRow — classify a persisted lead ROW (DB column names)", () => {
  it("is true for a row whose campaign name contains 'franchise'", () => {
    expect(
      isFranchiseLeadRow({
        meta_campaign_name: "Sparkling Franchise — Rivonia Investor",
        meta_ad_name: "Franchise 46s",
        meta_form_id: null,
      }),
    ).toBe(true);
  });

  it("is false for a normal Sparkling WASH row ('sparkling' must not trip it)", () => {
    expect(
      isFranchiseLeadRow({
        meta_campaign_name: "Sparkling — Book a Detail",
        meta_ad_name: "Full Monty R199",
        meta_form_id: "1713965523197151",
      }),
    ).toBe(false);
  });

  it("tolerates a row missing the meta fields (falls through the name net ⇒ wash)", () => {
    expect(isFranchiseLeadRow({})).toBe(false);
    expect(isFranchiseLeadRow({ meta_campaign_name: null, meta_ad_name: null })).toBe(false);
  });
});

describe("partitionFranchise — split rows into wash vs franchise", () => {
  const rows = [
    { id: "a", meta_campaign_name: "We Wash — R599", meta_ad_name: null, meta_form_id: null },
    { id: "b", meta_campaign_name: "Sparkling Franchise — Rivonia", meta_ad_name: null, meta_form_id: null },
    { id: "c", meta_campaign_name: "Sparkling — Full Monty", meta_ad_name: null, meta_form_id: null },
    { id: "d", meta_campaign_name: null, meta_ad_name: "Franchise investor 46s", meta_form_id: null },
  ];

  it("routes franchise-named rows to franchise and everything else to wash", () => {
    const { wash, franchise } = partitionFranchise(rows);
    expect(wash.map((r) => r.id)).toEqual(["a", "c"]);
    expect(franchise.map((r) => r.id)).toEqual(["b", "d"]);
  });

  it("preserves the row shape (generic) and input order", () => {
    const { wash } = partitionFranchise(rows);
    expect(wash[0]).toMatchObject({ id: "a", meta_campaign_name: "We Wash — R599" });
  });

  it("wash + franchise are exhaustive and never overlap", () => {
    const { wash, franchise } = partitionFranchise(rows);
    expect(wash.length + franchise.length).toBe(rows.length);
    const franchiseIds = new Set(franchise.map((r) => r.id));
    expect(wash.some((r) => franchiseIds.has(r.id))).toBe(false);
  });

  it("returns two empty lists for an empty input", () => {
    expect(partitionFranchise([])).toEqual({ wash: [], franchise: [] });
  });
});
