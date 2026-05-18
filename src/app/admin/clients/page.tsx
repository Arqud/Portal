import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminClientsPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();

  const { data: clients } = await admin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const list = clients ?? [];

  // Get invoice totals per client
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

  function fmt(n: number) {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  }

  return (
    <main className="min-h-screen px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-5xl tracking-wide">Clients</h1>
        <Link href="/admin/clients/new"
          className="bg-arqud-gold px-6 py-2 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
          + Add Client
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center">
          <p className="font-display text-2xl text-arqud-gold mb-2">No clients yet</p>
          <p className="text-arqud-muted text-sm">Add your first client to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {list.map((client) => {
            const stats = invoiceMap[client.id] ?? { total: 0, paid: 0, outstanding: 0 };
            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`}
                className="block border border-arqud-ink bg-arqud-night p-6 hover:border-arqud-gold transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-2xl text-arqud-gold">{client.company ?? client.name}</p>
                    <p className="text-sm text-arqud-muted mt-1">{client.name} · {client.email}</p>
                    {client.address && <p className="text-xs text-arqud-muted mt-0.5">{client.address}</p>}
                  </div>
                  <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${
                    client.status === "active" ? "text-green-400 border-green-400" : "text-arqud-muted border-arqud-muted"
                  }`}>
                    {client.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-arqud-ink">
                  {[
                    { label: "Total Invoiced", value: fmt(stats.total) },
                    { label: "Total Paid", value: fmt(stats.paid), color: "text-green-400" },
                    { label: "Outstanding", value: fmt(stats.outstanding), color: stats.outstanding > 0 ? "text-arqud-gold" : undefined },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{label}</p>
                      <p className={`font-display text-xl ${color ?? "text-arqud-bone"}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-arqud-muted mt-3">
                  Portal: {client.subdomain_slug}.arqudportal.co.za · Click to manage →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
