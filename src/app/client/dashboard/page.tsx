import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ClientDashboardPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  // Latest invoice
  const { data: latestInvoice } = await admin
    .from("invoices")
    .select("invoice_number, amount, status, due_date, issue_date")
    .eq("client_id", profile.client_id!)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Invoice stats
  const { data: invoices } = await admin
    .from("invoices")
    .select("amount, status")
    .eq("client_id", profile.client_id!)
    .neq("status", "draft");

  const totalInvoiced = (invoices ?? []).reduce((s, i) => s + i.amount, 0);
  const totalPaid = (invoices ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = (invoices ?? []).filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const statusColor: Record<string, string> = {
    pending: "text-arqud-gold border-arqud-gold",
    paid: "text-green-400 border-green-400",
    overdue: "text-red-400 border-red-400",
  };

  function fmt(n: number) {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  }

  return (
    <main className="min-h-screen px-8 py-12 space-y-10">
      <h1 className="text-5xl tracking-wide">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink">
        {[
          { label: "Total Invoiced", value: fmt(totalInvoiced), color: "text-arqud-bone" },
          { label: "Total Paid", value: fmt(totalPaid), color: "text-green-400" },
          { label: "Outstanding", value: fmt(outstanding), color: "text-arqud-gold" },
          { label: "Active Campaigns", value: "—", sub: "Coming 25 May", color: "text-arqud-muted" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-arqud-night px-6 py-6">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
            <p className={`font-display text-3xl ${color}`}>{value}</p>
            {sub && <p className="text-xs text-arqud-muted mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Latest invoice */}
        <div className="border border-arqud-ink bg-arqud-night p-6">
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-4">Latest Invoice</p>
          {latestInvoice ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-arqud-gold font-display text-xl">{latestInvoice.invoice_number}</p>
                <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${statusColor[latestInvoice.status] ?? ""}`}>
                  {latestInvoice.status}
                </span>
              </div>
              <p className="text-2xl text-arqud-bone">{fmt(latestInvoice.amount)}</p>
              <p className="text-sm text-arqud-muted">
                Issued: {latestInvoice.issue_date} · Due: {latestInvoice.due_date}
              </p>
              <a href="/client/invoices"
                className="inline-block text-xs uppercase tracking-widest text-arqud-gold hover:text-arqud-gold-soft mt-2">
                View all invoices →
              </a>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-arqud-muted text-sm">No invoices yet.</p>
              <p className="text-xs text-arqud-muted mt-1">Your first invoice will appear here.</p>
            </div>
          )}
        </div>

        {/* Campaigns preview */}
        <div className="border border-arqud-ink bg-arqud-night p-6">
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-4">Campaign Performance</p>
          <div className="py-6 text-center space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Leads This Month", value: "—" },
                { label: "Cost Per Lead", value: "—" },
                { label: "Ad Spend", value: "—" },
                { label: "Reach", value: "—" },
              ].map(({ label, value }) => (
                <div key={label} className="border border-arqud-ink/50 p-3">
                  <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{label}</p>
                  <p className="font-display text-2xl text-arqud-muted">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-arqud-muted pt-2">
              Live data connects when Meta Business Manager access is granted.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
