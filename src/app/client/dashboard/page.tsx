import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadsClient } from "../leads/LeadsClient";
import { Card, KpiCard, Pill, AreaChart, Avatar } from "@/components/ui";
import { getBrand, BRAND_TONE, STATUS_TONE, initialsOf } from "@/lib/leads/brand";

// Button is a <button>; these mirror its visual classes for real <a> navigation (no asChild support).
const BTN_PRIMARY = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-xs px-[18px] py-[11px] text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft shadow-[0_8px_22px_rgba(200,169,110,0.28)] hover:-translate-y-px";
const BTN_OUTLINE_SM = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-[11px] px-3.5 py-2 text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5";

export default async function ClientDashboardPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const now = new Date();

  const [invoicesRes, campaignsRes, leadsRes] = await Promise.all([
    admin.from("invoices").select("id, invoice_number, amount, status, due_date, issue_date")
      .eq("client_id", profile.client_id!).neq("status", "draft")
      .order("created_at", { ascending: false }),
    admin.from("campaigns").select("*").eq("client_id", profile.client_id!),
    admin.from("leads").select("id,full_name,phone,email,branch,meta_campaign_name,meta_ad_name,status,notes,follow_up_date,created_at").eq("client_id", profile.client_id!).order("created_at", { ascending: false }),
  ]);

  const invoices = invoicesRes.data ?? [];
  const campaigns = campaignsRes.data ?? [];
  const leads = leadsRes.data ?? [];

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const latestInvoice = invoices[0];
  const totalCampaignLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const avgCpl = totalCampaignLeads > 0 ? totalSpend / totalCampaignLeads : 0;

  const leadsTotal = leads.length;
  const leadsContacted = leads.filter((l) => l.status === "contacted").length;
  const leadsConverted = leads.filter((l) => l.status === "converted").length;
  const leadsNew = leads.filter((l) => l.status === "new").length;
  const convRate = leadsTotal > 0 ? Math.round((leadsConverted / leadsTotal) * 100) : 0;

  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  const monthName = now.toLocaleString("en-ZA", { month: "long" });
  const firstName = (profile.full_name ?? "there").split(" ")[0];

  // Real daily lead counts for the current month — derived from the leads already fetched above.
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyCounts = new Array(daysInMonth).fill(0);
  for (const l of leads) {
    const d = new Date(l.created_at);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      dailyCounts[d.getDate() - 1] += 1;
    }
  }
  const leadsThisMonth = dailyCounts.reduce((s, n) => s + n, 0);
  const hasMonthlyTrend = leadsThisMonth > 0;

  const latestLeads = leads.slice(0, 5);

  const STATUS_COLOR: Record<string, string> = {
    pending: "var(--color-arqud-gold)",
    paid: "#4ade80",
    overdue: "#f87171",
  };

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-8 animate-fade-up">
      {/* Greeting header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">
            {monthName} {now.getFullYear()}
          </p>
          <h1 className="font-display text-arqud-bone text-[28px] sm:text-[32px] font-normal" style={{ letterSpacing: "-0.01em" }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-arqud-muted text-[12.5px] mt-1.5">Here&apos;s how your campaigns are performing today.</p>
        </div>
        <a href="/client/leads" className={BTN_PRIMARY}>View Leads →</a>
      </div>

      {/* Lead KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Total Leads" value={leadsTotal.toString()} trend={leadsNew > 0 ? { dir: "up", text: `${leadsNew} new` } : undefined} />
        <KpiCard label="Contacted" value={leadsContacted.toString()} />
        <KpiCard label="Converted" value={leadsConverted.toString()} trend={leadsConverted > 0 ? { dir: "up", text: `${convRate}% conversion` } : undefined} />
        <KpiCard label="Cost / Lead" value={totalCampaignLeads > 0 ? fmt(avgCpl) : "—"} />
      </div>

      {/* Chart + Latest leads */}
      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-3.5">
        <Card title="Leads this month" caption={`All campaigns combined · ${monthName} ${now.getFullYear()}`}>
          {hasMonthlyTrend ? (
            <AreaChart points={dailyCounts} />
          ) : (
            <div className="py-10 text-center">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">No leads yet this month</p>
            </div>
          )}
        </Card>

        <Card title="Latest leads" caption="Live from your ads">
          {latestLeads.length > 0 ? (
            <div className="space-y-0.5">
              {latestLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-2.5 py-2.5 border-t border-arqud-line/60 first:border-t-0">
                  <Avatar initials={initialsOf(lead.full_name)} />
                  <span className="text-[12.5px] text-arqud-bone truncate flex-1 min-w-0">{lead.full_name ?? "Unnamed lead"}</span>
                  <Pill tone={BRAND_TONE[getBrand(lead)]}>{getBrand(lead)}</Pill>
                  <Pill tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</Pill>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">No leads yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* Billing snapshot */}
      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-3.5">
        <Card title="Latest Invoice" caption={latestInvoice ? `Due ${latestInvoice.due_date}` : undefined}>
          {latestInvoice ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <p className="font-display italic text-2xl text-arqud-gold">{latestInvoice.invoice_number}</p>
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest"
                  style={{ color: STATUS_COLOR[latestInvoice.status] ?? "var(--color-arqud-muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLOR[latestInvoice.status] ?? "var(--color-arqud-muted)" }} />
                  {latestInvoice.status}
                </span>
              </div>
              <p className="stat-number text-3xl">{fmt(latestInvoice.amount)}</p>
              <div className="flex items-center gap-4 pt-1">
                <a href={`/api/invoices/${latestInvoice.id}/pdf`} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE_SM}>
                  Download PDF
                </a>
                <a href="/client/invoices" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
                  View all →
                </a>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">No invoices yet</p>
            </div>
          )}
        </Card>

        <Card title="Billing Summary">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] tracking-[0.14em] uppercase text-arqud-muted mb-1.5">Invoiced</p>
              <p className="stat-number text-xl text-arqud-gold">{fmt(totalInvoiced)}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.14em] uppercase text-arqud-muted mb-1.5">Paid</p>
              <p className="stat-number text-xl text-arqud-green">{fmt(totalPaid)}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.14em] uppercase text-arqud-muted mb-1.5">Outstanding</p>
              <p className="stat-number text-xl" style={{ color: outstanding > 0 ? "var(--color-arqud-gold)" : "var(--color-arqud-muted)" }}>{fmt(outstanding)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Leads CRM */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-arqud-bone text-2xl font-normal">Leads</h2>
          {leadsTotal > 0 && (
            <p className="text-xs uppercase tracking-widest text-arqud-muted">{leadsTotal} total</p>
          )}
        </div>

        {leadsTotal > 0 ? (
          <LeadsClient leads={leads} />
        ) : (
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
        )}
      </div>
    </main>
  );
}
