"use client";

import { useTransition } from "react";
import { markInvoicePaid } from "./actions";
import type { InvoiceWithItems } from "@/lib/invoices/types";

const STATUS: Record<string, string> = {
  draft: "text-arqud-muted border-arqud-muted",
  pending: "text-arqud-gold border-arqud-gold",
  paid: "text-green-400 border-green-400",
  overdue: "text-red-400 border-red-400",
};

function fmt(n: number) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

export function InvoiceDetailModal({
  invoice,
  onClose,
}: {
  invoice: InvoiceWithItems;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const client = invoice.client;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
  const clientEmail = client?.email ?? "";
  const clientName = client?.company ?? client?.name ?? "";
  const mailtoUrl = `mailto:${clientEmail}?subject=Invoice ${invoice.invoice_number} from ARQUD (PTY) LTD&body=Dear ${clientName},%0A%0APlease find your invoice ${invoice.invoice_number} attached.%0A%0AAmount due: ${fmt(invoice.amount)}%0ADue date: ${invoice.due_date}%0A%0AKind regards,%0AMorne Swanepoel%0AARQUD (PTY) LTD`;

  const sorted = [...(invoice.line_items ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 pt-8 pb-8 px-4">
      <div className="w-full max-w-2xl bg-white text-gray-900 shadow-2xl">
        {/* Controls bar */}
        <div className="bg-arqud-night flex items-center justify-between px-6 py-3 gap-3">
          <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[invoice.status] ?? ""}`}>
            {invoice.status}
          </span>
          <div className="flex items-center gap-3 flex-1 justify-end">
            {(invoice.status === "pending" || invoice.status === "overdue") && (
              <button disabled={pending}
                onClick={() => start(() => markInvoicePaid(invoice.id, new Date().toISOString().split("T")[0]).then(onClose))}
                className="text-xs text-green-400 hover:text-green-300 uppercase tracking-widest disabled:opacity-50">
                Mark Paid
              </button>
            )}
            <a href={mailtoUrl}
              className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">
              Send Email
            </a>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="bg-arqud-gold px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
              Download PDF
            </a>
            <button onClick={onClose} className="text-arqud-muted hover:text-white text-lg ml-2">✕</button>
          </div>
        </div>

        {/* Invoice preview */}
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-gray-900">
            <div>
              <p className="text-2xl font-bold tracking-widest text-gray-900">A R Q U D</p>
              <p className="text-xs tracking-widest text-gray-500 mt-0.5">DIGITAL MARKETING AGENCY</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">TAX INVOICE</p>
              <p className="text-sm text-gray-600 mt-1">{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-4 gap-4 bg-gray-900 text-white px-4 py-3">
            {[
              { label: "Invoice Date", value: invoice.issue_date },
              { label: "Due Date", value: invoice.due_date },
              { label: "Terms", value: invoice.terms || "14 Days" },
              { label: "Amount Due", value: fmt(invoice.amount), bold: true },
            ].map(({ label, value, bold }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-sm ${bold ? "font-bold text-yellow-400" : "text-white"}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Billed From / To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 border-l-2 border-yellow-600 pl-2">Billed From</p>
              <p className="font-bold text-sm">ARQUD (PTY) LTD</p>
              <p className="text-xs text-gray-600 mt-1">Morne Swanepoel</p>
              <p className="text-xs text-gray-600">Morne@arqud.com</p>
              <p className="text-xs text-gray-600">Reg No: 2025/074398/07</p>
              <p className="text-xs text-gray-600">Tel: +27 60 865 8690</p>
              <p className="text-xs text-gray-600">Web: arqud.com</p>
            </div>
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 border-l-2 border-yellow-600 pl-2">Billed To</p>
              <p className="font-bold text-sm">{client?.company ?? client?.name ?? "—"}</p>
              {client?.contact_person && <p className="text-xs text-gray-600 mt-1">{client.contact_person}</p>}
              <p className="text-xs text-gray-600">{client?.email ?? ""}</p>
              {client?.address && <p className="text-xs text-gray-600">{client.address}</p>}
              {client?.reg_number && <p className="text-xs text-gray-600">Reg No: {client.reg_number}</p>}
              {client?.vat_number && <p className="text-xs text-gray-600">VAT No: {client.vat_number}</p>}
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left text-xs px-3 py-2">Description</th>
                <th className="text-right text-xs px-3 py-2">Rate</th>
                <th className="text-right text-xs px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length > 0 ? sorted.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900">{item.description}</p>
                    {item.detail && <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{fmt(item.rate)}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">{fmt(item.amount)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-xs">No line items</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-sm text-gray-600 py-1">
                <span>Subtotal</span>
                <span>{fmt(invoice.subtotal || invoice.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-200">
                <span>VAT ({invoice.vat_rate ?? 0}%)</span>
                <span>{fmt(invoice.vat_amount || 0)}</span>
              </div>
              <div className="flex justify-between bg-gray-900 text-white px-3 py-2 mt-1">
                <span className="text-sm font-bold uppercase tracking-wider">Total Due</span>
                <span className="text-lg font-bold text-yellow-400">{fmt(invoice.amount)}</span>
              </div>
            </div>
          </div>

          {/* Banking + Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Banking Details</p>
              <p className="text-xs text-gray-700">FNB Gold Business Account</p>
              <p className="text-xs text-gray-700">Account Number: 63195766482</p>
              <p className="text-xs text-gray-700">Branch Code: 255355</p>
              <p className="text-xs text-gray-500 mt-1 italic">Reference: {invoice.invoice_number}</p>
            </div>
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Note</p>
              <p className="text-xs text-gray-600 italic">
                {invoice.notes ?? "Please use the invoice number as your payment reference. Payment is due within 14 days of invoice date."}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-900 pt-3 flex justify-between text-xs text-gray-500">
            <span>Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07</span>
            <span>THANK YOU FOR YOUR BUSINESS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
