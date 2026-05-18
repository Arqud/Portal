const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string;
};

export type MetaInsight = {
  campaign_id: string;
  campaign_name: string;
  impressions: string;
  reach: string;
  spend: string;
  clicks: string;
  ctr: string;
  actions?: { action_type: string; value: string }[];
};

export async function fetchCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]> {
  const url = new URL(`${META_BASE}/act_${adAccountId}/campaigns`);
  url.searchParams.set("fields", "id,name,status,objective");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "100");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Meta API error: ${err.error?.message ?? res.statusText}`);
  }
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchCampaignInsights(
  adAccountId: string,
  accessToken: string,
  datePreset: string = "last_30d",
): Promise<MetaInsight[]> {
  const url = new URL(`${META_BASE}/act_${adAccountId}/insights`);
  url.searchParams.set(
    "fields",
    "campaign_id,campaign_name,impressions,reach,spend,clicks,ctr,actions",
  );
  url.searchParams.set("level", "campaign");
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "100");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Meta API error: ${err.error?.message ?? res.statusText}`);
  }
  const data = await res.json();
  return data.data ?? [];
}

export function extractLeads(insight: MetaInsight): number {
  const leadAction = insight.actions?.find(
    (a) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped",
  );
  return leadAction ? parseInt(leadAction.value, 10) : 0;
}

export function calcCpl(spend: number, leads: number): number {
  if (leads === 0) return 0;
  return Math.round((spend / leads) * 100) / 100;
}
