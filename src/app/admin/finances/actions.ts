"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextDocumentNumber } from "@/lib/invoices/numbering";
import { calcSubtotal, calcVat, calcTotal, calcLineAmount } from "@/lib/invoices/calculations";
import type { CreateInvoiceInput, CreateQuoteInput } from "@/lib/invoices/types";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return admin;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const admin = await requireAdmin();

  const lineItems = input.lineItems.map((li, i) => ({
    ...li,
    amount: calcLineAmount(li.rate, li.quantity),
    sort_order: i,
  }));

  const subtotal = calcSubtotal(lineItems);
  const vatAmount = calcVat(subtotal, input.vatRate);
  const total = calcTotal(subtotal, vatAmount);
  const invoiceNumber = input.isDraft
    ? `DRAFT-${Date.now()}`
    : await nextDocumentNumber("invoice");

  const { data: invoice, error } = await admin
    .from("invoices")
    .insert({
      client_id: input.clientId,
      invoice_number: invoiceNumber,
      status: input.isDraft ? "draft" : "pending",
      issue_date: input.issueDate,
      due_date: input.dueDate,
      terms: input.terms,
      notes: input.notes || null,
      subtotal,
      vat_rate: input.vatRate,
      vat_amount: vatAmount,
      amount: total,
      description: null,
      pdf_url: null,
    })
    .select("id")
    .single();

  if (error || !invoice) throw new Error(error?.message ?? "Failed to create invoice");

  if (lineItems.length > 0) {
    const { error: liErr } = await admin
      .from("invoice_line_items")
      .insert(lineItems.map((li) => ({ ...li, invoice_id: invoice.id })));
    if (liErr) throw new Error(liErr.message);
  }

  revalidatePath("/admin/finances");
}

export async function markInvoicePaid(invoiceId: string, paidAt: string) {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/finances");
}

export async function deleteInvoice(invoiceId: string) {
  const admin = await requireAdmin();
  const { data } = await admin
    .from("invoices").select("status").eq("id", invoiceId).single();
  if (data?.status !== "draft") throw new Error("Only draft invoices can be deleted");
  await admin.from("invoices").delete().eq("id", invoiceId);
  revalidatePath("/admin/finances");
}

export async function createQuote(input: CreateQuoteInput) {
  const admin = await requireAdmin();

  const lineItems = input.lineItems.map((li, i) => ({
    ...li,
    amount: calcLineAmount(li.rate, li.quantity),
    sort_order: i,
  }));

  const subtotal = calcSubtotal(lineItems);
  const quoteNumber = input.isDraft
    ? `QDRAFT-${Date.now()}`
    : await nextDocumentNumber("quote");

  const { data: quote, error } = await admin
    .from("quotes")
    .insert({
      client_id: input.clientId,
      quote_number: quoteNumber,
      status: "draft",
      issue_date: input.issueDate,
      notes: input.notes || null,
      subtotal,
      total: subtotal,
    })
    .select("id")
    .single();

  if (error || !quote) throw new Error(error?.message ?? "Failed to create quote");

  if (lineItems.length > 0) {
    const { error: liErr } = await admin
      .from("quote_line_items")
      .insert(lineItems.map((li) => ({ ...li, quote_id: quote.id })));
    if (liErr) throw new Error(liErr.message);
  }

  revalidatePath("/admin/finances");
}

export async function updateQuoteStatus(quoteId: string, status: string) {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("quotes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", quoteId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/finances");
}

export async function convertQuoteToInvoice(
  quoteId: string,
  issueDate: string,
  dueDate: string,
) {
  const admin = await requireAdmin();

  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("*, line_items:quote_line_items(*)")
    .eq("id", quoteId)
    .single();

  if (qErr || !quote) throw new Error("Quote not found");

  const lineItems = (quote.line_items as {
    description: string; detail: string | null;
    rate: number; quantity: number; amount: number; sort_order: number;
  }[]).map((li) => ({ ...li, amount: calcLineAmount(li.rate, li.quantity) }));

  const vatRate = 15;
  const subtotal = calcSubtotal(lineItems);
  const vatAmount = calcVat(subtotal, vatRate);
  const total = calcTotal(subtotal, vatAmount);
  const invoiceNumber = await nextDocumentNumber("invoice");

  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .insert({
      client_id: quote.client_id,
      invoice_number: invoiceNumber,
      status: "pending",
      issue_date: issueDate,
      due_date: dueDate,
      terms: "14 Days",
      notes: quote.notes,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount: total,
      converted_from_quote_id: quoteId,
      description: null,
      pdf_url: null,
    })
    .select("id")
    .single();

  if (invErr || !invoice) throw new Error(invErr?.message ?? "Failed to create invoice");

  await admin.from("invoice_line_items")
    .insert(lineItems.map((li) => ({ ...li, invoice_id: invoice.id })));

  await admin.from("quotes")
    .update({ status: "accepted", converted_to_invoice_id: invoice.id })
    .eq("id", quoteId);

  revalidatePath("/admin/finances");
}
