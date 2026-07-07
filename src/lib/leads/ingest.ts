// Pure helpers for the Meta lead webhook. Kept separate + unit-tested because
// getting brand/branch wrong at launch is the highest-cost failure in the CRM
// (Duan's speed-to-lead SMS depends on correct brand + branch routing).

import { getBrand } from "@/lib/leads/brand";
import { WE_WASH_BRANCHES, SPARKLING_BRANCHES } from "@/lib/leads/branches";

// page_id is always present in Meta leadgen payloads and — unlike the campaign
// name — doesn't depend on naming discipline, so it is the reliable brand signal.
export const WE_WASH_PAGE_ID = "1147234435130456";
export const SPARKLING_PAGE_ID = "459272044104015"; // "Sparkling Auto Care Centres" FB Page (confirmed 2026-07-03)

const PAGE_BRAND_LABEL: Record<string, string> = {
  [WE_WASH_PAGE_ID]: "We Wash Cars",
  ...(SPARKLING_PAGE_ID ? { [SPARKLING_PAGE_ID]: "Sparkling Auto Care" } : {}),
};

/**
 * Value to store in `meta_campaign_name` (read-time getBrand parses it into the
 * brand badge). Prefer the real campaign name; fall back to a page-derived brand
 * label so brand never silently defaults to "Other" when the forwarder omits it.
 */
export function resolveCampaignName(
  campaignName: string | null | undefined,
  pageId: string | null | undefined,
): string | null {
  const name = campaignName?.trim() || "";
  const pageLabel = pageId ? PAGE_BRAND_LABEL[pageId] : undefined;

  if (name) {
    // A real campaign name wins — but if it lacks a brand token (would resolve to
    // "Other") and page_id tells us the brand, prefix the page brand label so a
    // misnamed campaign can never strip the brand off the lead. page_id is the
    // authoritative brand signal.
    if (pageLabel && getBrand({ meta_campaign_name: name, meta_ad_name: null }) === "Other") {
      return `${pageLabel} — ${name}`;
    }
    return name;
  }
  // No campaign name: fall back to the page-derived brand label.
  return pageLabel ?? null;
}

// Known Meta field slugs for the branch question, plus a fuzzy fallback so we
// survive small differences in how the question was phrased / slugged.
const BRANCH_KEYS = [
  "branch",
  "which_branch_is_closest_to_you",
  "which_branch_is_most_convenient_for_you",
  "preferred_branch",
  "location",
];

export function extractBranch(leadData: Record<string, string>): string | null {
  for (const k of BRANCH_KEYS) {
    if (leadData[k]) return leadData[k];
  }
  const fuzzy = Object.keys(leadData).find((k) => k.toLowerCase().includes("branch"));
  return fuzzy ? leadData[fuzzy] || null : null;
}

// Real Meta forms often send the dropdown VALUE slugged (e.g. "eldo_glen_(centurion)"
// or "_menlyn_(pretoria)") instead of the clean label. Map it back to the canonical
// branch string so the CRM displays it correctly AND Duan's exact-match branch filter
// hits (Sparkling only texts Menlyn/Rustenburg — a slug would silently miss).
const CANONICAL_BRANCHES: readonly string[] = [...WE_WASH_BRANCHES, ...SPARKLING_BRANCHES];
const branchKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function normalizeBranch(raw: string | null): string | null {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (CANONICAL_BRANCHES.includes(trimmed)) return trimmed; // already clean
  const key = branchKey(trimmed);
  const match = CANONICAL_BRANCHES.find((b) => branchKey(b) === key);
  return match ?? trimmed; // fall back to raw if it genuinely doesn't match
}

export function mapContact(leadData: Record<string, string>): {
  full_name: string | null;
  phone: string | null;
  email: string | null;
} {
  return {
    full_name: leadData["full_name"] ?? leadData["name"] ?? null,
    phone: leadData["phone_number"] ?? leadData["phone"] ?? null,
    email: leadData["email"] ?? null,
  };
}
