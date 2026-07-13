import { describe, expect, it } from "vitest";
import { resolveCampaignName, extractBranch, extractPreferredTime, normalizePreferredTime, mapContact, WE_WASH_PAGE_ID, SPARKLING_PAGE_ID } from "@/lib/leads/ingest";
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
  it("prefixes the page brand when a real name lacks a brand token (page_id is authoritative)", () => {
    // Misnamed campaign (no 'sparkling'/'we wash') must NOT strip the brand.
    expect(resolveCampaignName("Four of a Kind R599", SPARKLING_PAGE_ID)).toBe(
      "Sparkling Auto Care — Four of a Kind R599",
    );
    expect(resolveCampaignName("Winter Special", WE_WASH_PAGE_ID)).toBe("We Wash Cars — Winter Special");
  });
  it("a misnamed campaign still routes to the right brand via getBrand", () => {
    const spark = resolveCampaignName("Four of a Kind R599", SPARKLING_PAGE_ID);
    expect(getBrand({ meta_campaign_name: spark, meta_ad_name: null })).toBe("Sparkling");
    const wash = resolveCampaignName("Winter Special", WE_WASH_PAGE_ID);
    expect(getBrand({ meta_campaign_name: wash, meta_ad_name: null })).toBe("We Wash");
  });
  it("leaves a correctly brand-named campaign untouched", () => {
    expect(resolveCampaignName("Sparkling — Full Monty R1750", SPARKLING_PAGE_ID)).toBe(
      "Sparkling — Full Monty R1750",
    );
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

describe("extractPreferredTime", () => {
  it("reads the exact slug the pilot form question produces", () => {
    expect(extractPreferredTime({ "when_would_you_like_your_car_done?": "This week — morning" })).toBe(
      "This week — morning",
    );
  });
  it("survives slug variants of the same question", () => {
    expect(extractPreferredTime({ when_would_you_like_your_car_done: "As soon as possible" })).toBe(
      "As soon as possible",
    );
    expect(extractPreferredTime({ "when_would_you_like_it_done?": "This weekend" })).toBe("This weekend");
    expect(extractPreferredTime({ preferred_time: "Next week" })).toBe("Next week");
    expect(extractPreferredTime({ "when_should_your_car_be_done?": "This week — afternoon" })).toBe(
      "This week — afternoon",
    );
  });
  it("returns null when no preferred-time field exists (all other forms)", () => {
    expect(extractPreferredTime({ full_name: "x", which_branch_is_closest_to_you: "Menlyn (Pretoria)" })).toBeNull();
  });
  it("returns null for an empty/whitespace value", () => {
    expect(extractPreferredTime({ "when_would_you_like_your_car_done?": "" })).toBeNull();
    expect(extractPreferredTime({ "when_would_you_like_your_car_done?": "   " })).toBeNull();
  });
  it("trims the value", () => {
    expect(extractPreferredTime({ preferred_time: "  This weekend  " })).toBe("This weekend");
  });
});

describe("normalizePreferredTime", () => {
  it("maps the real production slug back to the canonical label", () => {
    expect(normalizePreferredTime("this_weekend_")).toBe("This weekend");
  });
  it("maps other option slugs to their canonical labels", () => {
    expect(normalizePreferredTime("as_soon_as_possible")).toBe("As soon as possible");
    expect(normalizePreferredTime("next_week")).toBe("Next week");
  });
  it("matches em-dash labels despite the dash contributing nothing (slug/hyphen/squashed variants)", () => {
    expect(normalizePreferredTime("this_week_morning_")).toBe("This week — morning");
    expect(normalizePreferredTime("this_week_-_morning")).toBe("This week — morning");
    expect(normalizePreferredTime("This week - morning")).toBe("This week — morning");
    expect(normalizePreferredTime("thisweekafternoon")).toBe("This week — afternoon");
  });
  it("passes an exact canonical label through unchanged", () => {
    expect(normalizePreferredTime("This week — afternoon")).toBe("This week — afternoon");
    expect(normalizePreferredTime("As soon as possible")).toBe("As soon as possible");
  });
  it("passes an unknown value through trimmed (future option edits must not vanish)", () => {
    expect(normalizePreferredTime("Friday after 5")).toBe("Friday after 5");
    expect(normalizePreferredTime("  Friday after 5  ")).toBe("Friday after 5");
  });
  it("returns null for null/blank input", () => {
    expect(normalizePreferredTime(null)).toBeNull();
    expect(normalizePreferredTime("")).toBeNull();
    expect(normalizePreferredTime("   ")).toBeNull();
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
