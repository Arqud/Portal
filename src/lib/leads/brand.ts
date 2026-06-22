export function getBrand(lead: { meta_campaign_name: string | null; meta_ad_name: string | null }): "Sparkling" | "We Wash" | "Other" {
  const name = (lead.meta_campaign_name ?? lead.meta_ad_name ?? "").toLowerCase();
  if (name.includes("sparkling")) return "Sparkling";
  if (name.includes("we wash") || name.includes("wewash") || name.includes("wwcars")) return "We Wash";
  return "Other";
}

export const BRAND_TONE: Record<string, string> = {
  Sparkling: "spark",
  "We Wash": "wash",
  Other: "neutral",
};

export const STATUS_TONE: Record<string, string> = {
  new: "new",
  contacted: "contacted",
  converted: "converted",
  lost: "neutral",
};

export function initialsOf(name: string | null) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
