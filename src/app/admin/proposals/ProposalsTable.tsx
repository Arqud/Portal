"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Table, Tr, Td, Pill } from "@/components/ui";
import { calcSubtotal } from "@/lib/invoices/calculations";
import { formatDateTime } from "@/lib/leads/format";
import { markProposalSent, deleteProposal } from "./actions";
import type { ProposalWithItems } from "@/lib/proposals/types";

// Shared status → Pill tone vocabulary (see QuoteTable STATUS_TONE).
const STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  sent: "contacted",
  accepted: "converted",
  declined: "danger",
};

// Recipient display everywhere: client company → client name → prospect company → prospect name.
function recipient(p: ProposalWithItems): string {
  return p.client?.company ?? p.client?.name ?? p.prospect_company ?? p.prospect_name ?? "—";
}

function money(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

function deleteMessage(p: ProposalWithItems): string {
  return p.status === "accepted"
    ? `Delete ACCEPTED proposal ${p.proposal_number}?`
    : `Delete ${p.proposal_number}?`;
}

export function ProposalsTable({ proposals }: { proposals: ProposalWithItems[] }) {
  const [pending, start] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (p: ProposalWithItems) => {
    navigator.clipboard.writeText(`https://arqudportal.co.za/p/${p.share_token}`);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId((cur) => (cur === p.id ? null : cur)), 2000);
  };

  if (proposals.length === 0) {
    return <p className="text-arqud-muted text-center py-16">No proposals yet.</p>;
  }

  const actions = (p: ProposalWithItems) => (
    <>
      <Link href={`/admin/proposals/${p.id}`} className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">
        View
      </Link>
      <button onClick={() => copyLink(p)} className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">
        {copiedId === p.id ? "✓ Copied" : "Copy link"}
      </button>
      {p.status === "draft" && (
        <button disabled={pending}
          onClick={() => start(() => markProposalSent(p.id))}
          className="text-xs text-arqud-gold hover:text-arqud-gold-soft disabled:opacity-50">Mark Sent</button>
      )}
      <button disabled={pending}
        onClick={() => { if (confirm(deleteMessage(p))) start(() => deleteProposal(p.id)); }}
        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
    </>
  );

  return (
    <>
      {/* Mobile: stacked cards — the wide table would force horizontal scroll */}
      <div className="sm:hidden space-y-3">
        {proposals.map((p) => (
          <div key={p.id} className="panel-gradient border border-arqud-line rounded-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/admin/proposals/${p.id}`} className="text-[13px] text-arqud-gold font-medium truncate">
                {p.proposal_number}
              </Link>
              <Pill tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Pill>
            </div>
            <p className="text-[13px] text-arqud-bone leading-snug">{p.title}</p>
            <div className="grid grid-cols-3 gap-x-2 gap-y-3">
              {[
                { label: "Recipient", value: recipient(p) },
                { label: "Total (excl. VAT)", value: money(calcSubtotal(p.line_items)) },
                { label: "Created", value: formatDateTime(p.created_at) },
              ].map((m) => (
                <div key={m.label} className="min-w-0">
                  <div className="text-[9px] tracking-[0.13em] uppercase text-arqud-muted">{m.label}</div>
                  <div className="mt-0.5 text-[12.5px] text-arqud-bone-dim truncate">{m.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 flex-wrap items-center pt-1 border-t border-arqud-line/60">
              {actions(p)}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: full table */}
      <div className="hidden sm:block">
        <Table>
          <Tr header>
            <Td className="basis-[1fr] grow">Proposal #</Td>
            <Td className="basis-[1.2fr] grow">Recipient</Td>
            <Td className="basis-[1.6fr] grow">Title</Td>
            <Td className="basis-[1fr] grow">Total (excl. VAT)</Td>
            <Td className="basis-[0.8fr] grow">Status</Td>
            <Td className="basis-[1.1fr] grow">Created</Td>
            <Td className="basis-[1.8fr] grow">Actions</Td>
          </Tr>
          {proposals.map((p) => (
            <Tr key={p.id}>
              <Td className="basis-[1fr] grow">
                <Link href={`/admin/proposals/${p.id}`} className="text-arqud-gold hover:text-arqud-gold-soft hover:underline font-medium">
                  {p.proposal_number}
                </Link>
              </Td>
              <Td className="basis-[1.2fr] grow text-arqud-bone truncate">{recipient(p)}</Td>
              <Td className="basis-[1.6fr] grow text-arqud-bone-dim truncate">{p.title}</Td>
              <Td className="basis-[1fr] grow text-arqud-bone">{money(calcSubtotal(p.line_items))}</Td>
              <Td className="basis-[0.8fr] grow">
                <Pill tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Pill>
              </Td>
              <Td className="basis-[1.1fr] grow text-arqud-muted">{formatDateTime(p.created_at)}</Td>
              <Td className="basis-[1.8fr] grow flex gap-3 flex-wrap items-center">{actions(p)}</Td>
            </Tr>
          ))}
        </Table>
      </div>
    </>
  );
}
