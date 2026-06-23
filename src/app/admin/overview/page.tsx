import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, KpiCard, Card, Table, Tr, Td, Pill, Avatar } from "@/components/ui";

// Button is a <button>; this mirrors its primary classes for real <a> navigation (no asChild support).
const BTN_PRIMARY = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-xs px-[18px] py-[11px] text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft shadow-[0_8px_22px_rgba(200,169,110,0.28)] hover:-translate-y-px";

const STATUS_TONE: Record<string, string> = {
  paid: "converted",
  pending: "contacted",
  overdue: "danger",
};

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
  const invoicesThisMonth = invoices.filter((i) => i.issue_date >= monthStart).length;
  const invoicesYtd = invoices.filter((i) => i.issue_date >= yearStart).length;
  const clientMap: Record<string, string> = {};
  clients.forEach((c) => { clientMap[c.id] = c.company ?? c.name; });
  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  const monthName = now.toLocaleString("en-ZA", { month: "long" });

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-8 animate-fade-up">
      <PageHeader title="Overview" count={`${monthName} ${now.getFullYear()}`}>
        <Link href="/admin/clients/new" className={BTN_PRIMARY}>+ New Client</Link>
      </PageHeader>

      {/* Money KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label={`Invoiced ${monthName}`} value={fmt(invoicedThisMonth)} />
        <KpiCard label="Collected" value={fmt(collectedThisMonth)} />
        <KpiCard
          label="Outstanding"
          value={fmt(outstanding)}
          trend={outstanding > 0 ? { dir: "down", text: "needs follow-up" } : undefined}
        />
        <KpiCard label={`YTD ${now.getFullYear()}`} value={fmt(ytd)} />
      </div>

      {/* Count KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <KpiCard label="Active Clients" value={activeClients.toString()} trend={{ dir: "up", text: `${clients.length} total` }} />
        {totalLeads > 0 ? (
          <KpiCard label="Campaign Leads" value={totalLeads.toLocaleString()} trend={{ dir: "up", text: `${fmt(totalSpend)} spend` }} />
        ) : (
          <KpiCard label="Campaign Leads" value="—" trend={{ dir: "down", text: "Meta API connects 25 May" }} />
        )}
        <KpiCard label="Invoices This Month" value={invoicesThisMonth.toString()} trend={{ dir: "up", text: `${invoicesYtd} YTD` }} />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-3.5">
        {/* Recent invoices */}
        <Card title="Recent Invoices">
          <div className="flex justify-end -mt-9 mb-3">
            <Link href="/admin/finances" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
              View all →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">No invoices yet</p>
            </div>
          ) : (
            <Table>
              <Tr header>
                <Td className="basis-[1fr] grow">Invoice</Td>
                <Td className="basis-[1.1fr] grow">Client</Td>
                <Td className="basis-[0.9fr] grow">Amount</Td>
                <Td className="basis-[0.9fr] grow">Due</Td>
                <Td className="basis-[0.8fr] grow">Status</Td>
              </Tr>
              {recentInvoices.map((inv) => (
                <Tr key={inv.invoice_number}>
                  <Td className="basis-[1fr] grow font-display italic text-arqud-gold">{inv.invoice_number}</Td>
                  <Td className="basis-[1.1fr] grow">{clientMap[inv.client_id] ?? "—"}</Td>
                  <Td className="basis-[0.9fr] grow text-arqud-bone">{fmt(inv.amount)}</Td>
                  <Td className="basis-[0.9fr] grow">{inv.due_date}</Td>
                  <Td className="basis-[0.8fr] grow">
                    <Pill tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Pill>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>

        {/* Clients */}
        <Card title="Clients">
          <div className="flex justify-end -mt-9 mb-3">
            <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
              Manage →
            </Link>
          </div>
          <div className="space-y-0.5">
            {clients.map((c) => (
              <Link key={c.id} href={`/admin/clients/${c.id}`}
                className="flex items-center justify-between gap-2.5 py-2.5 border-t border-arqud-line/60 first:border-t-0 hover:bg-arqud-gold/[0.025] transition-colors -mx-1 px-1 rounded-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar initials={(c.company ?? c.name).charAt(0)} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-arqud-bone truncate leading-tight">{c.company ?? c.name}</p>
                    <p className="text-[11px] text-arqud-muted truncate leading-tight">{c.subdomain_slug}.arqudportal.co.za</p>
                  </div>
                </div>
                <Pill tone={c.status === "active" ? "converted" : "neutral"}>{c.status}</Pill>
              </Link>
            ))}
            <Link href="/admin/clients/new"
              className="flex items-center gap-2 py-3 text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-bone transition-colors border-t border-dashed border-arqud-line mt-1">
              <span className="text-arqud-gold">+</span> Add Client
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
