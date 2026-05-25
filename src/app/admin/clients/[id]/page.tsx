import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";
import { ClientDetailClient } from "./ClientDetailClient";
import { ClientDetailActions } from "./ClientDetailActions";
import { LeadsTab } from "./LeadsTab";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession("admin");
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: client } = await admin.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const [invoicesRes, quotesRes, reportsRes, docsRes, leadsRes] = await Promise.all([
    admin.from("invoices")
      .select("id, invoice_number, amount, status, issue_date, due_date")
      .eq("client_id", id).neq("status", "draft")
      .order("created_at", { ascending: false }),
    admin.from("quotes")
      .select("id, quote_number, total, status, issue_date")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    admin.from("reports")
      .select("*").eq("client_id", id)
      .order("created_at", { ascending: false }),
    admin.from("files")
      .select("*").eq("client_id", id)
      .order("uploaded_at", { ascending: false }),
    admin.from("leads")
      .select("*").eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const invoices = invoicesRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const reports = reportsRes.data ?? [];
  const documents = docsRes.data ?? [];
  const leads = leadsRes.data ?? [];

  // Generate signed URLs for reports and documents
  const reportUrls: Record<string, string> = {};
  const documentUrls: Record<string, string> = {};

  await Promise.all([
    ...reports.map(async (r) => {
      try { reportUrls[r.id] = await getSignedUrl(r.pdf_url); } catch { /* skip */ }
    }),
    ...documents.map(async (d) => {
      try { documentUrls[d.id] = await getSignedUrl(d.storage_path); } catch { /* skip */ }
    }),
  ]);

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  function fmt(n: number) {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  }

  const STATUS: Record<string, string> = {
    draft: "text-arqud-muted border-arqud-muted",
    pending: "text-arqud-gold border-arqud-gold",
    paid: "text-green-400 border-green-400",
    overdue: "text-red-400 border-red-400",
    sent: "text-arqud-gold border-arqud-gold",
    accepted: "text-green-400 border-green-400",
    rejected: "text-red-400 border-red-400",
  };

  return (
    <main className="min-h-screen px-8 py-12">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold">
          ← Clients
        </Link>
      </div>

      {/* Client header */}
      <ClientDetailActions client={client} />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-5xl tracking-wide">{client.company ?? client.name}</h1>
          <p className="text-arqud-muted mt-2">{client.name} · {client.email}</p>
          {client.address && <p className="text-xs text-arqud-muted mt-1">{client.address}</p>}
          {client.reg_number && <p className="text-xs text-arqud-muted">Reg: {client.reg_number}</p>}
          <p className="text-xs text-arqud-muted mt-1">
            Portal: <a href={`https://${client.subdomain_slug}.arqudportal.co.za`} target="_blank" rel="noopener noreferrer"
              className="text-arqud-gold hover:underline">{client.subdomain_slug}.arqudportal.co.za</a>
          </p>
        </div>
        <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${
          client.status === "active" ? "text-green-400 border-green-400" : "text-arqud-muted border-arqud-muted"
        }`}>{client.status}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-arqud-ink border border-arqud-ink mb-10">
        {[
          { label: "Total Invoiced", value: fmt(totalInvoiced), color: "text-arqud-bone" },
          { label: "Total Paid", value: fmt(totalPaid), color: "text-green-400" },
          { label: "Outstanding", value: fmt(outstanding), color: outstanding > 0 ? "text-arqud-gold" : "text-arqud-bone" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-arqud-night px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
            <p className={`font-display text-2xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Invoices */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-arqud-gold">Invoices</h2>
          <Link href="/admin/finances"
            className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold">
            + New Invoice →
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="text-arqud-muted text-sm py-4 border border-arqud-ink text-center">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arqud-ink">
                {["Invoice #", "Issue Date", "Due Date", "Amount", "Status", "PDF"].map((h) => (
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
                  <td className="py-3 pr-4 text-arqud-bone">{fmt(inv.amount)}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[inv.status] ?? ""}`}>{inv.status}</span>
                  </td>
                  <td className="py-3">
                    <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">PDF</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quotes */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-arqud-gold">Quotes</h2>
          <Link href="/admin/finances"
            className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold">
            + New Quote →
          </Link>
        </div>
        {quotes.length === 0 ? (
          <p className="text-arqud-muted text-sm py-4 border border-arqud-ink text-center">No quotes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arqud-ink">
                {["Quote #", "Date", "Total (excl. VAT)", "Status", "PDF"].map((h) => (
                  <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                  <td className="py-3 pr-4 text-arqud-bone">{q.quote_number}</td>
                  <td className="py-3 pr-4 text-arqud-muted">{q.issue_date}</td>
                  <td className="py-3 pr-4 text-arqud-bone">{fmt(q.total)}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[q.status] ?? ""}`}>{q.status}</span>
                  </td>
                  <td className="py-3">
                    <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">PDF</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Leads */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-arqud-gold">Leads</h2>
          <span className="text-xs uppercase tracking-widest text-arqud-muted">{leads.length} total</span>
        </div>
        <LeadsTab leads={leads} />
      </div>

      {/* Reports + Documents (interactive) */}
      <ClientDetailClient
        clientId={id}
        reports={reports}
        documents={documents}
        reportUrls={reportUrls}
        documentUrls={documentUrls}
      />
    </main>
  );
}
