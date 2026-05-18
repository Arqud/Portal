"use client";

import { useState, useTransition } from "react";
import { createInvoice } from "./actions";
import type { Client, LineItem } from "@/lib/invoices/types";
import { calcLineAmount, calcSubtotal, calcVat, calcTotal } from "@/lib/invoices/calculations";

const emptyLine = (): Omit<LineItem, "id"> => ({
  description: "", detail: "", rate: 0, quantity: 1, amount: 0, sort_order: 0,
});

type CreatedInvoice = { id: string; invoiceNumber: string };

export function InvoiceForm({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const due14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(due14);
  const [terms, setTerms] = useState("14 Days");
  const [notes, setNotes] = useState("");
  const [chargeVat, setChargeVat] = useState(true);
  const [vatRate, setVatRate] = useState(15);
  const [lines, setLines] = useState<Omit<LineItem, "id">[]>([emptyLine()]);
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<CreatedInvoice | null>(null);

  function updateLine(i: number, field: string, value: string | number) {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[i], [field]: value };
      line.amount = calcLineAmount(Number(line.rate), Number(line.quantity));
      next[i] = line;
      return next;
    });
  }

  const subtotal = calcSubtotal(lines);
  const effectiveVatRate = chargeVat ? vatRate : 0;
  const vatAmt = calcVat(subtotal, effectiveVatRate);
  const total = calcTotal(subtotal, vatAmt);

  const selectedClient = clients.find((c) => c.id === clientId);

  function submit(isDraft: boolean) {
    if (!clientId) { setErr("Select a client."); return; }
    const valid = lines.filter((l) => l.description.trim());
    if (!valid.length) { setErr("Add at least one line item."); return; }
    setErr("");
    start(async () => {
      try {
        const result = await createInvoice({
          clientId, issueDate, dueDate, terms, notes, vatRate: effectiveVatRate,
          lineItems: valid.map((l, i) => ({ ...l, sort_order: i })),
          isDraft,
        });
        if (!isDraft && result) {
          setCreated({ id: result.id, invoiceNumber: result.invoiceNumber ?? "" });
        } else {
          onClose();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";
  const smallCls = "bg-arqud-black border border-arqud-ink px-2 py-2 text-arqud-bone text-sm focus:border-arqud-gold focus:outline-none";

  // Success state — show after invoice created
  if (created) {
    const clientEmail = selectedClient?.email ?? "";
    const clientName = selectedClient?.company ?? selectedClient?.name ?? "";
    const pdfUrl = `/api/invoices/${created.id}/pdf`;
    const mailtoUrl = `mailto:${clientEmail}?subject=Invoice ${created.invoiceNumber} from ARQUD (PTY) LTD&body=Dear ${clientName},%0A%0APlease find your invoice ${created.invoiceNumber} attached.%0A%0AAmount due: R ${total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}%0ADue date: ${dueDate}%0A%0AYou can download your invoice here:%0A${pdfUrl}%0A%0AKind regards,%0AMorne Swanepoel%0AARQUD (PTY) LTD`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-md bg-arqud-night border border-arqud-ink p-8 space-y-6 text-center">
          <div>
            <p className="text-green-400 text-4xl mb-4">✓</p>
            <h2 className="font-display text-3xl text-arqud-gold">{created.invoiceNumber}</h2>
            <p className="text-arqud-bone mt-2">Invoice created successfully</p>
            <p className="text-arqud-muted text-sm mt-1">
              R {total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} · Due {dueDate}
            </p>
          </div>

          <div className="space-y-3">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="block w-full bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
              Preview &amp; Download PDF
            </a>
            <a href={mailtoUrl}
              className="block w-full border border-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-gold hover:bg-arqud-gold hover:text-arqud-black">
              Send via Email
            </a>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => { setCreated(null); setLines([emptyLine()]); setNotes(""); }}
                className="border border-arqud-ink py-2 text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-bone">
                New Invoice
              </button>
              <button onClick={onClose}
                className="border border-arqud-ink py-2 text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-bone">
                Back to Finances
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-8 pb-8 px-4">
      <div className="w-full max-w-2xl bg-arqud-night border border-arqud-ink p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-arqud-gold">New Invoice</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Client</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Invoice Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Terms</label>
            <input type="text" value={terms} onChange={(e) => setTerms(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <div className="grid grid-cols-12 gap-2 mb-2">
            <span className="col-span-5 text-xs uppercase tracking-widest text-arqud-muted">Description</span>
            <span className="col-span-3 text-xs uppercase tracking-widest text-arqud-muted">Detail</span>
            <span className="col-span-1 text-xs uppercase tracking-widest text-arqud-muted text-right">Qty</span>
            <span className="col-span-2 text-xs uppercase tracking-widest text-arqud-muted text-right">Rate (R)</span>
            <span className="col-span-1" />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2">
              <input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)}
                placeholder="Service description" className={`col-span-5 ${smallCls}`} />
              <input value={line.detail ?? ""} onChange={(e) => updateLine(i, "detail", e.target.value)}
                placeholder="Period / detail" className={`col-span-3 ${smallCls}`} />
              <input type="number" value={line.quantity} min={1} step={0.5}
                onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 1)}
                className={`col-span-1 text-right ${smallCls}`} />
              <input type="number" value={line.rate} min={0} step={100}
                onChange={(e) => updateLine(i, "rate", parseFloat(e.target.value) || 0)}
                className={`col-span-2 text-right ${smallCls}`} />
              <button onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                disabled={lines.length === 1}
                className="col-span-1 text-arqud-muted hover:text-red-400 disabled:opacity-20 text-center">✕</button>
            </div>
          ))}
          <button onClick={() => setLines((p) => [...p, emptyLine()])}
            className="text-sm text-arqud-gold border border-arqud-gold px-4 py-2 mt-2 hover:bg-arqud-gold hover:text-arqud-black">
            + Add line
          </button>
        </div>

        {/* VAT toggle + totals */}
        <div className="border-t border-arqud-ink pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-arqud-muted">Subtotal</span>
            <span className="text-arqud-bone">R {subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="charge-vat" checked={chargeVat}
                onChange={(e) => setChargeVat(e.target.checked)}
                className="w-4 h-4 accent-arqud-gold" />
              <label htmlFor="charge-vat" className="text-arqud-muted cursor-pointer">Charge VAT</label>
              {chargeVat && (
                <div className="flex items-center gap-1">
                  <input type="number" value={vatRate} min={0} max={100} step={1}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    className="w-14 bg-arqud-black border border-arqud-ink px-2 py-1 text-arqud-bone text-xs text-right focus:border-arqud-gold focus:outline-none" />
                  <span className="text-arqud-muted text-xs">%</span>
                </div>
              )}
            </div>
            <span className="text-arqud-bone">
              {chargeVat
                ? `R ${vatAmt.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                : <span className="text-arqud-muted">R 0.00 (zero-rated)</span>
              }
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-arqud-muted text-sm font-semibold">Total</span>
            <span className="font-display text-2xl text-arqud-gold">R {total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className={`${inputCls} resize-none`} />
        </div>

        <div className="flex gap-4">
          <button onClick={() => submit(false)} disabled={isPending}
            className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
            {isPending ? "Creating..." : "Create Invoice"}
          </button>
          <button onClick={() => submit(true)} disabled={isPending}
            className="flex-1 border border-arqud-ink py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone disabled:opacity-50">
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}
