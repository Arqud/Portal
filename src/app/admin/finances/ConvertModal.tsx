"use client";

import { useState, useTransition } from "react";
import { convertQuoteToInvoice } from "./actions";
import { Card, Input, Button } from "@/components/ui";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <Card className="w-full max-w-md space-y-6">
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
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={handle} disabled={isPending} className="flex-1 justify-center">
            {isPending ? "Converting..." : "Confirm & Convert"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 justify-center">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
