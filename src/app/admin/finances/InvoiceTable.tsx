"use client";

import { useTransition } from "react";
import { markInvoicePaid, deleteInvoice } from "./actions";
import type { InvoiceWithItems } from "@/lib/invoices/types";

const STATUS: Record<string, string> = {
  draft: "text-arqud-muted border-arqud-muted",
  pending: "text-arqud-gold border-arqud-gold",
  paid: "text-green-400 border-green-400",
  overdue: "text-red-400 border-red-400",
};

export function InvoiceTable({ invoices, onNew }: { invoices: InvoiceWithItems[]; onNew: () => void }) {
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={onNew}
          className="bg-arqud-gold px-6 py-2 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
          + New Invoice
        </button>
      </div>
      {invoices.length === 0 ? (
        <p className="text-arqud-muted text-center py-16">No invoices yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-arqud-ink">
              {["Invoice #", "Client", "Issue Date", "Due Date", "Amount", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                <td className="py-3 pr-4 text-arqud-bone">{inv.invoice_number}</td>
                <td className="py-3 pr-4 text-arqud-bone">{inv.client?.company ?? inv.client?.name ?? "—"}</td>
                <td className="py-3 pr-4 text-arqud-muted">{inv.issue_date}</td>
                <td className="py-3 pr-4 text-arqud-muted">{inv.due_date}</td>
                <td className="py-3 pr-4 text-arqud-bone">R {inv.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[inv.status] ?? ""}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="py-3 flex gap-3 flex-wrap items-center">
                  {inv.status !== "draft" && (
                    <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">PDF</a>
                  )}
                  {(inv.status === "pending" || inv.status === "overdue") && (
                    <button disabled={pending}
                      onClick={() => start(() => markInvoicePaid(inv.id, new Date().toISOString().split("T")[0]))}
                      className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50">Mark Paid</button>
                  )}
                  {inv.status === "draft" && (
                    <button disabled={pending}
                      onClick={() => { if (confirm(`Delete ${inv.invoice_number}?`)) start(() => deleteInvoice(inv.id)); }}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
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
