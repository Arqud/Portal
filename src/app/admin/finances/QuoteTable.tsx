"use client";

import { useState, useTransition } from "react";
import { updateQuoteStatus } from "./actions";
import { ConvertModal } from "./ConvertModal";
import type { QuoteWithItems } from "@/lib/invoices/types";

const STATUS: Record<string, string> = {
  draft: "text-arqud-muted border-arqud-muted",
  sent: "text-arqud-gold border-arqud-gold",
  accepted: "text-green-400 border-green-400",
  rejected: "text-red-400 border-red-400",
};

export function QuoteTable({ quotes, onNew }: { quotes: QuoteWithItems[]; onNew: () => void }) {
  const [pending, start] = useTransition();
  const [converting, setConverting] = useState<QuoteWithItems | null>(null);

  return (
    <div>
      {converting && <ConvertModal quote={converting} onClose={() => setConverting(null)} />}
      <div className="flex justify-end mb-4">
        <button onClick={onNew}
          className="bg-arqud-gold px-6 py-2 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
          + New Quote
        </button>
      </div>
      {quotes.length === 0 ? (
        <p className="text-arqud-muted text-center py-16">No quotes yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-arqud-ink">
              {["Quote #", "Client", "Date", "Total (excl. VAT)", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                <td className="py-3 pr-4 text-arqud-bone">{q.quote_number}</td>
                <td className="py-3 pr-4 text-arqud-bone">{q.client?.company ?? q.client?.name ?? "—"}</td>
                <td className="py-3 pr-4 text-arqud-muted">{q.issue_date}</td>
                <td className="py-3 pr-4 text-arqud-bone">R {q.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[q.status] ?? ""}`}>
                    {q.status}
                  </span>
                </td>
                <td className="py-3 flex gap-3 flex-wrap items-center">
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
                  {q.converted_to_invoice_id && (
                    <span className="text-xs text-green-400">Invoiced</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
