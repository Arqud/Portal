import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySession } from "@/lib/auth/session";
import { RevenueSummary } from "./RevenueSummary";
import { FinancesClient } from "./FinancesClient";
import type { InvoiceWithItems, QuoteWithItems } from "@/lib/invoices/types";

async function flagOverdue() {
  const admin = createSupabaseAdminClient();
  await admin
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString().split("T")[0]);
}

export default async function FinancesPage() {
  await verifySession("admin");
  await flagOverdue();

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

  const [invRes, qRes, cRes] = await Promise.all([
    admin.from("invoices")
      .select("*, client:clients(id,name,company,email,contact_person,address,reg_number,vat_number), line_items:invoice_line_items(*)")
      .order("created_at", { ascending: false }),
    admin.from("quotes")
      .select("*, client:clients(id,name,company,email,contact_person,address,reg_number,vat_number), line_items:quote_line_items(*)")
      .order("created_at", { ascending: false }),
    admin.from("clients").select("id,name,company,email,contact_person,address,reg_number,vat_number").eq("status", "active"),
  ]);

  const invoices = (invRes.data ?? []) as InvoiceWithItems[];
  const quotes = (qRes.data ?? []) as QuoteWithItems[];
  const clients = (cRes.data ?? []) as { id: string; name: string; company: string | null; email: string; contact_person: string | null; address: string | null; reg_number: string | null; vat_number: string | null }[];

  const invoicedThisMonth = invoices
    .filter((i) => i.issue_date >= monthStart && i.status !== "draft")
    .reduce((s, i) => s + i.amount, 0);
  const collectedThisMonth = invoices
    .filter((i) => i.status === "paid" && (i.paid_at ?? "") >= monthStart)
    .reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + i.amount, 0);
  const overdue = invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);
  const ytd = invoices
    .filter((i) => i.issue_date >= yearStart && i.status !== "draft")
    .reduce((s, i) => s + i.amount, 0);

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Finances</h1>
      <RevenueSummary
        invoicedThisMonth={invoicedThisMonth}
        collectedThisMonth={collectedThisMonth}
        outstanding={outstanding}
        overdue={overdue}
        ytd={ytd}
      />
      <FinancesClient invoices={invoices} quotes={quotes} clients={clients} />
    </main>
  );
}
