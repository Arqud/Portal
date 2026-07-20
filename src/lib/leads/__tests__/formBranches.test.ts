import { describe, expect, it } from "vitest";
import {
  FORM_BRANCHES,
  POLL_FORMS,
  branchForForm,
  resolveBranch,
  type FormBranchEntry,
} from "@/lib/leads/formBranches";
import { WE_WASH_PAGE_ID, SPARKLING_PAGE_ID } from "@/lib/leads/ingest";
import { WE_WASH_BRANCHES, SPARKLING_BRANCHES } from "@/lib/leads/branches";

// A stand-in for what the map looks like AFTER the form-per-branch cutover —
// proves the fallback mechanics before the real per-branch form ids exist.
const CUTOVER_MAP: Record<string, FormBranchEntry> = {
  ...FORM_BRANCHES,
  "9990000000000001": { branch: "Eldo Glen (Centurion)", page_id: WE_WASH_PAGE_ID, label: "We Wash — Eldo Glen" },
  "9990000000000002": { branch: "Menlyn (Pretoria)", page_id: SPARKLING_PAGE_ID, label: "Sparkling — Menlyn" },
};

describe("FORM_BRANCHES map", () => {
  it("contains exactly the two current live forms, both branch: null (they still ask the branch question)", () => {
    expect(Object.keys(FORM_BRANCHES).sort()).toEqual(["1445058691003630", "1713965523197151"]);
    expect(FORM_BRANCHES["1445058691003630"]).toEqual({
      branch: null,
      page_id: WE_WASH_PAGE_ID,
      label: "We Wash — Book a Valet",
    });
    expect(FORM_BRANCHES["1713965523197151"]).toEqual({
      branch: null,
      page_id: SPARKLING_PAGE_ID,
      label: "Sparkling — Book a Detail",
    });
  });

  it("every non-null branch in the map is a canonical portal branch string (typo guard for cutover edits)", () => {
    const canonical: readonly string[] = [...WE_WASH_BRANCHES, ...SPARKLING_BRANCHES];
    for (const [formId, entry] of Object.entries(FORM_BRANCHES)) {
      if (entry.branch !== null) {
        expect(canonical, `form ${formId} has a non-canonical branch "${entry.branch}"`).toContain(entry.branch);
      }
    }
  });
});

describe("POLL_FORMS (derived from the map)", () => {
  it("matches the exact shape + entries the poll cron used before (no behaviour change today)", () => {
    expect(POLL_FORMS).toEqual([
      { form_id: "1445058691003630", page_id: WE_WASH_PAGE_ID, label: "We Wash — Book a Valet" },
      { form_id: "1713965523197151", page_id: SPARKLING_PAGE_ID, label: "Sparkling — Book a Detail" },
    ]);
  });
});

describe("branchForForm", () => {
  it("returns null for both current live forms (they carry the branch question — form implies no single branch)", () => {
    expect(branchForForm("1445058691003630")).toBeNull();
    expect(branchForForm("1713965523197151")).toBeNull();
  });

  it("returns null for an unknown form id", () => {
    expect(branchForForm("000000000000000")).toBeNull();
  });

  it("returns null for null/undefined/empty form id", () => {
    expect(branchForForm(null)).toBeNull();
    expect(branchForForm(undefined)).toBeNull();
    expect(branchForForm("")).toBeNull();
  });

  it("returns the mapped branch for a per-branch form (cutover mechanics)", () => {
    expect(branchForForm("9990000000000001", CUTOVER_MAP)).toBe("Eldo Glen (Centurion)");
    expect(branchForForm("9990000000000002", CUTOVER_MAP)).toBe("Menlyn (Pretoria)");
  });
});

describe("resolveBranch", () => {
  it("the question answer always wins, even when the form maps to a branch", () => {
    expect(resolveBranch("Rustenburg", "9990000000000002", CUTOVER_MAP)).toBe("Rustenburg");
    expect(resolveBranch("Sunnyside (Pretoria)", "9990000000000001", CUTOVER_MAP)).toBe("Sunnyside (Pretoria)");
  });

  it("falls back to the form's branch when the extracted branch is null or empty", () => {
    expect(resolveBranch(null, "9990000000000001", CUTOVER_MAP)).toBe("Eldo Glen (Centurion)");
    expect(resolveBranch("", "9990000000000001", CUTOVER_MAP)).toBe("Eldo Glen (Centurion)");
    expect(resolveBranch("   ", "9990000000000002", CUTOVER_MAP)).toBe("Menlyn (Pretoria)");
  });

  it("today's live forms: no answer still resolves to null (no behaviour change until per-branch entries land)", () => {
    expect(resolveBranch(null, "1445058691003630")).toBeNull();
    expect(resolveBranch(null, "1713965523197151")).toBeNull();
  });

  it("today's live forms: an answer resolves exactly as before", () => {
    expect(resolveBranch("Eldo Glen (Centurion)", "1445058691003630")).toBe("Eldo Glen (Centurion)");
    expect(resolveBranch("Menlyn (Pretoria)", "1713965523197151")).toBe("Menlyn (Pretoria)");
  });

  it("returns null when there is no answer and the form id is unknown or missing", () => {
    expect(resolveBranch(null, "000000000000000")).toBeNull();
    expect(resolveBranch(null, null)).toBeNull();
    expect(resolveBranch(null, undefined)).toBeNull();
  });
});
