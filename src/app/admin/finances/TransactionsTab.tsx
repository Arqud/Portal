"use client";

import { useRef, useState, useTransition } from "react";
import { uploadTransactionsCsv } from "./transactionActions";
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
        <div className="grid grid-cols-3 gap-px bg-arqud-ink border border-arqud-ink mb-8">
          {[
            { label: "Money In", value: fmt(totalIn), color: "text-green-400" },
            { label: "Money Out", value: fmt(totalOut), color: "text-red-400" },
            { label: "Current Balance", value: latestBalance !== null ? `R ${latestBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : "—", color: (latestBalance ?? 0) >= 0 ? "text-arqud-bone" : "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-arqud-night px-5 py-5">
              <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
              <p className={`font-display text-2xl ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-sm p-10 text-center mb-8 transition-colors cursor-pointer ${
          dragging
            ? "border-arqud-gold bg-arqud-gold/5"
            : "border-arqud-ink hover:border-arqud-gold/50"
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
        <div className="border border-arqud-ink">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-arqud-night border-b border-arqud-ink">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-arqud-muted font-normal">Date</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-arqud-muted font-normal">Description</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-arqud-muted font-normal">Amount</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-arqud-muted font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/60 transition-colors">
                  <td className="px-5 py-3 text-arqud-muted whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-5 py-3 text-arqud-bone">{t.description}</td>
                  <td className={`px-5 py-3 text-right font-mono whitespace-nowrap ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.amount >= 0 ? "+" : "−"} {fmt(t.amount)}
                  </td>
                  <td className={`px-5 py-3 text-right font-mono whitespace-nowrap ${t.balance >= 0 ? "text-arqud-bone" : "text-red-400"}`}>
                    R {t.balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-arqud-muted text-sm">
          No transactions yet. Upload your FNB CSV to get started.
        </div>
      )}
    </div>
  );
}
