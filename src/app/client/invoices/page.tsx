import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { InvoiceWithItems } from "@/lib/invoices/types";

const STATUS_DOT: Record<string, string> = {
  pending: "status-pending",
  paid: "status-paid",
  overdue: "status-overdue",
};

export default async function ClientInvoicesPage() {
  const { profile } = await verifySession("client");

  if (!profile.client_id) {
    return (
      <main className="min-h-screen px-8 py-10 animate-fade-up">
        <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>Invoices</h1>
        <p className="mt-4 text-arqud-muted">No client account linked. Contact your agency.</p>
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
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">
      <div>
        <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">
          {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
        </p>
        <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>
          Invoices
        </h1>
      </div>

      {invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-3">Total Paid</p>
            <p className="stat-number text-2xl" style={{ color: "#4ade80" }}>{fmt(totalPaid)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-3">Outstanding</p>
            <p className="stat-number text-2xl" style={{ color: outstanding > 0 ? "var(--color-arqud-gold)" : undefined }}>
              {fmt(outstanding)}
            </p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No invoices yet</p>
          <p className="text-arqud-muted text-sm">Your invoices will appear here once issued.</p>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-display italic text-arqud-gold">{inv.invoice_number}</td>
                  <td>{inv.issue_date}</td>
                  <td>{inv.due_date}</td>
                  <td>{fmt(inv.amount)}</td>
                  <td>
                    <span className={`status-dot ${STATUS_DOT[inv.status] ?? ""}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs uppercase tracking-widest text-arqud-gold hover:text-arqud-gold-soft transition-colors"
                    >
                      PDF →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
