"use client";

import { useRef, useState, useTransition } from "react";
import { uploadTransactionsCsv } from "./transactionActions";
import { KpiCard, Table, Tr, Td } from "@/components/ui";
import type { Transaction } from "./transactionActions";

function fmt(n: number) {
  return `R ${Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  transactions: Transaction[];
};

export function TransactionsTab({ transactions: initial }: Props) {
  const [transactions, setTransactions] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const latestBalance = transactions.length > 0 ? transactions[0].balance : null;

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setStatus({ type: "error", message: "Please upload a CSV file." });
      return;
    }
    const text = await file.text();
    setStatus(null);
    startTransition(async () => {
      const result = await uploadTransactionsCsv(text);
      if (result.error) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({ type: "success", message: `${result.inserted} new transaction(s) imported.` });
        // Refresh list from server
        const res = await fetch("/admin/finances?refresh=1");
        if (res.ok) window.location.reload();
      }
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {/* Summary cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-8">
          <KpiCard label="Money In" value={fmt(totalIn)} />
          <KpiCard label="Money Out" value={fmt(totalOut)} />
          <KpiCard
            label="Current Balance"
            value={latestBalance !== null ? `R ${latestBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : "—"}
            trend={(latestBalance ?? 0) < 0 ? { dir: "down", text: "negative balance" } : undefined}
          />
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-card p-10 text-center mb-8 transition-colors cursor-pointer ${
          dragging
            ? "border-arqud-gold bg-arqud-gold/5"
            : "border-arqud-line-2 hover:border-arqud-gold/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
        <p className="text-arqud-muted text-sm uppercase tracking-widest mb-2">
          {isPending ? "Importing…" : "Drop FNB CSV here or click to upload"}
        </p>
        <p className="text-arqud-muted/50 text-xs">
          Export from FNB Business Online → Account → Transaction History → Download CSV
        </p>
      </div>

      {/* Status message */}
      {status && (
        <div className={`mb-6 px-4 py-3 text-sm border ${
          status.type === "success"
            ? "border-green-800 text-green-400 bg-green-950/30"
            : "border-red-800 text-red-400 bg-red-950/30"
        }`}>
          {status.message}
        </div>
      )}

      {/* Transactions table */}
      {transactions.length > 0 ? (
        <Table>
          <Tr header>
            <Td className="basis-[110px] grow-0 shrink-0">Date</Td>
            <Td className="basis-[1fr] grow">Description</Td>
            <Td className="basis-[1fr] grow text-right">Amount</Td>
            <Td className="basis-[1fr] grow text-right">Balance</Td>
          </Tr>
          {transactions.map((t) => (
            <Tr key={t.id}>
              <Td className="basis-[110px] grow-0 shrink-0 text-arqud-muted whitespace-nowrap">{formatDate(t.date)}</Td>
              <Td className="basis-[1fr] grow text-arqud-bone">{t.description}</Td>
              <Td className={`basis-[1fr] grow text-right font-mono whitespace-nowrap ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                {t.amount >= 0 ? "+" : "−"} {fmt(t.amount)}
              </Td>
              <Td className={`basis-[1fr] grow text-right font-mono whitespace-nowrap ${t.balance >= 0 ? "text-arqud-bone" : "text-red-400"}`}>
                R {t.balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <div className="text-center py-16 text-arqud-muted text-sm">
          No transactions yet. Upload your FNB CSV to get started.
        </div>
      )}
    </div>
  );
}
