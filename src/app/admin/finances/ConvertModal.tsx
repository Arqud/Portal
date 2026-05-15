"use client";

import { useState, useTransition } from "react";
import { convertQuoteToInvoice } from "./actions";
import type { QuoteWithItems } from "@/lib/invoices/types";

export function ConvertModal({ quote, onClose }: { quote: QuoteWithItems; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const due14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(due14);
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

  function handle() {
    setErr("");
    start(async () => {
      try {
        await convertQuoteToInvoice(quote.id, issueDate, dueDate);
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md bg-arqud-night border border-arqud-ink p-8 space-y-6">
        <h2 className="font-display text-2xl text-arqud-gold">Convert to Invoice</h2>
        <p className="text-sm text-arqud-bone">
          Converting <span className="text-arqud-gold">{quote.quote_number}</span> —{" "}
          {quote.line_items.length} line item(s), R{" "}
          {quote.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} excl. VAT.
        </p>
        <p className="text-xs text-arqud-muted">VAT (15%) will be added. A new INV number is assigned.</p>
        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Invoice Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={handle} disabled={isPending}
            className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
            {isPending ? "Converting..." : "Confirm & Convert"}
          </button>
          <button onClick={onClose}
            className="flex-1 border border-arqud-ink py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
