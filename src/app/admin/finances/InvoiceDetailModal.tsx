"use client";

import { useTransition, useState } from "react";
import { markInvoicePaid, deleteInvoice } from "./actions";
import { Pill, Button, PdfViewerModal } from "@/components/ui";
import type { InvoiceWithItems } from "@/lib/invoices/types";

const STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  pending: "contacted",
  paid: "converted",
  overdue: "danger",
};

function fmt(n: number) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function InvoiceDetailModal({ invoice, onClose }: { invoice: InvoiceWithItems; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const client = invoice.client;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
  const sorted = [...(invoice.line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const mailtoUrl = `mailto:${client?.email ?? ""}?subject=Invoice ${invoice.invoice_number} from ARQUD (PTY) LTD&body=Dear ${client?.company ?? client?.name ?? ""},%0A%0APlease find your invoice ${invoice.invoice_number} attached.%0A%0AAmount due: ${fmt(invoice.amount)}%0ADue date: ${invoice.due_date}%0A%0AKind regards,%0AMorne Swanepoel%0AARQUD (PTY) LTD`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 pt-6 pb-8 px-4">
      {/* Action bar */}
      <div className="w-full max-w-[210mm]">
        <div className="flex flex-wrap items-center justify-between gap-y-2 mb-3">
          <Pill tone={STATUS_TONE[invoice.status] ?? "neutral"}>{invoice.status}</Pill>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {(invoice.status === "pending" || invoice.status === "overdue") && (
              <button disabled={pending}
                onClick={() => start(() => markInvoicePaid(invoice.id, new Date().toISOString().split("T")[0]).then(onClose))}
                className="text-xs text-green-400 hover:text-green-300 uppercase tracking-widest disabled:opacity-50">
                Mark Paid
              </button>
            )}
            <a href={mailtoUrl} className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">
              Send Email
            </a>
            <button onClick={() => setShowPdf(true)} className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">
              View PDF
            </button>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm">Download PDF</Button>
            </a>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 uppercase tracking-widest">Delete?</span>
                <button
                  disabled={pending}
                  onClick={() => start(async () => { await deleteInvoice(invoice.id); onClose(); })}
                  className="text-xs text-red-400 border border-red-400/60 px-3 py-1 hover:bg-red-900/30 uppercase tracking-widest disabled:opacity-50 rounded-control"
                >
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-arqud-muted uppercase tracking-widest hover:text-arqud-bone">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400/60 hover:text-red-400 uppercase tracking-widest">
                Delete
              </button>
            )}
            <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl ml-1">✕</button>
          </div>
        </div>

        {/* Invoice document */}
        <div style={{ backgroundColor: "#FDFBF8", fontFamily: "'Jost', sans-serif", color: "#1A1814", boxShadow: "0 20px 80px rgba(0,0,0,0.3)" }}>
          {/* Header band */}
          <div style={{ backgroundColor: "#0D0D12", padding: "10mm 14mm 9mm", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: "#E2C98A" }}>ARQUD</p>
              <p style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(200,169,110,0.45)", marginTop: 3 }}>DIGITAL MARKETING AGENCY</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 34, fontWeight: 300, color: "#fff", letterSpacing: "0.04em", fontFamily: "serif" }}>Tax Invoice</p>
              <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(200,169,110,0.6)", marginTop: 4 }}>{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Gold rule */}
          <div style={{ height: 2, background: "linear-gradient(90deg, #C8A96E, #9A8058)" }} />

          {/* Meta row */}
          <div style={{ backgroundColor: "#111520", padding: "4.5mm 14mm", display: "flex" }}>
            {[
              { label: "INVOICE DATE", val: fmtDate(invoice.issue_date) },
              { label: "DUE DATE", val: fmtDate(invoice.due_date) },
              { label: "TERMS", val: invoice.terms || "14 Days" },
            ].map(({ label, val }) => (
              <div key={label} style={{ flex: 1, borderRight: "1px solid rgba(200,169,110,0.12)", paddingRight: "8mm", paddingLeft: "8mm" }}>
                <p style={{ fontSize: 7, letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 10.5, fontWeight: 500, color: "rgba(253,251,248,0.9)" }}>{val}</p>
              </div>
            ))}
            <div style={{ flex: 1, paddingLeft: "8mm" }}>
              <p style={{ fontSize: 7, letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: 2 }}>AMOUNT DUE</p>
              <p style={{ fontSize: 15, fontStyle: "italic", color: "#E2C98A", fontFamily: "serif" }}>{fmt(invoice.amount)}</p>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "9mm 14mm", display: "flex", flexDirection: "column", gap: "7mm" }}>
            {/* Parties */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5mm" }}>
              {[
                {
                  label: "BILLED FROM",
                  name: "ARQUD (PTY) LTD",
                  lines: ["Morne Swanepoel", "Morne@arqud.com", "Reg No: 2025/074398/07", "Tel: +27 60 865 8690", "Bank: FNB Gold Business", "Acc: 63195766482"],
                },
                {
                  label: "BILLED TO",
                  name: client?.company ?? client?.name ?? "—",
                  lines: [
                    client?.contact_person ? `Attn: ${client.contact_person}` : null,
                    client?.email ?? "",
                    client?.address ?? null,
                    client?.reg_number ? `Reg No: ${client.reg_number}` : null,
                    client?.vat_number ? `VAT No: ${client.vat_number}` : null,
                  ].filter(Boolean) as string[],
                },
              ].map(({ label, name, lines }) => (
                <div key={label} style={{ backgroundColor: "#fff", border: "1px solid #E4DDD0", borderLeft: "3px solid #C8A96E", padding: "5mm" }}>
                  <p style={{ fontSize: 7.5, letterSpacing: "0.28em", color: "#9A8058", marginBottom: "4mm", paddingLeft: "4mm" }}>{label}</p>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#0D0D12", letterSpacing: "0.04em", marginBottom: "1.5mm", paddingLeft: "4mm" }}>{name}</p>
                  {lines.map((l, i) => <p key={i} style={{ fontSize: 9, lineHeight: 1.85, color: "#5A5650", paddingLeft: "4mm" }}>{l}</p>)}
                </div>
              ))}
            </div>

            {/* Line items */}
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", backgroundColor: "#0D0D12", padding: "3mm 5mm" }}>
                {["DESCRIPTION", "RATE", "AMOUNT"].map((h, i) => (
                  <p key={h} style={{ fontSize: 7.5, letterSpacing: "0.22em", color: "rgba(200,169,110,0.65)", textAlign: i > 0 ? "right" : "left" }}>{h}</p>
                ))}
              </div>
              {sorted.length > 0 ? sorted.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", backgroundColor: "#fff", padding: "4.5mm 5mm", borderBottom: "1px solid #E4DDD0", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#1A1814" }}>{item.description}</p>
                    {item.detail && <p style={{ fontSize: 8.5, color: "#9A9590", marginTop: 2 }}>{item.detail}</p>}
                  </div>
                  <p style={{ fontSize: 11, textAlign: "right", color: "#1A1814" }}>{fmt(item.rate)}</p>
                  <p style={{ fontSize: 11, textAlign: "right", color: "#1A1814" }}>{fmt(item.amount)}</p>
                </div>
              )) : (
                <div style={{ backgroundColor: "#fff", padding: "4.5mm 5mm", borderBottom: "1px solid #E4DDD0", textAlign: "center" }}>
                  <p style={{ fontSize: 9, color: "#9A9590" }}>No line items</p>
                </div>
              )}
            </div>

            {/* Totals */}
            <div style={{ marginLeft: "auto", width: "320px" }}>
              {[
                { label: "SUBTOTAL", val: fmt(invoice.subtotal || invoice.amount) },
                { label: `VAT (${invoice.vat_rate ?? 0}%)`, val: fmt(invoice.vat_amount || 0) },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "2.5mm 5mm", borderBottom: "1px solid #E4DDD0", backgroundColor: "#fff" }}>
                  <p style={{ fontSize: 9, letterSpacing: "0.1em", color: "#5A5650" }}>{label}</p>
                  <p style={{ fontSize: 11, color: "#1A1814" }}>{val}</p>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4mm 5mm", backgroundColor: "#0D0D12" }}>
                <p style={{ fontSize: 8.5, letterSpacing: "0.2em", color: "rgba(200,169,110,0.6)", fontWeight: 600 }}>TOTAL DUE</p>
                <p style={{ fontFamily: "serif", fontSize: 22, fontStyle: "italic", color: "#E2C98A" }}>{fmt(invoice.amount)}</p>
              </div>
            </div>

            {/* Banking + Note */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5mm" }}>
              <div style={{ backgroundColor: "#F7F3EE", border: "1px solid #E4DDD0", padding: "4.5mm 5mm" }}>
                <p style={{ fontSize: 7.5, letterSpacing: "0.26em", color: "#9A8058", marginBottom: "3.5mm" }}>BANKING DETAILS</p>
                <p style={{ fontWeight: 600, fontSize: 10, color: "#0D0D12", marginBottom: "1mm" }}>FNB Gold Business Account</p>
                <p style={{ fontSize: 9, lineHeight: 1.9, color: "#5A5650" }}>Account Holder: ARQUD (PTY) LTD</p>
                <p style={{ fontSize: 9, lineHeight: 1.9, color: "#5A5650" }}>Account Number: 63195766482</p>
                <p style={{ fontSize: 9, lineHeight: 1.9, color: "#5A5650" }}>Branch Code: 255355</p>
                <p style={{ fontSize: 9, fontStyle: "italic", color: "#9A9590" }}>Reference: {invoice.invoice_number}</p>
              </div>
              <div style={{ backgroundColor: "#F7F3EE", border: "1px solid #E4DDD0", padding: "4.5mm 5mm" }}>
                <p style={{ fontSize: 7.5, letterSpacing: "0.26em", color: "#9A8058", marginBottom: "3.5mm" }}>NOTE</p>
                <p style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 13, lineHeight: 1.65, color: "#5A5650" }}>
                  {invoice.notes ?? `Please use the invoice number as your payment reference. Payment is due within ${invoice.terms || "14 Days"} of invoice date.`}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: "#0D0D12", padding: "4mm 14mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 8, color: "rgba(253,251,248,0.3)", letterSpacing: "0.12em" }}>Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07</p>
            <p style={{ fontSize: 8, color: "rgba(200,169,110,0.4)", letterSpacing: "0.18em" }}>THANK YOU FOR YOUR BUSINESS</p>
          </div>
        </div>
      </div>

      {showPdf && (
        <PdfViewerModal
          src={`${pdfUrl}?inline=1`}
          downloadHref={pdfUrl}
          title={`Invoice ${invoice.invoice_number}`}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}
