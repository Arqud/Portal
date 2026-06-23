import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadsClient } from "./LeadsClient";
import { PageHeader, Card } from "@/components/ui";

export default async function ClientLeadsPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: leads } = await admin
    .from("leads")
    .select("id,full_name,phone,email,branch,meta_campaign_name,meta_ad_name,status,notes,follow_up_date,created_at")
    .eq("client_id", profile.client_id!)
    .order("created_at", { ascending: false });

  const list = leads ?? [];
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
              <p className="text-xs text-arqud-muted">Expected: 25 May 2026</p>
            </div>
          </Card>
        </>
      ) : (
        <LeadsClient leads={list} total={total} />
      )}
    </main>
  );
}
