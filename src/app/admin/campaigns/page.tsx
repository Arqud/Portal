export const dynamic = "force-dynamic";

import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CampaignsClient } from "./CampaignsClient";

export default async function AdminCampaignsPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();

  const [clientsRes, campaignsRes] = await Promise.all([
    admin.from("clients")
      .select("id, name, company, meta_ad_account_id, meta_access_token")
      .eq("status", "active")
      .order("created_at"),
    admin.from("campaigns")
      .select("*")
      .order("synced_at", { ascending: false }),
  ]);

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Campaigns</h1>
      <CampaignsClient
        clients={clientsRes.data ?? []}
        campaigns={campaignsRes.data ?? []}
      />
    </main>
  );
}
