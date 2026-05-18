"use client";

import { useState, useMemo } from "react";
import { InvoiceTable } from "./InvoiceTable";
import { QuoteTable } from "./QuoteTable";
import { InvoiceForm } from "./InvoiceForm";
import { QuoteForm } from "./QuoteForm";
import { RevenueSummary } from "./RevenueSummary";
import type { InvoiceWithItems, QuoteWithItems, Client } from "@/lib/invoices/types";

type Props = {
  invoices: InvoiceWithItems[];
  quotes: QuoteWithItems[];
  clients: Client[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

export function FinancesClient({ invoices, quotes, clients }: Props) {
  const now = new Date();
  const [tab, setTab] = useState<"invoices" | "quotes">("invoices");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-based
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAllTime, setShowAllTime] = useState(false);

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    [...invoices, ...quotes].forEach((d) => {
      const date = "issue_date" in d ? d.issue_date : (d as QuoteWithItems).issue_date;
      if (date) years.add(new Date(date).getFullYear());
    });
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, quotes]);

  // Filter by selected month/year
  const filteredInvoices = useMemo(() => {
    if (showAllTime) return invoices;
    return invoices.filter((inv) => {
      const d = new Date(inv.issue_date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [invoices, selectedMonth, selectedYear, showAllTime]);

  const filteredQuotes = useMemo(() => {
    if (showAllTime) return quotes;
    return quotes.filter((q) => {
      const d = new Date(q.issue_date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [quotes, selectedMonth, selectedYear, showAllTime]);

  // Revenue summary for selected period
  const invoicedPeriod = filteredInvoices.filter((i) => i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const collectedPeriod = filteredInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const ytd = invoices.filter((i) => {
    return i.issue_date.startsWith(String(selectedYear)) && i.status !== "draft";
  }).reduce((s, i) => s + i.amount, 0);

  const periodLabel = showAllTime
    ? "All time"
    : `${MONTHS[selectedMonth]} ${selectedYear}`;

  return (
    <div>
      {showInvoice && <InvoiceForm clients={clients} onClose={() => setShowInvoice(false)} />}
      {showQuote && <QuoteForm clients={clients} onClose={() => setShowQuote(false)} />}

      {/* Period selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs uppercase tracking-widest text-arqud-muted">Period:</span>

        {!showAllTime && (
          <>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-arqud-night border border-arqud-ink px-4 py-2 text-arqud-bone text-sm focus:border-arqud-gold focus:outline-none">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-arqud-night border border-arqud-ink px-4 py-2 text-arqud-bone text-sm focus:border-arqud-gold focus:outline-none">
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}

        <button onClick={() => setShowAllTime((p) => !p)}
          className={`text-xs uppercase tracking-widest border px-3 py-2 transition-colors ${
            showAllTime
              ? "border-arqud-gold text-arqud-gold"
              : "border-arqud-ink text-arqud-muted hover:border-arqud-gold hover:text-arqud-gold"
          }`}>
          {showAllTime ? "All time ✓" : "All time"}
        </button>

        <span className="text-xs text-arqud-muted ml-2">
          {filteredInvoices.filter((i) => i.status !== "draft").length} invoice(s) ·{" "}
          {filteredQuotes.length} quote(s)
        </span>
      </div>

      {/* Revenue summary for the period */}
      <div className="grid grid-cols-5 gap-px bg-arqud-ink border border-arqud-ink mb-8">
        {[
          { label: `Invoiced — ${periodLabel}`, value: fmt(invoicedPeriod), color: "text-arqud-bone" },
          { label: `Collected — ${periodLabel}`, value: fmt(collectedPeriod), color: "text-green-400" },
          { label: "Outstanding (all)", value: fmt(outstanding), color: outstanding > 0 ? "text-arqud-gold" : "text-arqud-bone" },
          { label: "Overdue (all)", value: fmt(overdue), color: overdue > 0 ? "text-red-400" : "text-arqud-bone" },
          { label: `YTD ${selectedYear}`, value: fmt(ytd), color: "text-arqud-bone" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-arqud-night px-5 py-5">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2 leading-tight">{label}</p>
            <p className={`font-display text-2xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-arqud-ink mb-8">
        {(["invoices", "quotes"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-8 py-3 text-sm uppercase tracking-widest border-b-2 transition-colors ${
              tab === t
                ? "border-arqud-gold text-arqud-gold"
                : "border-transparent text-arqud-muted hover:text-arqud-bone"
            }`}>
            {t} {t === "invoices" ? `(${filteredInvoices.length})` : `(${filteredQuotes.length})`}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <InvoiceTable invoices={filteredInvoices} onNew={() => setShowInvoice(true)} />
      )}
      {tab === "quotes" && (
        <QuoteTable quotes={filteredQuotes} onNew={() => setShowQuote(true)} />
      )}
    </div>
  );
}
