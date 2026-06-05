import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ClientCampaignsPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("synced_at", { ascending: false });

  const list = campaigns ?? [];

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Campaigns</h1>

      {list.length === 0 ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-4">
          <p className="font-display text-2xl text-arqud-gold">Live data coming soon</p>
          <p className="text-arqud-bone text-sm max-w-md mx-auto">
            Your Meta Ads campaign performance will appear here once your Meta Business Manager
            access is connected to this portal.
          </p>
          <p className="text-xs text-arqud-muted">Campaigns launching soon</p>
          <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink mt-8">
            {["Leads", "Cost Per Lead", "Ad Spend", "Reach"].map((label) => (
              <div key={label} className="bg-arqud-night px-6 py-4">
                <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
                <p className="font-display text-2xl text-arqud-muted">—</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-px bg-arqud-ink border border-arqud-ink mb-6">
            {[
              { label: "Total Leads", value: list.reduce((s, c) => s + c.leads, 0).toLocaleString() },
              { label: "Avg CPL", value: `R ${(list.reduce((s, c) => s + c.cpl, 0) / list.length).toFixed(2)}` },
              { label: "Total Spend", value: `R ${list.reduce((s, c) => s + c.spend, 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
              { label: "Total Reach", value: list.reduce((s, c) => s + c.reach, 0).toLocaleString() },
              { label: "Active Campaigns", value: list.length.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-arqud-night px-6 py-4">
                <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
                <p className="font-display text-2xl text-arqud-bone">{value}</p>
              </div>
            ))}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arqud-ink">
                {["Campaign", "Leads", "CPL", "Spend", "Reach", "CTR", "Last Synced"].map((h) => (
                  <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                  <td className="py-3 pr-4 text-arqud-bone">{c.name}</td>
                  <td className="py-3 pr-4 text-arqud-bone">{c.leads.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-arqud-bone">R {Number(c.cpl).toFixed(2)}</td>
                  <td className="py-3 pr-4 text-arqud-bone">R {Number(c.spend).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 pr-4 text-arqud-bone">{c.reach.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-arqud-bone">{(Number(c.ctr) * 100).toFixed(2)}%</td>
                  <td className="py-3 pr-4 text-arqud-muted">{c.synced_at ? new Date(c.synced_at).toLocaleDateString("en-ZA") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
