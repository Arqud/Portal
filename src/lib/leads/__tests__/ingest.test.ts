import { describe, expect, it } from "vitest";
import { resolveCampaignName, extractBranch, mapContact, WE_WASH_PAGE_ID, SPARKLING_PAGE_ID } from "@/lib/leads/ingest";
import { getBrand } from "@/lib/leads/brand";

describe("resolveCampaignName", () => {
  it("keeps a real campaign name", () => {
    expect(resolveCampaignName("We Wash — Four of a Kind R599", "x")).toBe("We Wash — Four of a Kind R599");
  });
  it("falls back to a page-derived brand label when campaign name is missing", () => {
    expect(resolveCampaignName(null, WE_WASH_PAGE_ID)).toBe("We Wash Cars");
    expect(resolveCampaignName("", WE_WASH_PAGE_ID)).toBe("We Wash Cars");
    expect(resolveCampaignName(null, SPARKLING_PAGE_ID)).toBe("Sparkling Auto Care");
    expect(resolveCampaignName("", SPARKLING_PAGE_ID)).toBe("Sparkling Auto Care");
  });
  it("returns null for an unknown page with no campaign name", () => {
    expect(resolveCampaignName(null, "999")).toBeNull();
  });
  it("the fallback still routes to the right brand via getBrand", () => {
    const wash = resolveCampaignName(null, WE_WASH_PAGE_ID);
    expect(getBrand({ meta_campaign_name: wash, meta_ad_name: null })).toBe("We Wash");
    const spark = resolveCampaignName(null, SPARKLING_PAGE_ID);
    expect(getBrand({ meta_campaign_name: spark, meta_ad_name: null })).toBe("Sparkling");
  });
  it("has a configured Sparkling page id (brand safety net is live)", () => {
    expect(SPARKLING_PAGE_ID).toBe("459272044104015");
  });
});

describe("extractBranch", () => {
  it("reads the exact 'closest' slug our form produces", () => {
    expect(extractBranch({ which_branch_is_closest_to_you: "Eldo Glen (Centurion)" })).toBe("Eldo Glen (Centurion)");
  });
  it("still reads legacy/simple keys", () => {
    expect(extractBranch({ branch: "Sunnyside (Pretoria)" })).toBe("Sunnyside (Pretoria)");
  });
  it("fuzzy-matches any field mentioning branch", () => {
    expect(extractBranch({ "closest_branch?": "Menlyn (Pretoria)" })).toBe("Menlyn (Pretoria)");
  });
  it("returns null when there is no branch field", () => {
    expect(extractBranch({ full_name: "x" })).toBeNull();
  });
});

describe("mapContact", () => {
  it("maps standard and alternate field names", () => {
    expect(mapContact({ full_name: "Thabo M", phone_number: "0821234567", email: "t@x.co" })).toEqual({
      full_name: "Thabo M",
      phone: "0821234567",
      email: "t@x.co",
    });
    expect(mapContact({ name: "Lerato", phone: "0731112222" })).toEqual({
      full_name: "Lerato",
      phone: "0731112222",
      email: null,
    });
  });
});
