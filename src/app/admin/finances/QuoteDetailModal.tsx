"use client";

import { useTransition, useState } from "react";
import { updateQuoteStatus } from "./actions";
import { ConvertModal } from "./ConvertModal";
import type { QuoteWithItems } from "@/lib/invoices/types";

const STATUS: Record<string, string> = {
  draft: "text-arqud-muted border-arqud-muted",
  sent: "text-arqud-gold border-arqud-gold",
  accepted: "text-green-400 border-green-400",
  rejected: "text-red-400 border-red-400",
};

function fmt(n: number) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function QuoteDetailModal({ quote, onClose }: { quote: QuoteWithItems; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [converting, setConverting] = useState(false);
  const client = quote.client;
  const pdfUrl = `/api/quotes/${quote.id}/pdf`;
  const sorted = [...(quote.line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const mailtoUrl = `mailto:${client?.email ?? ""}?subject=Quote ${quote.quote_number} from ARQUD (PTY) LTD&body=Dear ${client?.company ?? client?.name ?? ""},%0A%0APlease find your quote ${quote.quote_number} attached.%0A%0ATotal (excl. VAT): ${fmt(quote.total)}%0A%0AKind regards,%0AMorne Swanepoel%0AARQUD (PTY) LTD`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 pt-6 pb-8 px-4">
      {converting && <ConvertModal quote={quote} onClose={() => { setConverting(false); onClose(); }} />}
      <div className="w-full max-w-[210mm]">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS[quote.status] ?? ""}`}>
            {quote.status}
          </span>
          <div className="flex items-center gap-3">
            {quote.status === "draft" && (
              <button disabled={pending}
                onClick={() => start(() => updateQuoteStatus(quote.id, "sent"))}
                className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest disabled:opacity-50">
                Mark Sent
              </button>
            )}
            {quote.status === "accepted" && !quote.converted_to_invoice_id && (
              <button onClick={() => setConverting(true)}
                className="text-xs text-green-400 hover:text-green-300 uppercase tracking-widest">
                Convert to Invoice
              </button>
            )}
            <a href={mailtoUrl} className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">
              Send Email
            </a>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="bg-arqud-gold px-5 py-2 text-xs font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
              Download PDF
            </a>
            <button onClick={onClose} className="text-arqud-muted hover:text-white text-xl ml-1">✕</button>
          </div>
        </div>

        <div style={{ backgroundColor: "#FDFBF8", fontFamily: "'Jost', sans-serif", color: "#1A1814", boxShadow: "0 20px 80px rgba(0,0,0,0.3)" }}>
          <div style={{ backgroundColor: "#0D0D12", padding: "10mm 14mm 9mm", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: "#E2C98A" }}>ARQUD</p>
              <p style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(200,169,110,0.45)", marginTop: 3 }}>DIGITAL MARKETING AGENCY</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 34, fontWeight: 300, color: "#fff", fontFamily: "serif" }}>Quote</p>
              <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(200,169,110,0.6)", marginTop: 4 }}>{quote.quote_number}</p>
            </div>
          </div>
          <div style={{ height: 2, background: "linear-gradient(90deg, #C8A96E, #9A8058)" }} />
          <div style={{ backgroundColor: "#111520", padding: "4.5mm 14mm", display: "flex" }}>
            {[
              { label: "QUOTE DATE", val: fmtDate(quote.issue_date) },
              { label: "STATUS", val: quote.status.toUpperCase() },
            ].map(({ label, val }) => (
              <div key={label} style={{ flex: 1, borderRight: "1px solid rgba(200,169,110,0.12)", paddingRight: "8mm", paddingLeft: "8mm" }}>
                <p style={{ fontSize: 7, letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 10.5, fontWeight: 500, color: "rgba(253,251,248,0.9)" }}>{val}</p>
              </div>
            ))}
            <div style={{ flex: 1, paddingLeft: "8mm" }}>
              <p style={{ fontSize: 7, letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: 2 }}>TOTAL (EXCL. VAT)</p>
              <p style={{ fontSize: 15, fontStyle: "italic", color: "#E2C98A", fontFamily: "serif" }}>{fmt(quote.total)}</p>
            </div>
          </div>

          <div style={{ padding: "9mm 14mm", display: "flex", flexDirection: "column", gap: "7mm" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5mm" }}>
              {[
                { label: "FROM", name: "ARQUD (PTY) LTD", lines: ["Morne Swanepoel", "Morne@arqud.com", "Reg No: 2025/074398/07", "Tel: +27 60 865 8690"] },
                { label: "PREPARED FOR", name: client?.company ?? client?.name ?? "—",
                  lines: [client?.contact_person ? `Attn: ${client.contact_person}` : null, client?.email ?? "", client?.address ?? null].filter(Boolean) as string[] },
              ].map(({ label, name, lines }) => (
                <div key={label} style={{ backgroundColor: "#fff", border: "1px solid #E4DDD0", borderLeft: "3px solid #C8A96E", padding: "5mm" }}>
                  <p style={{ fontSize: 7.5, letterSpacing: "0.28em", color: "#9A8058", marginBottom: "4mm", paddingLeft: "4mm" }}>{label}</p>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#0D0D12", marginBottom: "1.5mm", paddingLeft: "4mm" }}>{name}</p>
                  {lines.map((l, i) => <p key={i} style={{ fontSize: 9, lineHeight: 1.85, color: "#5A5650", paddingLeft: "4mm" }}>{l}</p>)}
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", backgroundColor: "#0D0D12", padding: "3mm 5mm" }}>
                {["DESCRIPTION", "RATE", "AMOUNT"].map((h, i) => (
                  <p key={h} style={{ fontSize: 7.5, letterSpacing: "0.22em", color: "rgba(200,169,110,0.65)", textAlign: i > 0 ? "right" : "left" }}>{h}</p>
                ))}
              </div>
              {sorted.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", backgroundColor: "#fff", padding: "4.5mm 5mm", borderBottom: "1px solid #E4DDD0", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#1A1814" }}>{item.description}</p>
                    {item.detail && <p style={{ fontSize: 8.5, color: "#9A9590", marginTop: 2 }}>{item.detail}</p>}
                  </div>
                  <p style={{ fontSize: 11, textAlign: "right", color: "#1A1814" }}>{fmt(item.rate)}</p>
                  <p style={{ fontSize: 11, textAlign: "right", color: "#1A1814" }}>{fmt(item.amount)}</p>
                </div>
              ))}
            </div>

            <div style={{ marginLeft: "auto", width: "320px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4mm 5mm", backgroundColor: "#0D0D12" }}>
                <p style={{ fontSize: 8.5, letterSpacing: "0.2em", color: "rgba(200,169,110,0.6)", fontWeight: 600 }}>TOTAL</p>
                <p style={{ fontFamily: "serif", fontSize: 22, fontStyle: "italic", color: "#E2C98A" }}>{fmt(quote.total)}</p>
              </div>
            </div>
            <p style={{ textAlign: "right", fontSize: 8.5, color: "#9A9590", fontStyle: "italic" }}>VAT (15%) will be added upon invoice conversion.</p>

            {quote.notes && (
              <div style={{ backgroundColor: "#F7F3EE", border: "1px solid #E4DDD0", padding: "4.5mm 5mm" }}>
                <p style={{ fontSize: 7.5, letterSpacing: "0.26em", color: "#9A8058", marginBottom: "3.5mm" }}>NOTES</p>
                <p style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 13, lineHeight: 1.65, color: "#5A5650" }}>{quote.notes}</p>
              </div>
            )}
          </div>

          <div style={{ backgroundColor: "#0D0D12", padding: "4mm 14mm", display: "flex", justifyContent: "space-between" }}>
            <p style={{ fontSize: 8, color: "rgba(253,251,248,0.3)" }}>Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07</p>
            <p style={{ fontSize: 8, color: "rgba(200,169,110,0.4)", letterSpacing: "0.18em" }}>THANK YOU FOR YOUR BUSINESS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
