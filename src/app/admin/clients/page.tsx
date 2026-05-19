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
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">
            {activeCount} active · {list.length} total
          </p>
          <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>
            Clients
          </h1>
        </div>
        <Link href="/admin/clients/new" className="btn-gold">+ Add Client</Link>
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No clients yet</p>
          <p className="text-arqud-muted text-sm">Add your first client to get started.</p>
          <Link href="/admin/clients/new" className="btn-gold inline-flex mt-2">+ Add Client</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((client) => {
            const stats = invoiceMap[client.id] ?? { total: 0, paid: 0, outstanding: 0 };
            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="card block p-6 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{
                        background: "rgba(200,169,110,0.1)",
                        border: "1px solid rgba(200,169,110,0.2)",
                        color: "var(--color-arqud-gold)",
                      }}
                    >
                      {(client.company ?? client.name).charAt(0)}
                    </div>
                    <div>
                      <p
                        className="font-display text-2xl text-arqud-gold group-hover:text-arqud-gold-soft transition-colors"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {client.company ?? client.name}
                      </p>
                      <p className="text-xs text-arqud-muted mt-0.5">
                        {client.name} · {client.email}
                      </p>
                    </div>
                  </div>
                  <span className={`status-dot status-${client.status === "active" ? "paid" : "draft"}`}>
                    {client.status}
                  </span>
                </div>

                <div
                  className="grid grid-cols-3 gap-6 mt-5 pt-5"
                  style={{ borderTop: "1px solid var(--color-arqud-ink)" }}
                >
                  {[
                    { label: "Total Invoiced", value: fmt(stats.total) },
                    { label: "Total Paid", value: fmt(stats.paid), color: "#4ade80" },
                    { label: "Outstanding", value: fmt(stats.outstanding), color: stats.outstanding > 0 ? "var(--color-arqud-gold)" : undefined },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{label}</p>
                      <p className="stat-number text-xl" style={color ? { color } : undefined}>{value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-arqud-muted mt-4">
                  {client.subdomain_slug}.arqudportal.co.za · Click to manage →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
