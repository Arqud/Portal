// Pure helpers for the Meta lead webhook. Kept separate + unit-tested because
// getting brand/branch wrong at launch is the highest-cost failure in the CRM
// (Duan's speed-to-lead SMS depends on correct brand + branch routing).

// page_id is always present in Meta leadgen payloads and — unlike the campaign
// name — doesn't depend on naming discipline, so it is the reliable brand signal.
export const WE_WASH_PAGE_ID = "1147234435130456";
export const SPARKLING_PAGE_ID = ""; // TODO: set once Morne sends the Sparkling Page ID

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
  if (campaignName && campaignName.trim()) return campaignName;
  if (pageId && PAGE_BRAND_LABEL[pageId]) return PAGE_BRAND_LABEL[pageId];
  return null;
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
