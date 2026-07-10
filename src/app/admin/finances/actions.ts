"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextDocumentNumber } from "@/lib/invoices/numbering";
import { calcSubtotal, calcVat, calcTotal, calcLineAmount } from "@/lib/invoices/calculations";
import type { CreateDocumentInput as CreateInvoiceInput } from "@/lib/invoices/types";
import type { CreateDocumentInput as CreateQuoteInput } from "@/lib/invoices/types";

async function sendInvoiceEmail(invoiceId: string, invoiceNumber: string, clientEmail: string, clientName: string, amount: number, dueDate: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const portalUrl = `https://arqudportal.co.za/api/invoices/${invoiceId}/pdf`;
    await resend.emails.send({
      from: "ARQUD Portal <noreply@arqudportal.co.za>",
      to: clientEmail,
      subject: `Invoice ${invoiceNumber} from ARQUD (PTY) LTD`,
      html: `<div style="background:#080808;padding:40px;font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto">
        <h1 style="color:#c8a96e;font-size:22px;letter-spacing:0.25em;margin:0 0 8px">ARQUD</h1>
        <p style="color:#6e6e6e;font-size:10px;letter-spacing:0.2em;margin:0 0 32px">DIGITAL MARKETING AGENCY</p>
        <p style="color:#f3ecd9;font-size:16px;margin:0 0 8px">Dear ${clientName},</p>
        <p style="color:#f3ecd9;font-size:14px;margin:0 0 24px">Your invoice <strong style="color:#c8a96e">${invoiceNumber}</strong> is ready.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 32px">
          <tr><td style="color:#6e6e6e;font-size:12px;padding:8px 0;border-bottom:1px solid #1a1f2e">Amount Due</td><td style="color:#c8a96e;font-size:18px;font-style:italic;text-align:right;padding:8px 0;border-bottom:1px solid #1a1f2e">R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td></tr>
          <tr><td style="color:#6e6e6e;font-size:12px;padding:8px 0">Due Date</td><td style="color:#f3ecd9;font-size:12px;text-align:right;padding:8px 0">${dueDate}</td></tr>
        </table>
        <a href="${portalUrl}" style="display:inline-block;background:#c8a96e;color:#080808;text-decoration:none;padding:14px 32px;font-weight:600;font-size:13px;letter-spacing:0.08em;margin-bottom:32px">VIEW INVOICE</a>
        <p style="color:#6e6e6e;font-size:11px;margin:0">Please use the invoice number as your payment reference.<br>FNB Gold Business · Acc: 63195766482 · Branch: 255355</p>
        <p style="color:#3a3a3a;font-size:10px;margin:32px 0 0">Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07</p>
      </div>`,
    });
  } catch { /* email failure is non-blocking */ }
}

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
  const vatAmount = calcVat(subtotal, input.vatRate ?? 0);
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
      vat_rate: input.vatRate ?? 0,
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

  // Auto-email client when invoice is created (non-draft only)
  if (!input.isDraft) {
    const { data: clientData } = await admin
      .from("clients").select("email, company, name").eq("id", input.clientId).single();
    if (clientData?.email) {
      await sendInvoiceEmail(
        invoice.id, invoiceNumber ?? "", clientData.email,
        clientData.company ?? clientData.name, total, input.dueDate ?? "",
      );
    }
  }

  return { id: invoice.id, invoiceNumber: invoiceNumber };
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

export async function updateInvoice(invoiceId: string, input: CreateInvoiceInput) {
  const admin = await requireAdmin();

  const lineItems = input.lineItems.map((li, i) => ({
    ...li,
    amount: calcLineAmount(li.rate, li.quantity),
    sort_order: i,
  }));

  const subtotal = calcSubtotal(lineItems);
  const vatAmount = calcVat(subtotal, input.vatRate ?? 0);
  const total = calcTotal(subtotal, vatAmount);

  const { error } = await admin
    .from("invoices")
    .update({
      client_id: input.clientId,
      issue_date: input.issueDate,
      due_date: input.dueDate,
      terms: input.terms,
      notes: input.notes || null,
      subtotal,
      vat_rate: input.vatRate ?? 0,
      vat_amount: vatAmount,
      amount: total,
      status: input.isDraft ? "draft" : "pending",
    })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);

  // Replace line items
  await admin.from("invoice_line_items").delete().eq("invoice_id", invoiceId);
  if (lineItems.length > 0) {
    await admin.from("invoice_line_items").insert(
      lineItems.map((li) => ({ ...li, invoice_id: invoiceId })),
    );
  }

  revalidatePath("/admin/finances");
}

export async function deleteInvoice(invoiceId: string) {
  const admin = await requireAdmin();
  // Unlink any quote that converted into this invoice — its FK blocks the delete otherwise.
  await admin.from("quotes").update({ converted_to_invoice_id: null }).eq("converted_to_invoice_id", invoiceId);
  await admin.from("invoice_line_items").delete().eq("invoice_id", invoiceId);
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

export async function updateQuote(quoteId: string, input: CreateQuoteInput) {
  const admin = await requireAdmin();

  const lineItems = input.lineItems.map((li, i) => ({
    ...li,
    amount: calcLineAmount(li.rate, li.quantity),
    sort_order: i,
  }));

  const subtotal = calcSubtotal(lineItems);

  const { error } = await admin
    .from("quotes")
    .update({
      client_id: input.clientId,
      issue_date: input.issueDate,
      notes: input.notes || null,
      subtotal,
      total: subtotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) throw new Error(error.message);

  await admin.from("quote_line_items").delete().eq("quote_id", quoteId);
  if (lineItems.length > 0) {
    await admin.from("quote_line_items").insert(
      lineItems.map((li) => ({ ...li, quote_id: quoteId })),
    );
  }

  revalidatePath("/admin/finances");
}

export async function deleteQuote(quoteId: string) {
  const admin = await requireAdmin();
  // Unlink the invoice this quote converted into — the invoice itself stays.
  await admin.from("invoices").update({ converted_from_quote_id: null }).eq("converted_from_quote_id", quoteId);
  await admin.from("quote_line_items").delete().eq("quote_id", quoteId);
  await admin.from("quotes").delete().eq("id", quoteId);
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
