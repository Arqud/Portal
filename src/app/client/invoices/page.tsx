import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { InvoiceWithItems } from "@/lib/invoices/types";

const STATUS: Record<string, string> = {
  pending: "text-arqud-gold border-arqud-gold",
  paid: "text-green-400 border-green-400",
  overdue: "text-red-400 border-red-400",
};

export default async function ClientInvoicesPage() {
  const { profile } = await verifySession("client");

  if (!profile.client_id) {
    return (
      <main className="min-h-screen px-8 py-16">
        <h1 className="text-5xl tracking-wide">Invoices</h1>
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

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Invoices</h1>
      {invoices.length === 0 ? (
        <p className="text-arqud-muted text-center py-16">No invoices yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-arqud-ink">
              {["Invoice #", "Issue Date", "Due Date", "Amount", "Status", "Download"].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                <td className="py-3 pr-4 text-arqud-bone">{inv.invoice_number}</td>
                <td className="py-3 pr-4 text-arqud-muted">{inv.issue_date}</td>
                <td className="py-3 pr-4 text-arqud-muted">{inv.due_date}</td>
                <td className="py-3 pr-4 text-arqud-bone">R {inv.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[inv.status] ?? ""}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="py-3">
                  <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">
                    Download PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
