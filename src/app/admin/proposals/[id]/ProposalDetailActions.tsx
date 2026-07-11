"use client";

// State-aware action rail for the admin proposal detail page.
// draft    → Edit, Mark Sent, Delete
// sent     → Edit, Copy link, Mark Declined (optional reason), Delete
// accepted → Create client (prospects) → Convert to Invoice → "Invoiced INV-…"
// declined → Delete only
// Copy share link itself is always available (spec).

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  markProposalSent,
  markProposalDeclined,
  deleteProposal,
  createClientFromProposal,
  convertProposalToInvoice,
} from "../actions";
import type { Proposal } from "@/lib/proposals/types";

export function ProposalDetailActions({
  proposal, invoiceNumber,
}: {
  proposal: Pick<Proposal, "id" | "proposal_number" | "status" | "share_token" | "client_id" | "converted_to_invoice_id">;
  invoiceNumber: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const run = (fn: () => Promise<unknown>) => {
    setErr("");
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://arqudportal.co.za/p/${proposal.share_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const del = () => {
    const msg = proposal.status === "accepted"
      ? `Delete ACCEPTED proposal ${proposal.proposal_number}?`
      : `Delete ${proposal.proposal_number}?`;
    if (!confirm(msg)) return;
    run(async () => {
      await deleteProposal(proposal.id);
      router.push("/admin/proposals");
    });
  };

  const decline = () => {
    const reason = prompt("Decline reason (optional):");
    if (reason === null) return; // cancelled
    run(() => markProposalDeclined(proposal.id, reason || undefined));
  };

  const editable = proposal.status === "draft" || proposal.status === "sent";

  return (
    <div className="space-y-3">
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={copyLink} className="justify-center">
          {copied ? "✓ Copied" : "Copy share link"}
        </Button>

        {proposal.status === "draft" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => markProposalSent(proposal.id))} className="justify-center">
            Mark Sent
          </Button>
        )}

        {proposal.status === "accepted" && !proposal.client_id && (
          <Button size="sm" disabled={pending} onClick={() => run(() => createClientFromProposal(proposal.id))} className="justify-center">
            Create client
          </Button>
        )}

        {proposal.status === "accepted" && proposal.client_id && !proposal.converted_to_invoice_id && (
          <Button size="sm" disabled={pending} onClick={() => run(() => convertProposalToInvoice(proposal.id))} className="justify-center">
            Convert to Invoice
          </Button>
        )}

        {proposal.converted_to_invoice_id && (
          <p className="text-center text-sm text-arqud-gold">
            Invoiced{" "}
            {invoiceNumber ? (
              <Link href="/admin/finances" className="underline hover:text-arqud-gold-soft">{invoiceNumber}</Link>
            ) : null}
          </p>
        )}
      </div>

      <div className="flex gap-4 justify-center pt-2 border-t border-arqud-line/60">
        {editable && (
          <Link href={`/admin/proposals/${proposal.id}/edit`} className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">
            Edit
          </Link>
        )}
        {proposal.status === "sent" && (
          <button disabled={pending} onClick={decline} className="text-xs text-arqud-muted hover:text-red-400 uppercase tracking-widest disabled:opacity-50">
            Mark Declined
          </button>
        )}
        <button disabled={pending} onClick={del} className="text-xs text-red-400 hover:text-red-300 uppercase tracking-widest disabled:opacity-50">
          Delete
        </button>
      </div>
    </div>
  );
}
