import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, KpiCard, PageHeader } from "@/components/ui";
import { CampaignsBrandView } from "./CampaignsBrandView";

export default async function ClientCampaignsPage() {
  const { profile } = await verifySession("client");
  if (profile.brand === "Franchise") redirect("/client/franchise-leads"); // Marissa: franchise-only
  if (profile.brand) redirect("/client/leads"); // staff logins are Leads-only
  const admin = createSupabaseAdminClient();

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("synced_at", { ascending: false });

  const list = campaigns ?? [];

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-8 animate-fade-up">
      <PageHeader title="Campaigns" count={list.length > 0 ? `${list.length} active` : undefined} />

      {list.length === 0 ? (
        <Card>
          <div className="py-6 text-center space-y-4">
            <p className="font-display text-2xl text-arqud-gold">Live data coming soon</p>
            <p className="text-arqud-bone-dim text-sm max-w-md mx-auto">
              Your Meta Ads campaign performance will appear here once your Meta Business Manager
              access is connected to this portal.
            </p>
            <p className="text-xs text-arqud-muted">Campaigns launching soon</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8">
            {["Leads", "Cost Per Lead", "Ad Spend", "Reach"].map((label) => (
              <KpiCard key={label} label={label} value="—" />
            ))}
          </div>
        </Card>
      ) : (
        <CampaignsBrandView campaigns={list} />
      )}
    </main>
  );
}
