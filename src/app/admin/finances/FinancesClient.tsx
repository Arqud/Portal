"use client";

import { useState, useMemo } from "react";
import { InvoiceTable } from "./InvoiceTable";
import { QuoteTable } from "./QuoteTable";
import { InvoiceForm } from "./InvoiceForm";
import { QuoteForm } from "./QuoteForm";
import { TransactionsTab } from "./TransactionsTab";
import { KpiCard, Tabs, Button, Select } from "@/components/ui";
import { businessKey } from "@/lib/business/persist";
import type { InvoiceWithItems, QuoteWithItems, Client } from "@/lib/invoices/types";
import type { Transaction } from "./transactionActions";

type Props = {
  invoices: InvoiceWithItems[];
  quotes: QuoteWithItems[];
  clients: Client[];
  transactions: Transaction[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

export function FinancesClient({ invoices, quotes, clients, transactions }: Props) {
  const now = new Date();
  const [tab, setTab] = useState<"invoices" | "quotes" | "transactions">("invoices");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-based
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAllTime, setShowAllTime] = useState(true);
  const [businessFilter, setBusinessFilter] = useState<"all" | "arqud" | "sa_equipment">("all");

  // Master books: the register carries both businesses; this narrows it per
  // business (each row is tagged for the accountant). Untagged rows read as ARQUD,
  // so before the migration everything shows as ARQUD.
  const scopedInvoices = useMemo(
    () => (businessFilter === "all" ? invoices : invoices.filter((i) => businessKey(i.business) === businessFilter)),
    [invoices, businessFilter],
  );
  const scopedQuotes = useMemo(
    () => (businessFilter === "all" ? quotes : quotes.filter((q) => businessKey(q.business) === businessFilter)),
    [quotes, businessFilter],
  );

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
    if (showAllTime) return scopedInvoices;
    return scopedInvoices.filter((inv) => {
      const d = new Date(inv.issue_date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [scopedInvoices, selectedMonth, selectedYear, showAllTime]);

  const filteredQuotes = useMemo(() => {
    if (showAllTime) return scopedQuotes;
    return scopedQuotes.filter((q) => {
      const d = new Date(q.issue_date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [scopedQuotes, selectedMonth, selectedYear, showAllTime]);

  // Revenue summary for selected period
  const invoicedPeriod = filteredInvoices.filter((i) => i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const collectedPeriod = filteredInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = scopedInvoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdue = scopedInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const ytd = scopedInvoices.filter((i) => {
    return i.issue_date.startsWith(String(selectedYear)) && i.status !== "draft";
  }).reduce((s, i) => s + i.amount, 0);

  const periodLabel = showAllTime
    ? "All time"
    : `${MONTHS[selectedMonth]} ${selectedYear}`;

  const TAB_LABELS: { value: "invoices" | "quotes" | "transactions"; label: string }[] = [
    { value: "invoices", label: `Invoices (${filteredInvoices.length})` },
    { value: "quotes", label: `Quotes (${filteredQuotes.length})` },
    { value: "transactions", label: `Bank Transactions${transactions.length > 0 ? ` (${transactions.length})` : ""}` },
  ];

  return (
    <div>
      {showInvoice && <InvoiceForm clients={clients} onClose={() => setShowInvoice(false)} />}
      {showQuote && <QuoteForm clients={clients} onClose={() => setShowQuote(false)} />}

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-xs uppercase tracking-widest text-arqud-muted">Business:</span>
        <Select value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value as "all" | "arqud" | "sa_equipment")} className="w-auto">
          <option value="all">All businesses</option>
          <option value="arqud">ARQUD</option>
          <option value="sa_equipment">SA Equipment</option>
        </Select>
        <span className="text-xs uppercase tracking-widest text-arqud-muted ml-2">Period:</span>

        {!showAllTime && (
          <>
            <Select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-auto">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </Select>
            <Select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-auto">
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </>
        )}

        <Button variant={showAllTime ? "outline" : "ghost"} size="sm" onClick={() => setShowAllTime((p) => !p)}>
          {showAllTime ? "All time ✓" : "All time"}
        </Button>

        <span className="text-xs text-arqud-muted ml-2">
          {filteredInvoices.filter((i) => i.status !== "draft").length} invoice(s) ·{" "}
          {filteredQuotes.length} quote(s)
        </span>
      </div>

      {/* Revenue summary for the period */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
        <KpiCard label={`Invoiced — ${periodLabel}`} value={fmt(invoicedPeriod)} />
        <KpiCard label={`Collected — ${periodLabel}`} value={fmt(collectedPeriod)} />
        <KpiCard
          label="Outstanding (all)"
          value={fmt(outstanding)}
          trend={outstanding > 0 ? { dir: "down", text: "needs follow-up" } : undefined}
        />
        <KpiCard
          label="Overdue (all)"
          value={fmt(overdue)}
          trend={overdue > 0 ? { dir: "down", text: "past due date" } : undefined}
        />
        <KpiCard label={`YTD ${selectedYear}`} value={fmt(ytd)} />
      </div>

      {/* Sub-tabs */}
      <div className="mb-8">
        <Tabs
          tabs={TAB_LABELS.map((t) => t.label)}
          value={TAB_LABELS.find((t) => t.value === tab)!.label}
          onChange={(label) => {
            const found = TAB_LABELS.find((t) => t.label === label)!;
            setTab(found.value);
          }}
        />
      </div>

      {tab === "invoices" && (
        <InvoiceTable invoices={filteredInvoices} clients={clients} onNew={() => setShowInvoice(true)} />
      )}
      {tab === "quotes" && (
        <QuoteTable quotes={filteredQuotes} clients={clients} onNew={() => setShowQuote(true)} />
      )}
      {tab === "transactions" && (
        <TransactionsTab transactions={transactions} />
      )}
    </div>
  );
}
