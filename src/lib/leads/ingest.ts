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

// Preferred-time dropdown ("When would you like your car done?"). Meta slugs the
// question text into the field name and the exact slug is unknown until the form
// exists, so match fuzzily on normalized keys (lowercase, alphanumerics only).
export function extractPreferredTime(leadData: Record<string, string>): string | null {
  const match = Object.keys(leadData).find((k) => {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      norm.includes("whenwouldyoulike") ||
      norm.includes("preferredtime") ||
      (norm.includes("when") && norm.includes("done"))
    );
  });
  if (!match) return null;
  const value = leadData[match]?.trim();
  return value || null;
}

// Real Meta forms often send the dropdown VALUE slugged (e.g. "eldo_glen_(centurion)"
// or "_menlyn_(pretoria)") instead of the clean label. Map it back to the canonical
// branch string so the CRM displays it correctly AND Duan's exact-match branch filter
// hits (Sparkling only texts Menlyn/Rustenburg — a slug would silently miss).
const CANONICAL_BRANCHES: readonly string[] = [...WE_WASH_BRANCHES, ...SPARKLING_BRANCHES];
// Alphanumerics-only comparison key, shared by both normalizers below.
const alnumKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function normalizeBranch(raw: string | null): string | null {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (CANONICAL_BRANCHES.includes(trimmed)) return trimmed; // already clean
  const key = alnumKey(trimmed);
  const match = CANONICAL_BRANCHES.find((b) => alnumKey(b) === key);
  return match ?? trimmed; // fall back to raw if it genuinely doesn't match
}

// Meta slugs the chosen dropdown OPTION too (a real lead arrived as "this_weekend_").
// Map it back to the canonical label so the SMS partner, portal UI and email all get
// clean text. The em dash in "This week — morning" contributes nothing alphanumeric,
// so "this_week_morning_" matches it. Unknown values pass through unchanged so a
// future edit to the form's options never makes an answer vanish.
const CANONICAL_PREFERRED_TIMES: readonly string[] = [
  "As soon as possible",
  "This week — morning",
  "This week — afternoon",
  "This weekend",
  "Next week",
];

export function normalizePreferredTime(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (CANONICAL_PREFERRED_TIMES.includes(trimmed)) return trimmed; // already clean
  const key = alnumKey(trimmed);
  const match = CANONICAL_PREFERRED_TIMES.find((t) => alnumKey(t) === key);
  return match ?? trimmed; // fall back to raw if it genuinely doesn't match
}

/**
 * Build the raw Meta answers map `{ [questionName]: value }` from a lead's
 * `field_data`, to persist verbatim in `leads.form_answers`. This is what lets the
 * Sparkling Franchise Leads page surface the qualifier answers (capital band,
 * timeline, funds-available, area) that the wash CRM has no dedicated columns for.
 *
 * FULLY DEFENSIVE — the highest priority. A parse issue here must NEVER throw into or
 * block lead ingestion (the whole point of the leads pipeline is that a lead is never
 * lost). Tolerates a missing/non-array `field_data`, null entries, a missing `name`,
 * and missing/empty `values`; on anything unexpected it returns null. Returns null
 * (not `{}`) when there is nothing to store, so a lead with no answers stays clean.
 */
export function safeFormAnswers(fieldData: unknown): Record<string, string> | null {
  try {
    if (!Array.isArray(fieldData)) return null;
    const out: Record<string, string> = {};
    for (const f of fieldData) {
      const name = typeof f?.name === "string" ? f.name.trim() : "";
      if (!name) continue;
      const first = Array.isArray(f?.values) ? f.values[0] : undefined;
      out[name] = typeof first === "string" ? first.trim() : first == null ? "" : String(first);
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
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
