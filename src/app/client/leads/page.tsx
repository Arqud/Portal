import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadsClient } from "./LeadsClient";

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
  const contacted = list.filter((l) => l.status === "contacted").length;
  const converted = list.filter((l) => l.status === "converted").length;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  return (
    <main className="min-h-screen px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-5xl tracking-wide">Leads</h1>
        {list.length > 0 && (
          <p className="text-xs uppercase tracking-widest text-arqud-muted">
            {total} total
          </p>
        )}
      </div>

      {/* KPI strip */}
      {list.length > 0 && (
        <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink mb-10">
          {[
            { label: "Total Leads", value: total.toString() },
            { label: "Contacted", value: contacted.toString() },
            { label: "Converted", value: converted.toString() },
            { label: "Conversion Rate", value: `${convRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-arqud-night px-6 py-5">
              <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
              <p className="font-display text-3xl text-arqud-bone">{value}</p>
            </div>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-4">
          <p className="font-display text-2xl text-arqud-gold">Leads coming soon</p>
          <p className="text-arqud-bone text-sm max-w-md mx-auto">
            Once your Meta ads go live, every lead that fills in your form will appear here
            in real time — with their name, number, branch, and which ad they came from.
          </p>
          <p className="text-xs text-arqud-muted">Expected: 25 May 2026</p>
        </div>
      ) : (
        <LeadsClient leads={list} />
      )}
    </main>
  );
}
