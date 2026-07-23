import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";
import { ClientDetailClient } from "./ClientDetailClient";
import { ClientDetailActions } from "./ClientDetailActions";
import { PageHeader, Card, KpiCard, Pill } from "@/components/ui";
import { partitionFranchise } from "@/lib/leads/franchise";
import type { Client, InvoiceWithItems, QuoteWithItems } from "@/lib/invoices/types";

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

  const [invoicesRes, quotesRes, reportsRes, docsRes, leadsRes, tasksRes] = await Promise.all([
    admin.from("invoices")
      .select("*, client:clients(id,name,company,email,phone,contact_person,address,reg_number,vat_number), line_items:invoice_line_items(*)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    admin.from("quotes")
      .select("*, client:clients(id,name,company,email,phone,contact_person,address,reg_number,vat_number), line_items:quote_line_items(*)")
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
    admin.from("tasks")
      .select("*").eq("client_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  const invoices = (invoicesRes.data ?? []) as InvoiceWithItems[];
  const quotes = (quotesRes.data ?? []) as QuoteWithItems[];
  const reports = reportsRes.data ?? [];
  const documents = docsRes.data ?? [];
  // Franchise-recruitment leads are shown on the dedicated franchise page, never the
  // wash CRM tab — exclude them here so this client's lead counts match "main excludes
  // franchise".
  const leads = partitionFranchise(leadsRes.data ?? []).wash;
  const tasks = tasksRes.data ?? [];

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

  // Drafts are now fetched (so they can be managed from the tabs) but stay out of the money totals.
  const totalInvoiced = invoices.filter((i) => i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  function fmt(n: number) {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  }

  // One-element clients list in the shape the reused finances forms expect.
  const financeClients: Client[] = [{
    id: client.id,
    name: client.name,
    company: client.company ?? null,
    email: client.email ?? null,
    phone: client.phone ?? null,
    contact_person: client.contact_person ?? null,
    address: client.address ?? null,
    reg_number: client.reg_number ?? null,
    vat_number: client.vat_number ?? null,
  }];

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-5 animate-fade-up">
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
          {client.contact_person && <span>{client.contact_person}</span>}
          {client.phone && <span>Tel: {client.phone}</span>}
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
        clientLabel={client.company ?? client.name}
        invoices={invoices}
        quotes={quotes}
        clients={financeClients}
        leads={leads}
        reports={reports}
        documents={documents}
        tasks={tasks}
        reportUrls={reportUrls}
        documentUrls={documentUrls}
      />
    </main>
  );
}
