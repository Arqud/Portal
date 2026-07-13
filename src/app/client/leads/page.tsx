import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadsClient } from "./LeadsClient";
import { PageHeader, Card } from "@/components/ui";
import { getBrand } from "@/lib/leads/brand";

export default async function ClientLeadsPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: leads } = await admin
    .from("leads")
    .select("id,full_name,phone,email,branch,preferred_time,meta_campaign_name,meta_ad_name,status,notes,follow_up_date,created_at")
    .eq("client_id", profile.client_id!)
    .order("created_at", { ascending: false });

  // Brand-scoped staff (profile.brand set) only ever receive their own brand's
  // leads — filtered here on the server so other-brand leads never reach them.
  const all = leads ?? [];
  const list = profile.brand ? all.filter((l) => getBrand(l) === profile.brand) : all;
  const total = list.length;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10">
      {list.length === 0 ? (
        <>
          <PageHeader title="Leads" />
          <Card>
            <div className="py-6 text-center space-y-4">
              <p className="font-display text-2xl text-arqud-gold">Leads coming soon</p>
              <p className="text-arqud-bone-dim text-sm max-w-md mx-auto">
                Once your Meta ads go live, every lead that fills in your form will appear here
                in real time — with their name, number, branch, and which ad they came from.
              </p>
              <p className="text-xs text-arqud-muted">Live the moment your ads are approved.</p>
            </div>
          </Card>
        </>
      ) : (
        <LeadsClient leads={list} total={total} />
      )}
    </main>
  );
}
