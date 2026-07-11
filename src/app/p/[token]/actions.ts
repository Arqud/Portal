"use server";

// PUBLIC server actions — no auth: the unguessable share token IS the access
// control. Everything is re-validated server-side; never trust the client.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calcSubtotal } from "@/lib/invoices/calculations";
import { canAccept } from "@/lib/proposals/rules";
import { sendProposalAcceptedEmail } from "@/lib/proposals/notify";
import { formatSast } from "@/lib/leads/notify";
import type { ProposalWithItems } from "@/lib/proposals/types";

function revalidatePublicAndAdmin() {
  revalidatePath("/p/[token]", "page");
  revalidatePath("/admin/proposals");
  revalidatePath("/admin/proposals/[id]", "page");
}

export async function acceptProposal(token: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from("proposals")
    .select("*, client:clients(id,name,company,email), line_items:proposal_line_items(*)")
    .eq("share_token", token)
    .single();
  if (!data) return { ok: false, error: "Proposal not found." };
  const p = data as ProposalWithItems;

  const gate = canAccept(p);
  if (!gate.ok) {
    // Idempotent: a second submit on an accepted proposal is a no-op success.
    if (gate.reason === "accepted") return { ok: true };
    if (gate.reason === "expired") return { ok: false, error: "This proposal has expired — contact Morne@arqud.com." };
    return { ok: false, error: "This proposal can no longer be accepted." };
  }

  const acceptedByName = name.trim().slice(0, 120);
  if (acceptedByName.length < 3) return { ok: false, error: "Please type your full name." };

  // First hop of x-forwarded-for = the recipient's IP (Vercel appends hops after it).
  const forwardedFor = (await headers()).get("x-forwarded-for");
  const acceptedIp = forwardedFor?.split(",")[0]?.trim() || null;
  const acceptedAt = new Date().toISOString();

  // status guard makes a double-submit race a no-op instead of a double-accept.
  const { data: updated, error } = await admin
    .from("proposals")
    .update({
      status: "accepted",
      accepted_by_name: acceptedByName,
      accepted_at: acceptedAt,
      accepted_ip: acceptedIp,
      updated_at: acceptedAt,
    })
    .eq("id", p.id)
    .eq("status", "sent")
    .select("id");
  if (error) return { ok: false, error: "Something went wrong — please try again." };

  if (updated && updated.length > 0) {
    // Guarded sender — an email failure never breaks the acceptance.
    await sendProposalAcceptedEmail({
      title: p.title,
      proposal_number: p.proposal_number,
      recipient: p.client?.company ?? p.client?.name ?? p.prospect_company ?? p.prospect_name ?? "—",
      accepted_by_name: acceptedByName,
      accepted_at_sast: formatSast(acceptedAt),
      total: calcSubtotal(p.line_items),
    });
  }

  revalidatePublicAndAdmin();
  return { ok: true };
}

export async function declineProposal(token: string, reason?: string): Promise<{ ok: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data: p } = await admin
    .from("proposals")
    .select("id, status")
    .eq("share_token", token)
    .single();
  if (!p || p.status !== "sent") return { ok: false };

  const now = new Date().toISOString();
  const { error } = await admin
    .from("proposals")
    .update({
      status: "declined",
      declined_at: now,
      decline_reason: reason?.trim().slice(0, 300) || null,
      updated_at: now,
    })
    .eq("id", p.id)
    .eq("status", "sent");
  if (error) return { ok: false };

  revalidatePublicAndAdmin();
  return { ok: true };
}
