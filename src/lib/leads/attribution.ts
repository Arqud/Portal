// Meta attribution picked off whatever the ingest webhook actually delivers.
//
// Make.com is the real sender (Meta's own webhook is not what feeds prod), and we do
// not control the exact key names it maps, so every field accepts a short list of
// aliases — first non-empty wins. Everything is normalised to a trimmed string or
// null, because Make routinely sends "" for an unmapped field and sometimes sends an
// id as a JSON number while our columns are text.

export type Attribution = {
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  form_id: string | null;
  ad_name: string | null;
};

/**
 * Normalise one candidate value to a non-empty string, or null.
 * - strings are trimmed; "" / "   " count as absent
 * - finite numbers are coerced to string (Make may send ids unquoted; the columns are text)
 * - anything else (null, undefined, objects, booleans, NaN) is absent
 *
 * Note: an unquoted 16-digit Meta id already lost precision at JSON.parse time — the
 * only real fix is Make sending it quoted. Coercing here at least stores a usable id.
 */
function normalizeId(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? String(raw) : null;
  }
  if (typeof raw === "bigint") return String(raw);
  return null;
}

/** First alias with a non-empty value wins; null when none of them carry anything. */
function pick(source: Record<string, unknown>, aliases: readonly string[]): string | null {
  for (const alias of aliases) {
    const got = normalizeId(source[alias]);
    if (got !== null) return got;
  }
  return null;
}

// Alias order is deliberate.
// - adset_id must NOT accept `adgroup_id`: Meta's leadgen webhook uses `adgroup_id`
//   for the AD, and the ingest route has always read it that way. Reusing it here
//   would silently write the ad id into the adset column.
// - `adgroup_id_parent` is the adset-shaped alias some Make mappings expose.
const ALIASES = {
  campaign_id: ["campaign_id", "meta_campaign_id"],
  adset_id: ["adset_id", "adgroup_id_parent", "meta_adset_id"],
  ad_id: ["adgroup_id", "ad_id", "meta_ad_id"],
  form_id: ["form_id", "meta_form_id"],
  ad_name: ["ad_name", "meta_ad_name"],
} as const;

/**
 * Read Meta attribution straight off an inline webhook `change.value` object.
 * Pure + total: never throws, always returns all five keys, null where unknown.
 * The caller uses this first and only falls back to the Graph API for what is missing.
 */
export function pickAttribution(value: unknown): Attribution {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    campaign_id: pick(source, ALIASES.campaign_id),
    adset_id: pick(source, ALIASES.adset_id),
    ad_id: pick(source, ALIASES.ad_id),
    form_id: pick(source, ALIASES.form_id),
    ad_name: pick(source, ALIASES.ad_name),
  };
}

/**
 * True when the inline body already gave us both ids the Graph lead-node call exists
 * to fetch. When it has, that call is a pure waste of a round trip on a speed-to-lead
 * path — and today it always fails anyway (the Meta app is still in development mode,
 * so every lead-node read returns OAuthException #3).
 */
export function hasFullInlineAttribution(attr: Attribution): boolean {
  return attr.campaign_id !== null && attr.adset_id !== null;
}
