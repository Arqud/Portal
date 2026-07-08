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

// Some clients run more than one Meta ad account. Arno's two brands live in
// SEPARATE accounts under different businesses (We Wash + Sparkling), so we sync
// both and let the brand split (getBrand on campaign name) route each into its
// own tab. The client record holds the primary account; extras are listed here,
// keyed by the primary account id, until multi-account storage is first-class.
const EXTRA_AD_ACCOUNTS: Record<string, string[]> = {
  "1497005325446021": ["1208767218375264"], // We Wash (primary) → also pull Sparkling
};

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

  const token = client.meta_access_token;
  const adAccountIds = [
    client.meta_ad_account_id,
    ...(EXTRA_AD_ACCOUNTS[client.meta_ad_account_id] ?? []),
  ];

  // Upsert campaigns across every ad account. Previously the write error was
  // swallowed and we returned the *fetched* count, so the UI reported "synced"
  // while zero rows landed (e.g. a missing unique constraint makes the onConflict
  // upsert fail). Surface any write error and count only rows actually written.
  let written = 0;
  const failures: string[] = [];

  for (const adAccountId of adAccountIds) {
    // Fetch per account. A secondary account we can't read (e.g. the token lacks
    // ads_read on a different business) must NEVER abort the whole sync — record
    // the failure and carry on so the accounts that DO read still write.
    let campaigns: Awaited<ReturnType<typeof fetchCampaigns>>;
    let insights: Awaited<ReturnType<typeof fetchCampaignInsights>>;
    try {
      // Insights: pull month-to-date ("this_month"). The default "last_30d"
      // window ends yesterday, so a campaign that launched today reports zeros.
      [campaigns, insights] = await Promise.all([
        fetchCampaigns(adAccountId, token),
        fetchCampaignInsights(adAccountId, token, "this_month"),
      ]);
    } catch (e) {
      failures.push(`act_${adAccountId}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // Map insights by campaign ID
    const insightMap: Record<string, (typeof insights)[0]> = {};
    for (const insight of insights) {
      insightMap[insight.campaign_id] = insight;
    }

    for (const campaign of campaigns) {
      const insight = insightMap[campaign.id];
      const spend = insight ? parseFloat(insight.spend) : 0;
      const reach = insight ? parseInt(insight.reach) : 0;
      const clicks = insight ? parseInt(insight.clicks) : 0;
      const impressions = insight ? parseInt(insight.impressions) : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const leads = insight ? extractLeads(insight) : 0;
      const cpl = calcCpl(spend, leads);

      const { error } = await admin.from("campaigns").upsert(
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
      if (error) {
        throw new Error(`Failed to save campaign "${campaign.name}": ${error.message}`);
      }
      written++;
    }
  }

  // Every account failed — treat as a hard error (as before), not a silent "0".
  if (written === 0 && failures.length === adAccountIds.length) {
    throw new Error(failures.join("; "));
  }

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/campaigns");
  revalidatePath("/client/dashboard");

  const warning = failures.length > 0 ? `Some ad accounts could not be synced — ${failures.join("; ")}` : undefined;
  return { synced: written, warning };
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
