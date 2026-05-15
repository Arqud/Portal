"use client";

import { useState } from "react";
import { InvoiceTable } from "./InvoiceTable";
import { QuoteTable } from "./QuoteTable";
import { InvoiceForm } from "./InvoiceForm";
import { QuoteForm } from "./QuoteForm";
import type { InvoiceWithItems, QuoteWithItems, Client } from "@/lib/invoices/types";

type Props = {
  invoices: InvoiceWithItems[];
  quotes: QuoteWithItems[];
  clients: Client[];
};

export function FinancesClient({ invoices, quotes, clients }: Props) {
  const [tab, setTab] = useState<"invoices" | "quotes">("invoices");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showQuote, setShowQuote] = useState(false);

  return (
    <div>
      {showInvoice && <InvoiceForm clients={clients} onClose={() => setShowInvoice(false)} />}
      {showQuote && <QuoteForm clients={clients} onClose={() => setShowQuote(false)} />}

      <div className="flex gap-0 border-b border-arqud-ink mb-8">
        {(["invoices", "quotes"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-8 py-3 text-sm uppercase tracking-widest border-b-2 transition-colors ${
              tab === t
                ? "border-arqud-gold text-arqud-gold"
                : "border-transparent text-arqud-muted hover:text-arqud-bone"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <InvoiceTable invoices={invoices} onNew={() => setShowInvoice(true)} />
      )}
      {tab === "quotes" && (
        <QuoteTable quotes={quotes} onNew={() => setShowQuote(true)} />
      )}
    </div>
  );
}
