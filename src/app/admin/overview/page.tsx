import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function OverviewPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

  const [clientsRes, invoicesRes, campaignsRes] = await Promise.all([
    admin.from("clients").select("id, company, name, status, subdomain_slug"),
    admin.from("invoices").select("client_id, amount, status, issue_date, paid_at, invoice_number, due_date").neq("status", "draft"),
    admin.from("campaigns").select("client_id, leads, spend, cpl, reach"),
  ]);

  const clients = clientsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const campaigns = campaignsRes.data ?? [];

  const activeClients = clients.filter((c) => c.status === "active").length;
  const invoicedThisMonth = invoices.filter((i) => i.issue_date >= monthStart).reduce((s, i) => s + i.amount, 0);
  const collectedThisMonth = invoices.filter((i) => i.status === "paid" && (i.paid_at ?? "") >= monthStart).reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const ytd = invoices.filter((i) => i.issue_date >= yearStart).reduce((s, i) => s + i.amount, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const activeCampaigns = campaigns.length;

  function fmt(n: number) {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  }

  // Recent invoices (last 5)
  const recentInvoices = [...invoices]
    .sort((a, b) => (b.issue_date > a.issue_date ? 1 : -1))
    .slice(0, 5);

  const clientMap: Record<string, string> = {};
  for (const c of clients) clientMap[c.id] = c.company ?? c.name;

  const STATUS: Record<string, string> = {
    pending: "text-arqud-gold border-arqud-gold",
    paid: "text-green-400 border-green-400",
    overdue: "text-red-400 border-red-400",
  };

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Overview</h1>

      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink mb-10">
        {[
          { label: "Active Clients", value: activeClients.toString(), color: "text-arqud-bone" },
          { label: "Invoiced This Month", value: fmt(invoicedThisMonth), color: "text-arqud-bone" },
          { label: "Collected This Month", value: fmt(collectedThisMonth), color: "text-green-400" },
          { label: "Outstanding", value: fmt(outstanding), color: outstanding > 0 ? "text-arqud-gold" : "text-arqud-bone" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-arqud-night px-6 py-6">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
            <p className={`font-display text-3xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-10">
        {/* Campaign stats */}
        <div className="border border-arqud-ink bg-arqud-night p-6">
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-4">Campaign Performance</p>
          {activeCampaigns === 0 ? (
            <div className="text-center py-6">
              <p className="font-display text-xl text-arqud-muted">No campaign data yet</p>
              <p className="text-xs text-arqud-muted mt-2">Meta API connects on 25 May</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Leads", value: totalLeads.toLocaleString() },
                { label: "Total Spend", value: fmt(totalSpend) },
                { label: "Active Campaigns", value: activeCampaigns.toString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{label}</p>
                  <p className="font-display text-2xl text-arqud-bone">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Year to date */}
        <div className="border border-arqud-ink bg-arqud-night p-6">
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-4">Year to Date</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">Total Invoiced {now.getFullYear()}</p>
              <p className="font-display text-3xl text-arqud-gold">{fmt(ytd)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-arqud-ink">
              <div>
                <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">Clients</p>
                <p className="font-display text-2xl text-arqud-bone">{activeClients}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">Invoices</p>
                <p className="font-display text-2xl text-arqud-bone">{invoices.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-arqud-gold">Recent Invoices</h2>
          <Link href="/admin/finances" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold">
            View all →
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="text-arqud-muted text-sm py-4 border border-arqud-ink text-center">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arqud-ink">
                {["Invoice #", "Client", "Amount", "Due", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.invoice_number} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                  <td className="py-3 pr-4 text-arqud-bone">{inv.invoice_number}</td>
                  <td className="py-3 pr-4 text-arqud-bone">{clientMap[inv.client_id] ?? "—"}</td>
                  <td className="py-3 pr-4 text-arqud-bone">{fmt(inv.amount)}</td>
                  <td className="py-3 pr-4 text-arqud-muted">{inv.due_date}</td>
                  <td className="py-3">
                    <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[inv.status] ?? ""}`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Client quick links */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-arqud-gold">Clients</h2>
          <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold">
            Manage all →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {clients.map((c) => (
            <Link key={c.id} href={`/admin/clients/${c.id}`}
              className="border border-arqud-ink bg-arqud-night p-4 hover:border-arqud-gold transition-colors">
              <p className="font-display text-lg text-arqud-gold">{c.company ?? c.name}</p>
              <p className="text-xs text-arqud-muted mt-1">{c.subdomain_slug}.arqudportal.co.za</p>
              <span className={`inline-block text-xs uppercase tracking-widest border px-2 py-0.5 mt-2 ${
                c.status === "active" ? "text-green-400 border-green-400" : "text-arqud-muted border-arqud-muted"
              }`}>{c.status}</span>
            </Link>
          ))}
          <Link href="/admin/clients/new"
            className="border border-dashed border-arqud-ink bg-arqud-night p-4 hover:border-arqud-gold transition-colors flex items-center justify-center">
            <p className="text-arqud-muted text-sm">+ Add Client</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
