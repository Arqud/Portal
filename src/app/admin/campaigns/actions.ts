"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchCampaigns, fetchCampaignInsights, extractLeads, calcCpl } from "@/lib/meta/api";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return admin;
}

export async function syncClientCampaigns(clientId: string) {
  const admin = await requireAdmin();

  // Get client's Meta credentials
  const { data: client } = await admin
    .from("clients")
    .select("meta_ad_account_id, meta_access_token, company, name")
    .eq("id", clientId)
    .single();

  if (!client?.meta_ad_account_id || !client?.meta_access_token) {
    throw new Error("Meta credentials not configured for this client. Add Ad Account ID and Access Token first.");
  }

  const [campaigns, insights] = await Promise.all([
    fetchCampaigns(client.meta_ad_account_id, client.meta_access_token),
    fetchCampaignInsights(client.meta_ad_account_id, client.meta_access_token),
  ]);

  // Map insights by campaign ID
  const insightMap: Record<string, (typeof insights)[0]> = {};
  for (const insight of insights) {
    insightMap[insight.campaign_id] = insight;
  }

  // Upsert campaigns
  for (const campaign of campaigns) {
    const insight = insightMap[campaign.id];
    const spend = insight ? parseFloat(insight.spend) : 0;
    const reach = insight ? parseInt(insight.reach) : 0;
    const clicks = insight ? parseInt(insight.clicks) : 0;
    const impressions = insight ? parseInt(insight.impressions) : 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const leads = insight ? extractLeads(insight) : 0;
    const cpl = calcCpl(spend, leads);

    await admin.from("campaigns").upsert(
      {
        client_id: clientId,
        meta_campaign_id: campaign.id,
        name: campaign.name,
        leads,
        cpl,
        spend,
        reach,
        ctr,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "meta_campaign_id,client_id" },
    );
  }

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/campaigns");
  revalidatePath("/client/dashboard");

  return { synced: campaigns.length };
}

export async function saveMetaCredentials(clientId: string, adAccountId: string, accessToken: string) {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("clients")
    .update({
      meta_ad_account_id: adAccountId.replace("act_", ""),
      meta_access_token: accessToken,
    })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/campaigns");
}
