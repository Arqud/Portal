import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { partitionFranchise } from "@/lib/leads/franchise";
import { canViewFranchise } from "@/lib/auth/access";
import { FranchiseLeadsClient } from "./FranchiseLeadsClient";
import { PageHeader, Card } from "@/components/ui";

export default async function ClientFranchiseLeadsPage() {
  const { profile } = await verifySession("client");

  // Access gate: only Arno (full client account, brand null) and Marissa (brand
  // 'Franchise') may see franchise leads. Any wash-staff brand (We Wash / Sparkling)
  // is redirected to their own Leads page — they must never see investor enquiries.
  if (!canViewFranchise(profile.brand)) redirect("/client/leads");

  const admin = createSupabaseAdminClient();
  const { data: leads } = await admin
    .from("leads")
    .select(
      "id,full_name,phone,email,branch,preferred_time,meta_campaign_name,meta_ad_name,meta_form_id,form_answers,status,notes,follow_up_date,created_at",
    )
    .eq("client_id", profile.client_id!)
    .order("created_at", { ascending: false });

  // Keep ONLY franchise-recruitment leads (the inverse of every wash surface).
  const franchise = partitionFranchise(leads ?? []).franchise;
  const total = franchise.length;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10">
      {franchise.length === 0 ? (
        <>
          <PageHeader title="Sparkling Franchise Leads" />
          <Card>
            <div className="py-6 text-center space-y-4">
              <p className="font-display text-2xl text-arqud-gold">Franchise leads coming soon</p>
              <p className="text-arqud-bone-dim text-sm max-w-md mx-auto">
                Once the Sparkling Franchise campaign goes live, every investor enquiry will appear here —
                with their capital band, timeline, funds and preferred area, kept completely separate from
                the car-wash leads.
              </p>
              <p className="text-xs text-arqud-muted">Live the moment the franchise ad is approved.</p>
            </div>
          </Card>
        </>
      ) : (
        <FranchiseLeadsClient leads={franchise} total={total} />
      )}
    </main>
  );
}
