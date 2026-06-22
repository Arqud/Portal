import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Table, Tr, Td, Pill, Avatar } from "@/components/ui";

// Button is a <button>; this mirrors its primary classes for real <a> navigation (no asChild support).
const BTN_PRIMARY = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-xs px-[18px] py-[11px] text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft shadow-[0_8px_22px_rgba(200,169,110,0.28)] hover:-translate-y-px";

export default async function AdminClientsPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();

  const { data: clients } = await admin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const list = clients ?? [];

  const { data: invoices } = await admin
    .from("invoices")
    .select("client_id, amount, status")
    .neq("status", "draft");

  const invoiceMap: Record<string, { total: number; paid: number; outstanding: number }> = {};
  for (const inv of invoices ?? []) {
    if (!invoiceMap[inv.client_id]) invoiceMap[inv.client_id] = { total: 0, paid: 0, outstanding: 0 };
    invoiceMap[inv.client_id].total += inv.amount;
    if (inv.status === "paid") invoiceMap[inv.client_id].paid += inv.amount;
    if (inv.status === "pending" || inv.status === "overdue") invoiceMap[inv.client_id].outstanding += inv.amount;
  }

  const activeCount = list.filter((c) => c.status === "active").length;

  function fmt(n: number) {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  }

  return (
    <main className="min-h-screen px-8 py-10 animate-fade-up">
      <PageHeader title="Clients" count={`${activeCount} active · ${list.length} total`}>
        <Link href="/admin/clients/new" className={BTN_PRIMARY}>+ Add Client</Link>
      </PageHeader>

      {list.length === 0 ? (
        <Card>
          <div className="py-10 text-center space-y-3">
            <p className="font-display text-2xl text-arqud-gold">No clients yet</p>
            <p className="text-arqud-muted text-sm">Add your first client to get started.</p>
            <Link href="/admin/clients/new" className={`${BTN_PRIMARY} mt-2`}>+ Add Client</Link>
          </div>
        </Card>
      ) : (
        <Table>
          <Tr header>
            <Td className="basis-[1.6fr] grow">Client</Td>
            <Td className="basis-[1fr] grow">Subdomain</Td>
            <Td className="basis-[0.9fr] grow">Invoiced</Td>
            <Td className="basis-[0.9fr] grow">Outstanding</Td>
            <Td className="basis-[0.7fr] grow">Status</Td>
            <Td className="basis-[0.5fr] grow-0 shrink-0 text-right">Manage</Td>
          </Tr>

          {list.map((client) => {
            const stats = invoiceMap[client.id] ?? { total: 0, paid: 0, outstanding: 0 };
            return (
              <Tr key={client.id}>
                <Td className="basis-[1.6fr] grow">
                  <Link href={`/admin/clients/${client.id}`} className="flex items-center gap-2.5 text-arqud-bone hover:text-arqud-gold-soft transition-colors">
                    <Avatar initials={(client.company ?? client.name).charAt(0)} />
                    <div className="min-w-0">
                      <p className="font-display text-[14px] truncate leading-tight">{client.company ?? client.name}</p>
                      <p className="text-[11px] text-arqud-muted truncate leading-tight">{client.name} · {client.email}</p>
                    </div>
                  </Link>
                </Td>
                <Td className="basis-[1fr] grow text-arqud-muted text-[12px] truncate">
                  {client.subdomain_slug}.arqudportal.co.za
                </Td>
                <Td className="basis-[0.9fr] grow text-arqud-bone">{fmt(stats.total)}</Td>
                <Td className="basis-[0.9fr] grow">
                  <span className={stats.outstanding > 0 ? "text-arqud-gold-soft" : "text-arqud-bone"}>{fmt(stats.outstanding)}</span>
                </Td>
                <Td className="basis-[0.7fr] grow">
                  <Pill tone={client.status === "active" ? "converted" : "neutral"}>{client.status}</Pill>
                </Td>
                <Td className="basis-[0.5fr] grow-0 shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/admin/clients/${client.id}`} className="text-arqud-gold text-[12px] font-medium hover:underline">
                    Manage →
                  </Link>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}
    </main>
  );
}
