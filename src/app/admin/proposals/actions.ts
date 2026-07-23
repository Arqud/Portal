"use server";

// Admin server actions for Proposals — same requireAdmin + service-role admin
// client + revalidatePath contract as admin/finances/actions.ts. All access is
// server-side; the public page never touches these.

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextDocumentNumber } from "@/lib/invoices/numbering";
import { calcSubtotal, calcVat, calcTotal, calcLineAmount } from "@/lib/invoices/calculations";
import { generateShareToken } from "@/lib/proposals/token";
import type { ProposalLineItem, ProposalSection } from "@/lib/proposals/types";
import { withBusiness } from "@/lib/business/persist";

export type ProposalInput = {
  client_id: string | null;
  prospect_name: string | null;
  prospect_company: string | null;
  prospect_email: string | null;
  title: string;
  intro: string | null;
  terms: string | null;
  valid_until: string | null;
  sections: ProposalSection[];
  lineItems: Omit<ProposalLineItem, "id">[];
  business?: string | null;
};

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

// The public page depends on this data — every mutation revalidates both the
// admin routes and the tokenized public page so edits/acceptance show instantly.
function revalidateProposalPaths() {
  revalidatePath("/admin/proposals");
  revalidatePath("/admin/proposals/[id]", "page");
  revalidatePath("/p/[token]", "page");
}

// A proposal must aim at someone: a linked client OR a named prospect
// (app-level guard — the DB allows both columns null).
function assertRecipient(input: ProposalInput) {
  if (!input.client_id && !input.prospect_name?.trim()) {
    throw new Error("A proposal needs an existing client or a prospect name");
  }
  if (!input.title.trim()) throw new Error("Title is required");
}

// Normalize recipient/content fields: linked-client proposals carry no
// prospect_* values, blanks become null, sections drop empty headings/bullets.
function normalizeInput(input: ProposalInput) {
  const sections = input.sections
    .map((s) => ({
      heading: s.heading.trim(),
      bullets: s.bullets.map((b) => b.trim()).filter(Boolean),
    }))
    .filter((s) => s.heading || s.bullets.length > 0);
  return {
    client_id: input.client_id,
    prospect_name: input.client_id ? null : input.prospect_name?.trim() || null,
    prospect_company: input.client_id ? null : input.prospect_company?.trim() || null,
    prospect_email: input.client_id ? null : input.prospect_email?.trim() || null,
    title: input.title.trim(),
    intro: input.intro?.trim() || null,
    terms: input.terms?.trim() || null,
    valid_until: input.valid_until || null,
    sections,
  };
}

function buildLineItems(items: Omit<ProposalLineItem, "id">[]) {
  return items.map((li, i) => ({
    description: li.description,
    quantity: li.quantity,
    rate: li.rate,
    amount: calcLineAmount(li.rate, li.quantity),
    sort_order: i,
  }));
}

export async function createProposal(input: ProposalInput): Promise<{ id: string }> {
  const admin = await requireAdmin();
  assertRecipient(input);

  // A client proposal follows its client's business (the wall); a prospect
  // proposal uses the chosen business. select("*") is migration-safe.
  let business = input.business ?? null;
  if (input.client_id) {
    const { data: clientRow } = await admin
      .from("clients").select("*").eq("id", input.client_id).single();
    business = clientRow?.business ?? business;
  }

  const proposalNumber = await nextDocumentNumber("proposal");
  const lineItems = buildLineItems(input.lineItems);

  const { data: proposal, error } = await admin
    .from("proposals")
    .insert(withBusiness({
      ...normalizeInput(input),
      proposal_number: proposalNumber,
      status: "draft",
      share_token: generateShareToken(),
    }, business))
    .select("id")
    .single();

  if (error || !proposal) throw new Error(error?.message ?? "Failed to create proposal");

  if (lineItems.length > 0) {
    const { error: liErr } = await admin
      .from("proposal_line_items")
      .insert(lineItems.map((li) => ({ ...li, proposal_id: proposal.id })));
    if (liErr) throw new Error(liErr.message);
  }

  revalidateProposalPaths();
  return { id: proposal.id };
}

