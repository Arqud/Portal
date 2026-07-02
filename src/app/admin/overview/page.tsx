import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Table, Tr, Td, Pill, Avatar, StatCard, AreaChart, Donut, ProgressTrack, TeaserTile } from "@/components/ui";
import { getBrand, BRAND_TONE, STATUS_TONE as LEAD_TONE } from "@/lib/leads/brand";
import { outstandingTotal, collectedYTD, revenueByMonth, cashflowYTD, pipeline, leadStats } from "@/lib/dashboard/metrics";

const BTN_PRIMARY =
  "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-xs px-[18px] py-[11px] text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft shadow-[0_8px_22px_rgba(200,169,110,0.28)] hover:-translate-y-px";

const INVOICE_TONE: Record<string, string> = { paid: "converted", pending: "contacted", overdue: "danger" };
const QUOTE_TONE: Record<string, string> = { accepted: "converted", sent: "contacted", draft: "neutral", rejected: "danger" };

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export default async function CommandCenterPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const now = new Date();

  const [clientsRes, invoicesRes, campaignsRes, quotesRes, leadsRes, txRes] = await Promise.all([
    admin.from("clients").select("id, company, name, status, subdomain_slug"),
    admin.from("invoices").select("client_id, amount, status, issue_date, paid_at, invoice_number, due_date").neq("status", "draft"),
    admin.from("campaigns").select("*"),
    admin.from("quotes").select("quote_number, total, status, client_id"),
    admin.from("leads").select("full_name, branch, meta_campaign_name, meta_ad_name, status, created_at").order("created_at", { ascending: false }),
    admin.from("transactions").select("amount, date"),
  ]);

  const clients = clientsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const campaigns = (campaignsRes.data ?? []) as Record<string, unknown>[];
  const quotes = quotesRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const transactions = txRes.data ?? [];

  const clientName = (id: string) => clients.find((c) => c.id === id)?.company ?? clients.find((c) => c.id === id)?.name ?? "—";

  // Metrics — money shown year-to-date so a fresh month never reads as empty.
  const collected = collectedYTD(invoices, now);
  const outstanding = outstandingTotal(invoices);
  const revenue = revenueByMonth(invoices, now, 7);
  const cash = cashflowYTD(transactions, now);
  const ls = leadStats(leads, now);
  const pipe = pipeline(quotes.map((q) => ({ quote_number: q.quote_number, total: q.total, status: q.status, client_label: clientName(q.client_id) })));
  const activeClients = clients.filter((c) => c.status === "active").length;

  const leadsByMonth: number[] = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const bucket = d.getFullYear() * 12 + d.getMonth();
    leadsByMonth.push(leads.filter((l) => { const x = new Date(l.created_at); return x.getFullYear() * 12 + x.getMonth() === bucket; }).length);
  }

  const outstandingByClient: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.status === "pending" || inv.status === "overdue") outstandingByClient[inv.client_id] = (outstandingByClient[inv.client_id] ?? 0) + inv.amount;
  }

  const recentLeads = leads.slice(0, 5);
  const year = now.getFullYear();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const fmt0 = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA")}`;
  const maxCampaignLeads = Math.max(1, ...campaigns.map((c) => Number(c.leads) || 0));

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-4 animate-fade-up">
      <PageHeader
        title={`${greeting}, Morne`}
        count={`${now.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} · ${invoices.filter((i) => i.status === "pending" || i.status === "overdue").length} awaiting payment`}
      >
        <Link href="/admin/clients/new" className={BTN_PRIMARY}>+ New</Link>
      </PageHeader>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard label={`Revenue · ${year}`} value={fmt0(collected)} trend={collected > 0 ? "collected YTD" : undefined} points={revenue.map((r) => r.collected)} />
        <StatCard label="Outstanding" value={fmt0(outstanding)} trend={outstanding > 0 ? "needs follow-up" : "all clear"} trendTone={outstanding > 0 ? "neg" : "pos"} />
        <StatCard label="New Leads · 30d" value={ls.d30.toString()} trend={`+${ls.week} this week`} points={leadsByMonth} />
        <StatCard label="Active Clients" value={activeClients.toString()} trend={`${clients.length} total`} />
        <StatCard label={`Net Profit · ${year}`} value={fmt0(cash.net)} trend={cash.income > 0 ? `${cash.marginPct}% margin` : "no data yet"} trendTone={cash.net >= 0 ? "pos" : "neg"} />
      </div>

      {/* Row 1: revenue chart + today teaser */}
      <div className="grid lg:grid-cols-[1.9fr_1fr] gap-3.5">
        <Card title="Revenue">
          <p className="-mt-1 mb-3 text-[11px] text-arqud-muted">Collected · last 7 months</p>
          {revenue.some((r) => r.collected > 0) ? (
            <>
              <AreaChart points={revenue.map((r) => r.collected)} className="h-[200px]" />
              <div className="mt-2 flex justify-between text-[10px] text-arqud-muted">
                {revenue.map((r, i) => <span key={i}>{r.label}</span>)}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs uppercase tracking-widest text-arqud-muted">No collected revenue recorded yet</div>
          )}
        </Card>
        <TeaserTile title="Today" note="Your daily agenda — tasks, deadlines and bookings — lands here in the next update (Tasks & Calendar)." />
      </div>

      {/* Row 2: pipeline + campaigns + cashflow */}
      <div className="grid lg:grid-cols-3 gap-3.5">
        <Card title="Sales Pipeline">
          <p className="-mt-1 mb-3 text-[11px] text-arqud-muted">{fmt0(pipe.open)} open</p>
          {pipe.deals.length === 0 ? (
            <div className="py-8 text-center text-xs uppercase tracking-widest text-arqud-muted">No quotes yet</div>
          ) : (
            <div className="space-y-2.5">
              {pipe.deals.map((d) => (
                <div key={d.quote_number} className="flex items-center gap-2.5 rounded-control border border-arqud-line px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] text-arqud-bone">{d.client_label}</p>
                    <p className="text-[10px] text-arqud-muted">{d.quote_number}</p>
                  </div>
                  <Pill tone={QUOTE_TONE[d.status] ?? "neutral"}>{d.status}</Pill>
                  <span className="ml-auto stat-number text-[14px]">{fmt0(d.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Campaign Leads">
          <p className="-mt-1 mb-3 text-[11px] text-arqud-muted">This month</p>
          {campaigns.length === 0 ? (
            <div className="py-8 text-center text-xs uppercase tracking-widest text-arqud-muted">Connects with Meta soon</div>
          ) : (
            <div className="space-y-3.5">
              {campaigns.slice(0, 3).map((c, i) => {
                const label = (c.name as string) ?? (c.campaign_name as string) ?? clientName(c.client_id as string);
                const leadsN = Number(c.leads) || 0;
                return (
                  <div key={i}>
                    <div className="mb-1.5 flex justify-between text-[12px] text-arqud-bone">
                      <span className="truncate">{label}</span>
                      <span className="stat-number">{leadsN}</span>
                    </div>
                    <ProgressTrack pct={(leadsN / maxCampaignLeads) * 100} />
                    <div className="mt-1.5 flex gap-4 text-[10px] text-arqud-muted">
                      <span>Spend {fmt0(Number(c.spend) || 0)}</span>
                      <span>CPL {fmt0(Number(c.cpl) || 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title={`Cashflow · ${year}`}>
          <p className="-mt-1 mb-3 text-[11px] text-arqud-muted">Income vs expenses (year to date)</p>
          {cash.income === 0 && cash.expenses === 0 ? (
            <div className="py-8 text-center text-xs uppercase tracking-widest text-arqud-muted">Import transactions to see cashflow</div>
          ) : (
            <div className="flex items-center gap-4">
              <Donut pct={cash.marginPct} label="MARGIN" />
              <div className="space-y-2 text-[12px]">
                <div className="text-arqud-bone-dim"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-arqud-green align-middle" />Income <span className="stat-number not-italic text-arqud-bone">{fmt0(cash.income)}</span></div>
                <div className="text-arqud-bone-dim"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-arqud-amber align-middle" />Expenses <span className="stat-number not-italic text-arqud-bone">{fmt0(cash.expenses)}</span></div>
                <div className="font-semibold text-arqud-gold">Net {fmt0(cash.net)}</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: live leads + clients */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-3.5">
        <Card title="Live Leads">
          <div className="flex justify-end -mt-9 mb-3">
            <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="py-10 text-center text-xs uppercase tracking-widest text-arqud-muted">No leads yet</div>
          ) : (
            <Table>
              <Tr header>
                <Td className="basis-[1fr] grow">Name</Td>
                <Td className="basis-[1.3fr] grow">Branch</Td>
                <Td className="basis-[0.9fr] grow">Brand</Td>
                <Td className="basis-[0.8fr] grow">Status</Td>
                <Td className="basis-[0.8fr] grow">When</Td>
              </Tr>
              {recentLeads.map((l, i) => {
                const brand = getBrand(l);
                return (
                  <Tr key={i}>
                    <Td className="basis-[1fr] grow text-arqud-bone">{l.full_name ?? "—"}</Td>
                    <Td className="basis-[1.3fr] grow text-arqud-muted">{l.branch ?? "—"}</Td>
                    <Td className="basis-[0.9fr] grow"><Pill tone={BRAND_TONE[brand] ?? "neutral"}>{brand}</Pill></Td>
                    <Td className="basis-[0.8fr] grow"><Pill tone={LEAD_TONE[l.status] ?? "neutral"}>{l.status}</Pill></Td>
                    <Td className="basis-[0.8fr] grow text-arqud-muted">{timeAgo(l.created_at)}</Td>
                  </Tr>
                );
              })}
            </Table>
          )}
        </Card>

        <Card title="Clients">
          <div className="flex justify-end -mt-9 mb-3">
            <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">Manage →</Link>
          </div>
          <div className="space-y-0.5">
            {clients.map((c) => {
              const owed = outstandingByClient[c.id] ?? 0;
              return (
                <Link key={c.id} href={`/admin/clients/${c.id}`}
                  className="flex items-center justify-between gap-2.5 py-2.5 border-t border-arqud-line/60 first:border-t-0 hover:bg-arqud-gold/[0.025] transition-colors -mx-1 px-1 rounded-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar initials={(c.company ?? c.name).charAt(0)} />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-arqud-bone truncate leading-tight">{c.company ?? c.name}</p>
                      <p className="text-[11px] text-arqud-muted truncate leading-tight">{c.subdomain_slug}.arqudportal.co.za</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="stat-number text-[13px]">{fmt0(owed)}</p>
                    <p className="text-[9.5px] text-arqud-muted">{owed > 0 ? "outstanding" : "settled"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </main>
  );
}
