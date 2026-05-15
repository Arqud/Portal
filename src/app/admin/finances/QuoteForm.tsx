"use client";

import { useState, useTransition } from "react";
import { createQuote } from "./actions";
import type { Client, LineItem } from "@/lib/invoices/types";
import { calcLineAmount, calcSubtotal } from "@/lib/invoices/calculations";

const emptyLine = (): Omit<LineItem, "id"> => ({
  description: "", detail: "", rate: 0, quantity: 1, amount: 0, sort_order: 0,
});

export function QuoteForm({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Omit<LineItem, "id">[]>([emptyLine()]);
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

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

  function submit(isDraft: boolean) {
    if (!clientId) { setErr("Select a client."); return; }
    const valid = lines.filter((l) => l.description.trim());
    if (!valid.length) { setErr("Add at least one line item."); return; }
    setErr("");
    start(async () => {
      try {
        await createQuote({
          clientId, issueDate, notes,
          lineItems: valid.map((l, i) => ({ ...l, sort_order: i })),
          isDraft,
        });
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none";
  const smallCls = "bg-arqud-black border border-arqud-ink px-2 py-2 text-arqud-bone text-sm focus:border-arqud-gold focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-8 pb-8 px-4">
      <div className="w-full max-w-2xl bg-arqud-night border border-arqud-ink p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-arqud-gold">New Quote</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Client</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Quote Date</label>
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
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

        <div className="border-t border-arqud-ink pt-4 text-right">
          <p className="text-sm text-arqud-muted">Total (excl. VAT):</p>
          <p className="font-display text-2xl text-arqud-gold">R {subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-arqud-muted mt-1">VAT (15%) added upon invoice conversion.</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className={`${inputCls} resize-none`} />
        </div>

        <div className="flex gap-4">
          <button onClick={() => submit(false)} disabled={isPending}
            className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
            {isPending ? "Creating..." : "Create Quote"}
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
