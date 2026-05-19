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

  const recentInvoices = [...invoices].sort((a, b) => b.issue_date > a.issue_date ? 1 : -1).slice(0, 5);
  const clientMap: Record<string, string> = {};
  clients.forEach((c) => { clientMap[c.id] = c.company ?? c.name; });

  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const STATUS_DOT: Record<string, string> = {
    pending: "status-pending", paid: "status-paid", overdue: "status-overdue",
  };

  const monthName = now.toLocaleString("en-ZA", { month: "long" });

  return (
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{monthName} {now.getFullYear()}</p>
          <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>Overview</h1>
        </div>
        <Link href="/admin/clients/new"
          className="btn-gold animate-fade-up-2">
          + New Client
        </Link>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-4 gap-4 animate-fade-up-1">
        {[
          { label: `Invoiced ${monthName}`, value: fmt(invoicedThisMonth), sub: "this month", accent: false },
          { label: "Collected", value: fmt(collectedThisMonth), sub: "this month", accent: true, color: "#4ade80" },
          { label: "Outstanding", value: fmt(outstanding), sub: "all pending", accent: outstanding > 0, color: "var(--color-arqud-gold)" },
          { label: `YTD ${now.getFullYear()}`, value: fmt(ytd), sub: "total invoiced", accent: false },
        ].map(({ label, value, sub, accent, color }, i) => (
          <div key={label} className="card p-6" style={{ animationDelay: `${i * 0.06}s` }}>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-arqud-muted)" }}>{label}</p>
            <p className="stat-number text-3xl mb-1" style={{ color: accent && color ? color : "var(--color-arqud-gold)" }}>
              {value}
            </p>
            <p className="text-xs" style={{ color: "var(--color-arqud-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up-2">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-arqud-muted)" }}>Active Clients</p>
          <p className="stat-number text-5xl">{activeClients}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-arqud-muted)" }}>{clients.length} total</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-arqud-muted)" }}>Campaign Leads</p>
          {totalLeads > 0 ? (
            <>
              <p className="stat-number text-5xl">{totalLeads.toLocaleString()}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-arqud-muted)" }}>{fmt(totalSpend)} spend</p>
            </>
          ) : (
            <>
              <p className="stat-number text-5xl" style={{ color: "var(--color-arqud-muted)" }}>—</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-arqud-muted)" }}>Meta API connects 25 May</p>
            </>
          )}
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-arqud-muted)" }}>Invoices This Month</p>
          <p className="stat-number text-5xl">
            {invoices.filter((i) => i.issue_date >= monthStart).length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-arqud-muted)" }}>
            {invoices.filter((i) => i.issue_date >= yearStart).length} year to date
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 animate-fade-up-3">
        {/* Recent invoices */}
        <div className="col-span-2 card">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--color-arqud-ink)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>Recent Invoices</p>
            <Link href="/admin/finances" className="text-xs uppercase tracking-widest transition-colors duration-200"
              style={{ color: "var(--color-arqud-gold-dim)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-arqud-gold)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-arqud-gold-dim)"; }}>
              View all →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>No invoices yet</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.invoice_number}>
                    <td className="font-display italic text-arqud-gold">{inv.invoice_number}</td>
                    <td>{clientMap[inv.client_id] ?? "—"}</td>
                    <td>{fmt(inv.amount)}</td>
                    <td>{inv.due_date}</td>
                    <td>
                      <span className={`status-dot status-${inv.status}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Clients */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--color-arqud-ink)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>Clients</p>
            <Link href="/admin/clients" className="text-xs uppercase tracking-widest transition-colors duration-200"
              style={{ color: "var(--color-arqud-gold-dim)" }}>
              Manage →
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {clients.map((c) => (
              <Link key={c.id} href={`/admin/clients/${c.id}`}
                className="flex items-center justify-between p-3 rounded-sm transition-all duration-200 group"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(200,169,110,0.04)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{
                      background: "rgba(200,169,110,0.1)",
                      border: "1px solid rgba(200,169,110,0.2)",
                      color: "var(--color-arqud-gold)",
                    }}>
                    {(c.company ?? c.name).charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-arqud-bone leading-none">{c.company ?? c.name}</p>
                    <p className="text-xs mt-0.5 leading-none" style={{ color: "var(--color-arqud-muted)" }}>
                      {c.subdomain_slug}.arqudportal.co.za
                    </p>
                  </div>
                </div>
                <span className={`status-dot status-${c.status === "active" ? "paid" : "draft"} text-xs`}>
                  {c.status}
                </span>
              </Link>
            ))}
            <Link href="/admin/clients/new"
              className="flex items-center gap-2 p-3 text-xs uppercase tracking-widest transition-colors duration-200 mt-2"
              style={{
                color: "var(--color-arqud-muted)",
                borderTop: "1px dashed rgba(30,37,53,0.8)",
              }}>
              <span style={{ color: "var(--color-arqud-gold)" }}>+</span> Add Client
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
