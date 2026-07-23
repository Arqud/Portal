import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Table, Tr, Td, Pill, Avatar, StatCard } from "@/components/ui";
import { businessKey } from "@/lib/business/persist";

// SA Equipment's own home — an operational overview scoped to SA Equipment records
// only. The BOOKS stay one company (that's Finances); this is where the dealer side
// is worked. Uses select("*") + a JS business filter (migration-agnostic, same idiom
// as FinancesClient) so ARQUD-tagged/untagged rows never leak in.

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-control px-[18px] py-[11px] text-xs font-semibold tracking-wide bg-[#F5B301] text-[#0E1116] shadow-[0_8px_22px_rgba(245,179,1,0.28)] transition-all hover:-translate-y-px hover:brightness-105";
const BTN_GHOST =
  "inline-flex items-center gap-2 rounded-control px-[16px] py-[11px] text-xs font-semibold tracking-wide border border-arqud-gold/40 text-arqud-gold hover:bg-arqud-gold/[0.06] transition-colors";

const INVOICE_TONE: Record<string, string> = { paid: "converted", pending: "contacted", overdue: "danger", draft: "neutral" };
const QUOTE_TONE: Record<string, string> = { accepted: "converted", sent: "contacted", draft: "neutral", rejected: "danger" };

function fmt0(n: number) {
  return `R ${Math.round(n).toLocaleString("en-ZA")}`;
}

type Row = { business?: string | null };
const isSae = (r: Row) => businessKey(r.business) === "sa_equipment";

export async function SaeOverview() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const year = now.getFullYear();

  const [clientsRes, invoicesRes, quotesRes] = await Promise.all([
    admin.from("clients").select("*").order("created_at", { ascending: false }),
    admin.from("invoices").select("*"),
    admin.from("quotes").select("*"),
  ]);

  const clients = (clientsRes.data ?? []).filter(isSae);
  const invoices = (invoicesRes.data ?? []).filter(isSae);
  const quotes = (quotesRes.data ?? []).filter(isSae);

  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c?.company ?? c?.name ?? "—";
  };

  const activeClients = clients.filter((c) => c.status === "active").length;

  const openQuotes = quotes.filter((q) => q.status === "draft" || q.status === "sent");
  const pipelineValue = openQuotes.reduce((s, q) => s + Number(q.total ?? 0), 0);

  const invoicedYTD = invoices
    .filter((i) => i.status !== "draft" && String(i.issue_date ?? "").startsWith(String(year)))
    .reduce((s, i) => s + Number(i.amount ?? 0), 0);

  const outstanding = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.amount ?? 0), 0);

  const outstandingByClient: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.status === "pending" || inv.status === "overdue") {
      outstandingByClient[inv.client_id] = (outstandingByClient[inv.client_id] ?? 0) + Number(inv.amount ?? 0);
    }
  }

  const byCreated = (a: { created_at?: string }, b: { created_at?: string }) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  const recentQuotes = [...quotes].sort(byCreated).slice(0, 5);
  const recentInvoices = [...invoices].sort(byCreated).slice(0, 5);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // ---- First-run welcome: no customers yet ----
  if (clients.length === 0) {
    return (
      <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
        <PageHeader title="SA Equipment" count="Machinery dealer" />
        <Card className="mx-auto max-w-2xl">
          <div className="py-10 text-center space-y-4">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-[14px] bg-[#0E1116] text-[#F5B301] text-lg font-bold tracking-tight">
              SA
            </span>
            <div className="space-y-1.5">
              <p className="font-display text-2xl text-arqud-bone">Welcome to your SA Equipment home</p>
              <p className="mx-auto max-w-md text-sm text-arqud-bone-dim">
                This is the dealer workspace — its own customers, quotes and invoices, all on one company&apos;s books.
                Start by adding your first customer, then raise a quote or an invoice.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Link href="/admin/clients/new?business=sa_equipment" className={BTN_PRIMARY}>+ Add your first customer</Link>
              <Link href="/admin/finances" className={BTN_GHOST}>Go to Finances</Link>
            </div>
            <div className="mx-auto flex max-w-md flex-col gap-2 pt-4 text-left text-[12.5px] text-arqud-bone-dim">
              <span className="flex items-center gap-2"><span className="text-arqud-gold">1.</span> Add a customer (tagged SA Equipment)</span>
              <span className="flex items-center gap-2"><span className="text-arqud-gold">2.</span> Raise a quote — it prints on the SA Equipment document</span>
              <span className="flex items-center gap-2"><span className="text-arqud-gold">3.</span> Convert it to an invoice when they say yes</span>
            </div>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-4 animate-fade-up">
      <PageHeader
        title={`${greeting}, Morne`}
        count={`SA Equipment · ${clients.length} customer${clients.length === 1 ? "" : "s"}`}
      >
        <Link href="/admin/finances" className={BTN_GHOST}>Finances</Link>
        <Link href="/admin/clients/new?business=sa_equipment" className={BTN_PRIMARY}>+ Add Customer</Link>
      </PageHeader>

      {/* KPI strip — SA Equipment only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Customers" value={String(clients.length)} trend={`${activeClients} active`} />
        <StatCard label="Open Quotes" value={String(openQuotes.length)} trend={pipelineValue > 0 ? `${fmt0(pipelineValue)} in pipeline` : "no open value"} />
        <StatCard label={`Invoiced · ${year}`} value={fmt0(invoicedYTD)} trend={invoicedYTD > 0 ? "sent this year" : undefined} />
        <StatCard label="Outstanding" value={fmt0(outstanding)} trend={outstanding > 0 ? "needs follow-up" : "all clear"} trendTone={outstanding > 0 ? "neg" : "pos"} />
      </div>

      {/* Recent quotes + invoices */}
      <div className="grid lg:grid-cols-2 gap-3.5">
        <Card title="Recent Quotes">
          <div className="-mt-9 mb-3 flex justify-end">
            <Link href="/admin/finances" className="text-xs uppercase tracking-widest text-arqud-muted transition-colors hover:text-arqud-gold">View all →</Link>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="py-8 text-center text-xs uppercase tracking-widest text-arqud-muted">No quotes yet</div>
          ) : (
            <Table>
              <Tr header>
                <Td className="basis-[1fr] grow">Quote #</Td>
                <Td className="basis-[1.4fr] grow">Customer</Td>
                <Td className="basis-[1fr] grow">Total</Td>
                <Td className="basis-[0.8fr] grow">Status</Td>
              </Tr>
              {recentQuotes.map((q) => (
                <Tr key={q.id}>
                  <Td className="basis-[1fr] grow text-arqud-gold">{q.quote_number}</Td>
                  <Td className="basis-[1.4fr] grow text-arqud-bone">{clientName(q.client_id)}</Td>
                  <Td className="basis-[1fr] grow text-arqud-bone">{fmt0(Number(q.total ?? 0))}</Td>
                  <Td className="basis-[0.8fr] grow"><Pill tone={QUOTE_TONE[q.status] ?? "neutral"}>{q.status}</Pill></Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Recent Invoices">
          <div className="-mt-9 mb-3 flex justify-end">
            <Link href="/admin/finances" className="text-xs uppercase tracking-widest text-arqud-muted transition-colors hover:text-arqud-gold">View all →</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="py-8 text-center text-xs uppercase tracking-widest text-arqud-muted">No invoices yet</div>
          ) : (
            <Table>
              <Tr header>
                <Td className="basis-[1fr] grow">Invoice #</Td>
                <Td className="basis-[1.4fr] grow">Customer</Td>
                <Td className="basis-[1fr] grow">Amount</Td>
                <Td className="basis-[0.8fr] grow">Status</Td>
              </Tr>
              {recentInvoices.map((inv) => (
                <Tr key={inv.id}>
                  <Td className="basis-[1fr] grow text-arqud-gold">{inv.invoice_number}</Td>
                  <Td className="basis-[1.4fr] grow text-arqud-bone">{clientName(inv.client_id)}</Td>
                  <Td className="basis-[1fr] grow text-arqud-bone">{fmt0(Number(inv.amount ?? 0))}</Td>
                  <Td className="basis-[0.8fr] grow"><Pill tone={INVOICE_TONE[inv.status] ?? "neutral"}>{inv.status}</Pill></Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {/* Customers */}
      <Card title="Customers">
        <div className="-mt-9 mb-3 flex justify-end">
          <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted transition-colors hover:text-arqud-gold">Manage →</Link>
        </div>
        <div className="space-y-0.5">
          {clients.map((c) => {
            const owed = outstandingByClient[c.id] ?? 0;
            return (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="-mx-1 flex items-center justify-between gap-2.5 rounded-sm border-t border-arqud-line/60 px-1 py-2.5 transition-colors first:border-t-0 hover:bg-arqud-gold/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar initials={(c.company ?? c.name).charAt(0)} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium leading-tight text-arqud-bone">{c.company ?? c.name}</p>
                    <p className="truncate text-[11px] leading-tight text-arqud-muted">{c.name}{c.email ? ` · ${c.email}` : ""}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="stat-number text-[13px]">{fmt0(owed)}</p>
                  <p className="text-[9.5px] text-arqud-muted">{owed > 0 ? "outstanding" : "settled"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
