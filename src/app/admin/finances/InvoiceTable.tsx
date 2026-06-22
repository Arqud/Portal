"use client";

import { useState, useTransition } from "react";
import { markInvoicePaid, deleteInvoice } from "./actions";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { InvoiceForm } from "./InvoiceForm";
import { Table, Tr, Td, Pill, Button } from "@/components/ui";
import type { InvoiceWithItems, Client } from "@/lib/invoices/types";

const STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  pending: "contacted",
  paid: "converted",
  overdue: "danger",
};

export function InvoiceTable({ invoices, clients, onNew }: { invoices: InvoiceWithItems[]; clients: Client[]; onNew: () => void }) {
  const [pending, start] = useTransition();
  const [viewing, setViewing] = useState<InvoiceWithItems | null>(null);
  const [editing, setEditing] = useState<InvoiceWithItems | null>(null);

  return (
    <div>
      {viewing && <InvoiceDetailModal invoice={viewing} onClose={() => setViewing(null)} />}
      {editing && <InvoiceForm clients={clients} editInvoice={editing} onClose={() => setEditing(null)} />}

      <div className="flex justify-end mb-4">
        <Button onClick={onNew}>+ New Invoice</Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-arqud-muted text-center py-16">No invoices yet.</p>
      ) : (
        <Table>
          <Tr header>
            <Td className="basis-[1fr] grow">Invoice #</Td>
            <Td className="basis-[1.2fr] grow">Client</Td>
            <Td className="basis-[1fr] grow">Issue Date</Td>
            <Td className="basis-[1fr] grow">Due Date</Td>
            <Td className="basis-[1fr] grow">Amount</Td>
            <Td className="basis-[0.8fr] grow">Status</Td>
            <Td className="basis-[1.8fr] grow">Actions</Td>
          </Tr>
          {invoices.map((inv) => (
            <Tr key={inv.id}>
              <Td className="basis-[1fr] grow">
                <button onClick={() => setViewing(inv)}
                  className="text-arqud-gold hover:text-arqud-gold-soft hover:underline font-medium">
                  {inv.invoice_number}
                </button>
              </Td>
              <Td className="basis-[1.2fr] grow text-arqud-bone">{inv.client?.company ?? inv.client?.name ?? "—"}</Td>
              <Td className="basis-[1fr] grow text-arqud-muted">{inv.issue_date}</Td>
              <Td className="basis-[1fr] grow text-arqud-muted">{inv.due_date}</Td>
              <Td className="basis-[1fr] grow text-arqud-bone">R {Number(inv.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</Td>
              <Td className="basis-[0.8fr] grow">
                <Pill tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Pill>
              </Td>
              <Td className="basis-[1.8fr] grow flex gap-3 flex-wrap items-center">
                <button onClick={() => setViewing(inv)}
                  className="text-xs text-arqud-muted hover:text-arqud-bone uppercase tracking-widest">
                  View
                </button>
                {inv.status !== "draft" && (
                  <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">PDF</a>
                )}
                {(inv.status === "pending" || inv.status === "overdue") && (
                  <button disabled={pending}
                    onClick={() => start(() => markInvoicePaid(inv.id, new Date().toISOString().split("T")[0]))}
                    className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50">Mark Paid</button>
                )}
                <button onClick={() => setEditing(inv)}
                  className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">Edit</button>
                {inv.status === "draft" && (
                  <button disabled={pending}
                    onClick={() => { if (confirm(`Delete ${inv.invoice_number}?`)) start(() => deleteInvoice(inv.id)); }}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
