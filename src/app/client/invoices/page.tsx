import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { InvoiceWithItems } from "@/lib/invoices/types";
import { Card, KpiCard, PageHeader, Table, Tr, Td, Pill } from "@/components/ui";

// Button is a <button>; this mirrors its outline-sm classes for real <a> downloads (no asChild support).
const BTN_OUTLINE_SM = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-[11px] px-3.5 py-2 text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5";

const STATUS_TONE: Record<string, string> = {
  paid: "converted",
  pending: "contacted",
  overdue: "neutral",
};

export default async function ClientInvoicesPage() {
  const { profile } = await verifySession("client");

  if (!profile.client_id) {
    return (
      <main className="min-h-screen px-8 py-10 animate-fade-up">
        <PageHeader title="Invoices" />
        <Card>
          <p className="text-arqud-muted text-sm">No client account linked. Contact your agency.</p>
        </Card>
      </main>
    );
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("invoices")
    .select("*, client:clients(id,name,company,email,contact_person,address,reg_number,vat_number), line_items:invoice_line_items(*)")
    .eq("client_id", profile.client_id)
    .neq("status", "draft")
    .order("issue_date", { ascending: false });

  const invoices = (data ?? []) as InvoiceWithItems[];

  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <main className="min-h-screen px-8 py-10 space-y-8 animate-fade-up">
      <PageHeader title="Invoices" count={`${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`} />

      {invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5">
          <KpiCard label="Total Paid" value={fmt(totalPaid)} />
          <KpiCard label="Outstanding" value={fmt(outstanding)} />
        </div>
      )}

      {invoices.length === 0 ? (
        <Card>
          <div className="py-6 text-center space-y-3">
            <p className="font-display text-2xl text-arqud-gold">No invoices yet</p>
            <p className="text-arqud-muted text-sm">Your invoices will appear here once issued.</p>
          </div>
        </Card>
      ) : (
        <Table>
          <Tr header>
            <Td className="basis-[1fr] grow">Invoice #</Td>
            <Td className="basis-[0.9fr] grow">Issue Date</Td>
            <Td className="basis-[0.9fr] grow">Due Date</Td>
            <Td className="basis-[0.9fr] grow">Amount</Td>
            <Td className="basis-[0.8fr] grow">Status</Td>
            <Td className="basis-[0.7fr] grow text-right">Download</Td>
          </Tr>
          {invoices.map((inv) => (
            <Tr key={inv.id}>
              <Td className="basis-[1fr] grow font-display italic text-arqud-gold">{inv.invoice_number}</Td>
              <Td className="basis-[0.9fr] grow">{inv.issue_date}</Td>
              <Td className="basis-[0.9fr] grow">{inv.due_date}</Td>
              <Td className="basis-[0.9fr] grow text-arqud-bone">{fmt(inv.amount)}</Td>
              <Td className="basis-[0.8fr] grow">
                <Pill tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Pill>
              </Td>
              <Td className="basis-[0.7fr] grow text-right">
                <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE_SM}>
                  PDF →
                </a>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </main>
  );
}
