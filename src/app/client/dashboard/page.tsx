import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ClientDashboardPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [invoicesRes, campaignsRes, clientRes] = await Promise.all([
    admin.from("invoices").select("id, invoice_number, amount, status, due_date, issue_date")
      .eq("client_id", profile.client_id!).neq("status", "draft")
      .order("created_at", { ascending: false }),
    admin.from("campaigns").select("*").eq("client_id", profile.client_id!),
    admin.from("clients").select("company, name").eq("id", profile.client_id!).single(),
  ]);

  const invoices = invoicesRes.data ?? [];
  const campaigns = campaignsRes.data ?? [];
  const clientName = clientRes.data?.company ?? clientRes.data?.name ?? "";

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const latestInvoice = invoices[0];

  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  const monthName = now.toLocaleString("en-ZA", { month: "long" });

  const STATUS_COLOR: Record<string, string> = {
    pending: "var(--color-arqud-gold)",
    paid: "#4ade80",
    overdue: "#f87171",
  };

  return (
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-arqud-muted)" }}>
          {monthName} {now.getFullYear()}
        </p>
        <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
      </div>

      {/* Invoice KPIs */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up-1">
        {[
          { label: "Total Invoiced", value: fmt(totalInvoiced), color: "var(--color-arqud-gold)" },
          { label: "Total Paid", value: fmt(totalPaid), color: "#4ade80" },
          { label: "Outstanding", value: fmt(outstanding), color: outstanding > 0 ? "var(--color-arqud-gold)" : "var(--color-arqud-muted)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-6">
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-arqud-muted)" }}>{label}</p>
            <p className="stat-number text-3xl" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 animate-fade-up-2">
        {/* Latest invoice */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>Latest Invoice</p>
            <a href="/client/invoices" className="text-xs uppercase tracking-widest transition-colors duration-200"
              style={{ color: "var(--color-arqud-gold-dim)" }}>View all →</a>
          </div>
          {latestInvoice ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display italic text-2xl text-arqud-gold">{latestInvoice.invoice_number}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-arqud-muted)" }}>Due {latestInvoice.due_date}</p>
                </div>
                <span className="status-dot"
                  style={{ color: STATUS_COLOR[latestInvoice.status] ?? "var(--color-arqud-muted)" }}>
                  <span style={{
                    display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                    background: STATUS_COLOR[latestInvoice.status] ?? "var(--color-arqud-muted)",
                    boxShadow: `0 0 6px ${STATUS_COLOR[latestInvoice.status] ?? "transparent"}`,
                    marginRight: 6,
                  }} />
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
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>No invoices yet</p>
            </div>
          )}
        </div>

        {/* Campaign performance */}
        <div className="card p-6 space-y-5">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>
            Campaign Performance
          </p>
          {campaigns.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Leads", value: totalLeads.toLocaleString() },
                  { label: "Cost Per Lead", value: fmt(avgCpl) },
                  { label: "Ad Spend", value: fmt(totalSpend) },
                  { label: "Reach", value: campaigns.reduce((s, c) => s + c.reach, 0).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>{label}</p>
                    <p className="stat-number text-xl">{value}</p>
                  </div>
                ))}
              </div>
              <div className="gold-rule" />
              <a href="/client/campaigns" className="text-xs uppercase tracking-widest transition-colors duration-200"
                style={{ color: "var(--color-arqud-gold-dim)" }}>
                View campaigns →
              </a>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
              <div className="grid grid-cols-2 gap-4 w-full opacity-30">
                {["Leads", "Cost Per Lead", "Ad Spend", "Reach"].map((l) => (
                  <div key={l} className="space-y-1">
                    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-arqud-muted)" }}>{l}</p>
                    <p className="stat-number text-xl" style={{ color: "var(--color-arqud-muted)" }}>—</p>
                  </div>
                ))}
              </div>
              <div className="gold-rule w-full mt-4" />
              <p className="text-xs" style={{ color: "var(--color-arqud-muted)" }}>
                Live data connects when Meta Ads access is granted
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
