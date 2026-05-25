import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadsClient } from "../leads/LeadsClient";

export default async function ClientDashboardPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const now = new Date();

  const [invoicesRes, campaignsRes, leadsRes] = await Promise.all([
    admin.from("invoices").select("id, invoice_number, amount, status, due_date, issue_date")
      .eq("client_id", profile.client_id!).neq("status", "draft")
      .order("created_at", { ascending: false }),
    admin.from("campaigns").select("*").eq("client_id", profile.client_id!),
    admin.from("leads").select("*").eq("client_id", profile.client_id!).order("created_at", { ascending: false }),
  ]);

  const invoices = invoicesRes.data ?? [];
  const campaigns = campaignsRes.data ?? [];
  const leads = leadsRes.data ?? [];

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const latestInvoice = invoices[0];
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  const leadsTotal = leads.length;
  const leadsContacted = leads.filter((l) => l.status === "contacted").length;
  const leadsConverted = leads.filter((l) => l.status === "converted").length;
  const leadsNew = leads.filter((l) => l.status === "new").length;
  const convRate = leadsTotal > 0 ? Math.round((leadsConverted / leadsTotal) * 100) : 0;

  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  const monthName = now.toLocaleString("en-ZA", { month: "long" });

  const STATUS_COLOR: Record<string, string> = {
    pending: "var(--color-arqud-gold)",
    paid: "#4ade80",
    overdue: "#f87171",
  };

  return (
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">
      <div>
        <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">
          {monthName} {now.getFullYear()}
        </p>
        <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
      </div>

      {/* Invoice KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Invoiced", value: fmt(totalInvoiced), color: "var(--color-arqud-gold)" },
          { label: "Total Paid", value: fmt(totalPaid), color: "#4ade80" },
          { label: "Outstanding", value: fmt(outstanding), color: outstanding > 0 ? "var(--color-arqud-gold)" : "var(--color-arqud-muted)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-6">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-4">{label}</p>
            <p className="stat-number text-3xl" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Latest invoice */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-arqud-muted">Latest Invoice</p>
            <a href="/client/invoices" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
              View all →
            </a>
          </div>
          {latestInvoice ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display italic text-2xl text-arqud-gold">{latestInvoice.invoice_number}</p>
                  <p className="text-xs mt-1 text-arqud-muted">Due {latestInvoice.due_date}</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest"
                  style={{ color: STATUS_COLOR[latestInvoice.status] ?? "var(--color-arqud-muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLOR[latestInvoice.status] ?? "var(--color-arqud-muted)" }} />
                  {latestInvoice.status}
                </span>
              </div>
              <div className="gold-rule" />
              <p className="stat-number text-4xl">{fmt(latestInvoice.amount)}</p>
              <a href={`/api/invoices/${latestInvoice.id}/pdf`} target="_blank" rel="noopener noreferrer"
                className="btn-gold text-xs">
                Download PDF
              </a>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">No invoices yet</p>
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div className="card p-6 space-y-5">
          <p className="text-xs uppercase tracking-widest text-arqud-muted">Campaign Performance</p>
          {campaigns.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Leads", value: totalLeads.toLocaleString() },
                  { label: "Cost Per Lead", value: fmt(avgCpl) },
                  { label: "Ad Spend", value: fmt(totalSpend) },
                  { label: "Reach", value: campaigns.reduce((s, c) => s + c.reach, 0).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{label}</p>
                    <p className="stat-number text-xl">{value}</p>
                  </div>
                ))}
              </div>
              <div className="gold-rule" />
              <a href="/client/campaigns" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
                View campaigns →
              </a>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
              <div className="grid grid-cols-2 gap-4 w-full opacity-30 pointer-events-none">
                {["Leads", "Cost Per Lead", "Ad Spend", "Reach"].map((l) => (
                  <div key={l}>
                    <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{l}</p>
                    <p className="stat-number text-xl text-arqud-muted">—</p>
                  </div>
                ))}
              </div>
              <div className="gold-rule w-full" />
              <p className="text-xs text-arqud-muted">Live data connects when Meta Ads access is granted</p>
            </div>
          )}
        </div>
      </div>

      {/* Leads CRM */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl font-normal">Leads</h2>
          {leadsTotal > 0 && (
            <p className="text-xs uppercase tracking-widest text-arqud-muted">{leadsTotal} total</p>
          )}
        </div>

        {leadsTotal > 0 ? (
          <>
            {/* Lead KPIs */}
            <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink">
              {[
                { label: "New", value: leadsNew.toString(), color: "var(--color-arqud-gold)" },
                { label: "Contacted", value: leadsContacted.toString(), color: "#60a5fa" },
                { label: "Converted", value: leadsConverted.toString(), color: "#4ade80" },
                { label: "Conversion Rate", value: `${convRate}%`, color: convRate > 0 ? "#4ade80" : "var(--color-arqud-muted)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-arqud-night px-6 py-5">
                  <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
                  <p className="font-display text-3xl" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Leads table */}
            <LeadsClient leads={leads} />
          </>
        ) : (
          <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-4">
            <p className="font-display text-2xl text-arqud-gold">Leads coming soon</p>
            <p className="text-arqud-bone text-sm max-w-md mx-auto">
              Once your Meta ads go live, every lead that fills in your form will appear here
              in real time — with their name, number, branch, and which ad they came from.
            </p>
            <p className="text-xs text-arqud-muted">Expected: 25 May 2026</p>
          </div>
        )}
      </div>
    </main>
  );
}
