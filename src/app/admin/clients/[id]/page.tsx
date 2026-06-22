import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";
import { ClientDetailClient } from "./ClientDetailClient";
import { ClientDetailActions } from "./ClientDetailActions";
import { PageHeader, Card, KpiCard, Pill } from "@/components/ui";

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

  return (
    <main className="min-h-screen px-8 py-10 space-y-5 animate-fade-up">
      {/* Breadcrumb */}
      <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
        ← Clients
      </Link>

      {/* Client header */}
      <PageHeader title={client.company ?? client.name}>
        <Pill tone={client.status === "active" ? "converted" : "neutral"}>{client.status}</Pill>
        <ClientDetailActions client={client} />
      </PageHeader>

      <Card>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="text-arqud-bone">{client.name}</span>
          <span className="text-arqud-muted">·</span>
          <span className="text-arqud-muted">{client.email}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-arqud-muted mt-2">
          {client.address && <span>{client.address}</span>}
          {client.reg_number && <span>Reg: {client.reg_number}</span>}
          <span>
            Portal: <a href={`https://${client.subdomain_slug}.arqudportal.co.za`} target="_blank" rel="noopener noreferrer"
              className="text-arqud-gold hover:underline">{client.subdomain_slug}.arqudportal.co.za</a>
          </span>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3.5">
        <KpiCard label="Total Invoiced" value={fmt(totalInvoiced)} />
        <KpiCard label="Total Paid" value={fmt(totalPaid)} />
        <KpiCard label="Outstanding" value={fmt(outstanding)} trend={outstanding > 0 ? { dir: "down", text: "needs follow-up" } : undefined} />
      </div>

      {/* Tabs: Invoices / Quotes / Leads / Reports / Documents */}
      <ClientDetailClient
        clientId={id}
        invoices={invoices}
        quotes={quotes}
        leads={leads}
        reports={reports}
        documents={documents}
        reportUrls={reportUrls}
        documentUrls={documentUrls}
      />
    </main>
  );
}