export async function updateProposal(id: string, input: ProposalInput): Promise<void> {
  const admin = await requireAdmin();
  assertRecipient(input);

  // Accepted/declined proposals are locked — the recipient signed (or refused)
  // a specific document; it must never change under them.
  const { data: existing, error: exErr } = await admin
    .from("proposals").select("status").eq("id", id).single();
  if (exErr || !existing) throw new Error("Proposal not found");
  if (existing.status !== "draft" && existing.status !== "sent") {
    throw new Error(`Cannot edit a ${existing.status} proposal`);
  }

  const lineItems = buildLineItems(input.lineItems);

  const { error } = await admin
    .from("proposals")
    .update({ ...normalizeInput(input), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Replace line items (same idiom as invoices/quotes)
  await admin.from("proposal_line_items").delete().eq("proposal_id", id);
  if (lineItems.length > 0) {
    const { error: liErr } = await admin
      .from("proposal_line_items")
      .insert(lineItems.map((li) => ({ ...li, proposal_id: id })));
    if (liErr) throw new Error(liErr.message);
  }

  revalidateProposalPaths();
}

export async function markProposalSent(id: string): Promise<void> {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("proposals")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft"); // only a draft can be sent
  if (error) throw new Error(error.message);
  revalidateProposalPaths();
}

export async function markProposalDeclined(id: string, reason?: string): Promise<void> {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("proposals")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
      decline_reason: reason?.trim().slice(0, 300) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "sent"); // manual decline applies to sent proposals only
  if (error) throw new Error(error.message);
  revalidateProposalPaths();
}

export async function deleteProposal(id: string): Promise<void> {
  const admin = await requireAdmin();
  // Any status may be deleted (UI owns the confirm). A converted invoice keeps
  // existing — the FK lives on proposals, so nothing needs unlinking.
  await admin.from("proposal_line_items").delete().eq("proposal_id", id);
  await admin.from("proposals").delete().eq("id", id);
  revalidateProposalPaths();
}

// Turn an accepted prospect into a real clients row so the proposal can convert
// to an invoice. Carries prospect fields over; slug + status follow the
// addNewClient idiom (admin/clients/new/actions.ts).
export async function createClientFromProposal(id: string): Promise<{ clientId: string }> {
  const admin = await requireAdmin();

  const { data: proposal, error: pErr } = await admin
    .from("proposals")
    .select("client_id, prospect_name, prospect_company, prospect_email")
    .eq("id", id)
    .single();
  if (pErr || !proposal) throw new Error("Proposal not found");
  if (proposal.client_id) throw new Error("Proposal is already linked to a client");
  if (!proposal.prospect_name?.trim()) throw new Error("Proposal has no prospect name");

  // subdomain_slug is unique — derive from the company/name, suffix on collision.
  const base =
    (proposal.prospect_company || proposal.prospect_name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "prospect";
  const { data: taken } = await admin
    .from("clients").select("id").eq("subdomain_slug", base).maybeSingle();
  const slug = taken ? `${base}-${Date.now().toString(36)}` : base;

  const { data: client, error: cErr } = await admin
    .from("clients")
    .insert({
      name: proposal.prospect_name.trim(),
      company: proposal.prospect_company?.trim() || null,
      // clients.email is NOT NULL; a missing prospect email becomes "" so the
      // conversion never blocks — Morne fills it in via the client edit page.
      email: proposal.prospect_email?.trim() || "",
      subdomain_slug: slug,
      status: "active",
    })
    .select("id")
    .single();
  if (cErr || !client) throw new Error(cErr?.message ?? "Failed to create client");

  const { error: linkErr } = await admin
    .from("proposals")
    .update({ client_id: client.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (linkErr) throw new Error(linkErr.message);

  revalidateProposalPaths();
  revalidatePath("/admin/clients");
  return { clientId: client.id };
}

// Accepted proposal -> DRAFT invoice with a real INV number (spec: nothing
// auto-fires — Morne reviews the draft in Finances before sending). Produces
// the same invoice + line-item shape as convertQuoteToInvoice.
export async function convertProposalToInvoice(id: string): Promise<{ invoiceId: string }> {
  const admin = await requireAdmin();

  const { data: proposal, error: pErr } = await admin
    .from("proposals")
    .select("*, line_items:proposal_line_items(*)")
    .eq("id", id)
    .single();
  if (pErr || !proposal) throw new Error("Proposal not found");
  if (proposal.status !== "accepted") throw new Error("Only accepted proposals can convert to an invoice");
  if (!proposal.client_id) throw new Error("Create the client first — the proposal has no linked client");
  if (proposal.converted_to_invoice_id) throw new Error("Proposal is already invoiced");

  const lineItems = (proposal.line_items as {
    description: string; rate: number; quantity: number; sort_order: number;
  }[])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((li) => ({
      description: li.description,
      detail: null,
      rate: li.rate,
      quantity: li.quantity,
      amount: calcLineAmount(li.rate, li.quantity),
      sort_order: li.sort_order,
    }));

  const vatRate = 15;
  const subtotal = calcSubtotal(lineItems);
  const vatAmount = calcVat(subtotal, vatRate);
  const total = calcTotal(subtotal, vatAmount);
  const invoiceNumber = await nextDocumentNumber("invoice");

  const issue = new Date();
  const due = new Date(issue.getTime() + 14 * 24 * 60 * 60 * 1000);
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .insert({
      client_id: proposal.client_id,
      invoice_number: invoiceNumber,
      status: "draft",
      issue_date: isoDate(issue),
      due_date: isoDate(due),
      terms: "14 Days",
      notes: null,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount: total,
      description: null,
      pdf_url: null,
    })
    .select("id")
    .single();
  if (invErr || !invoice) throw new Error(invErr?.message ?? "Failed to create invoice");

  if (lineItems.length > 0) {
    const { error: liErr } = await admin
      .from("invoice_line_items")
      .insert(lineItems.map((li) => ({ ...li, invoice_id: invoice.id })));
    if (liErr) throw new Error(liErr.message);
  }

  const { error: stampErr } = await admin
    .from("proposals")
    .update({ converted_to_invoice_id: invoice.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (stampErr) throw new Error(stampErr.message);

  revalidateProposalPaths();
  revalidatePath("/admin/finances");
  return { invoiceId: invoice.id };
}
