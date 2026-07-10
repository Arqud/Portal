"use client";

import { useState, useTransition } from "react";
import { updateQuoteStatus, deleteQuote } from "./actions";
import { ConvertModal } from "./ConvertModal";
import { QuoteForm } from "./QuoteForm";
import { QuoteDetailModal } from "./QuoteDetailModal";
import { Table, Tr, Td, Pill, Button } from "@/components/ui";
import type { QuoteWithItems, Client } from "@/lib/invoices/types";

// Quote statuses (draft/sent/accepted/rejected) mapped by meaning to the shared Pill tone vocabulary.
const STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  sent: "contacted",
  accepted: "converted",
  rejected: "danger",
};

export function QuoteTable({ quotes, clients, onNew }: { quotes: QuoteWithItems[]; clients: Client[]; onNew: () => void }) {
  const [pending, start] = useTransition();
  const [converting, setConverting] = useState<QuoteWithItems | null>(null);
  const [editing, setEditing] = useState<QuoteWithItems | null>(null);
  const [viewing, setViewing] = useState<QuoteWithItems | null>(null);

  return (
    <div>
      {converting && <ConvertModal quote={converting} onClose={() => setConverting(null)} />}
      {editing && <QuoteForm clients={clients} editQuote={editing} onClose={() => setEditing(null)} />}
      {viewing && (
        <QuoteDetailModal
          quote={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
        />
      )}
      <div className="flex justify-end mb-4">
        <Button onClick={onNew}>+ New Quote</Button>
      </div>
      {quotes.length === 0 ? (
        <p className="text-arqud-muted text-center py-16">No quotes yet.</p>
      ) : (
        <Table>
          <Tr header>
            <Td className="basis-[1fr] grow">Quote #</Td>
            <Td className="basis-[1.2fr] grow">Client</Td>
            <Td className="basis-[1fr] grow">Date</Td>
            <Td className="basis-[1.1fr] grow">Total (excl. VAT)</Td>
            <Td className="basis-[0.8fr] grow">Status</Td>
            <Td className="basis-[1.8fr] grow">Actions</Td>
          </Tr>
          {quotes.map((q) => (
            <Tr key={q.id}>
              <Td className="basis-[1fr] grow">
                <button onClick={() => setViewing(q)} className="text-arqud-gold hover:text-arqud-gold-soft hover:underline font-medium">
                  {q.quote_number}
                </button>
              </Td>
              <Td className="basis-[1.2fr] grow text-arqud-bone">{q.client?.company ?? q.client?.name ?? "—"}</Td>
              <Td className="basis-[1fr] grow text-arqud-muted">{q.issue_date}</Td>
              <Td className="basis-[1.1fr] grow text-arqud-bone">R {q.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</Td>
              <Td className="basis-[0.8fr] grow">
                <Pill tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Pill>
              </Td>
              <Td className="basis-[1.8fr] grow flex gap-3 flex-wrap items-center">
                <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">PDF</a>
                {q.status === "draft" && (
                  <button disabled={pending}
                    onClick={() => start(() => updateQuoteStatus(q.id, "sent"))}
                    className="text-xs text-arqud-gold hover:text-arqud-gold-soft disabled:opacity-50">Mark Sent</button>
                )}
                {q.status === "sent" && (
                  <>
                    <button disabled={pending}
                      onClick={() => start(() => updateQuoteStatus(q.id, "accepted"))}
                      className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50">Accept</button>
                    <button disabled={pending}
                      onClick={() => start(() => updateQuoteStatus(q.id, "rejected"))}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Reject</button>
                  </>
                )}
                {q.status === "accepted" && !q.converted_to_invoice_id && (
                  <button onClick={() => setConverting(q)}
                    className="text-xs text-arqud-gold hover:text-arqud-gold-soft">Convert to Invoice</button>
                )}
                {!q.converted_to_invoice_id && (
                  <button onClick={() => setEditing(q)}
                    className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">Edit</button>
                )}
                {q.converted_to_invoice_id && (
                  <span className="text-xs text-green-400">Invoiced</span>
                )}
                <button disabled={pending}
                  onClick={() => {
                    const msg = q.converted_to_invoice_id
                      ? `Delete quote ${q.quote_number}? Its invoice stays but loses the link to this quote.`
                      : `Delete ${q.quote_number}?`;
                    if (confirm(msg)) start(() => deleteQuote(q.id));
                  }}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
