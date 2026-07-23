import { describe, expect, it } from "vitest";
import { extractFranchiseQualifiers, franchiseQualifierRows } from "@/lib/leads/franchiseAnswers";

describe("extractFranchiseQualifiers — pull capital / timeline / funds / area from form_answers", () => {
  it("matches the four qualifiers on realistic slugged Meta field names", () => {
    const q = extractFranchiseQualifiers({
      full_name: "Big Investor",
      phone_number: "+27831112222",
      email: "investor@example.com",
      how_much_capital_can_you_invest: "R1.75m – R2m",
      when_are_you_looking_to_start: "In 3 months",
      do_you_have_the_funds_available: "Yes, cash available",
      which_area_are_you_interested_in: "Rivonia / Sandton",
    });
    expect(q.capital).toBe("R1.75m – R2m");
    expect(q.timeline).toBe("In 3 months");
    expect(q.funds).toBe("Yes, cash available");
    expect(q.area).toBe("Rivonia / Sandton");
  });

  it("never surfaces contact fields as qualifier answers", () => {
    const q = extractFranchiseQualifiers({
      full_name: "Big Investor",
      phone_number: "+27831112222",
      email: "investor@example.com",
    });
    expect(q).toEqual({ capital: null, timeline: null, funds: null, area: null, other: [] });
  });

  it("puts remaining non-contact answers into `other`, humanised", () => {
    const q = extractFranchiseQualifiers({
      full_name: "Investor",
      capital_available: "R2m",
      previous_business_experience: "Owned a franchise before",
    });
    expect(q.capital).toBe("R2m");
    expect(q.other).toEqual([{ label: "Previous Business Experience", value: "Owned a franchise before" }]);
  });

  it("ignores empty / whitespace answers", () => {
    const q = extractFranchiseQualifiers({
      how_much_capital: "   ",
      area: "Durban",
    });
    expect(q.capital).toBeNull();
    expect(q.area).toBe("Durban");
  });

  it("returns all-null for null / undefined / empty input, never throwing", () => {
    const empty = { capital: null, timeline: null, funds: null, area: null, other: [] };
    expect(extractFranchiseQualifiers(null)).toEqual(empty);
    expect(extractFranchiseQualifiers(undefined)).toEqual(empty);
    expect(extractFranchiseQualifiers({})).toEqual(empty);
  });

  it("does not double-assign one key to two qualifiers", () => {
    // Only a single 'budget' answer — it claims capital and nothing else.
    const q = extractFranchiseQualifiers({ what_is_your_budget: "R1m" });
    expect(q.capital).toBe("R1m");
    expect(q.timeline).toBeNull();
    expect(q.funds).toBeNull();
    expect(q.area).toBeNull();
    expect(q.other).toEqual([]);
  });
});

describe("franchiseQualifierRows — labeled { label, value } rows for the notification email", () => {
  it("emits Capital first, then Timeline / Funds / Area, then any others", () => {
    const rows = franchiseQualifierRows({
      full_name: "Big Investor",
      phone_number: "+27831112222",
      how_much_capital_can_you_invest: "R1.75m – R2m",
      when_are_you_looking_to_start: "In 3 months",
      do_you_have_the_funds_available: "Yes, cash available",
      which_area_are_you_interested_in: "Rivonia / Sandton",
      previous_business_experience: "Owned a franchise before",
    });
    expect(rows).toEqual([
      { label: "Capital", value: "R1.75m – R2m" },
      { label: "Timeline", value: "In 3 months" },
      { label: "Funds", value: "Yes, cash available" },
      { label: "Area", value: "Rivonia / Sandton" },
      { label: "Previous Business Experience", value: "Owned a franchise before" },
    ]);
    // Capital band leads so it renders most prominently.
    expect(rows[0].label).toBe("Capital");
  });

  it("skips null/empty qualifiers so the email never shows a blank row", () => {
    const rows = franchiseQualifierRows({ which_area_are_you_interested_in: "Durban" });
    expect(rows).toEqual([{ label: "Area", value: "Durban" }]);
  });

  it("returns [] for null / undefined / empty input, never throwing", () => {
    expect(franchiseQualifierRows(null)).toEqual([]);
    expect(franchiseQualifierRows(undefined)).toEqual([]);
    expect(franchiseQualifierRows({})).toEqual([]);
  });
});
