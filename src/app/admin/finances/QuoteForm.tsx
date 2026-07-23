"use client";

import { useState, useTransition } from "react";
import { createQuote, updateQuote } from "./actions";
import { Card, Input, Select, Textarea, Button } from "@/components/ui";
import type { Client, LineItem, QuoteWithItems } from "@/lib/invoices/types";
import { BUSINESS_OPTIONS, businessKey } from "@/lib/business/persist";
import { calcLineAmount, calcSubtotal } from "@/lib/invoices/calculations";

const emptyLine = (): Omit<LineItem, "id"> => ({
  description: "", detail: "", rate: 0, quantity: 1, amount: 0, sort_order: 0,
});

export function QuoteForm({
  clients, onClose, editQuote,
}: {
  clients: Client[];
  onClose: () => void;
  editQuote?: QuoteWithItems;
}) {
  const isEdit = Boolean(editQuote);
  const today = new Date().toISOString().split("T")[0];
  const [business, setBusiness] = useState<string>("arqud");
  const showBusinessSwitcher = !isEdit && clients.length > 1;
  const visibleClients = showBusinessSwitcher ? clients.filter((c) => businessKey(c.business) === business) : clients;
  const [clientId, setClientId] = useState(
    editQuote?.client_id
      ?? (clients.length > 1 ? clients.find((c) => businessKey(c.business) === "arqud")?.id : clients[0]?.id)
      ?? clients[0]?.id ?? "",
  );
  function changeBusiness(next: string) {
    setBusiness(next);
    setClientId(clients.find((c) => businessKey(c.business) === next)?.id ?? "");
  }
  const [issueDate, setIssueDate] = useState(editQuote?.issue_date ?? today);
  const [notes, setNotes] = useState(editQuote?.notes ?? "");
  const [lines, setLines] = useState<Omit<LineItem, "id">[]>(
    editQuote?.line_items?.length
      ? editQuote.line_items.map((li) => ({
          description: li.description, detail: li.detail ?? "",
          rate: li.rate, quantity: li.quantity, amount: li.amount, sort_order: li.sort_order,
        }))
      : [emptyLine()],
  );
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
        const input = { clientId, issueDate, notes, lineItems: valid.map((l, i) => ({ ...l, sort_order: i })), isDraft };
        if (isEdit && editQuote) {
          await updateQuote(editQuote.id, input);
        } else {
          await createQuote(input);
        }
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-8 pb-8 px-4">
      <Card className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-arqud-gold">{isEdit ? `Edit ${editQuote?.quote_number}` : "New Quote"}</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}

        {showBusinessSwitcher && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Business</label>
            <Select value={business} onChange={(e) => changeBusiness(e.target.value)} className="w-full">
              {BUSINESS_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          </div>
        )}

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Client</label>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full">
            {visibleClients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
          </Select>
          {showBusinessSwitcher && visibleClients.length === 0 && (
            <p className="text-xs text-arqud-muted mt-1">No {business === "sa_equipment" ? "SA Equipment" : "ARQUD"} clients yet — add one first.</p>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Quote Date</label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full" />
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
              <Input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)}
                placeholder="Service description" className="col-span-5 text-sm" />
              <Input value={line.detail ?? ""} onChange={(e) => updateLine(i, "detail", e.target.value)}
                placeholder="Period / detail" className="col-span-3 text-sm" />
              <Input type="number" value={line.quantity} min={1} step={0.5}
                onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 1)}
                className="col-span-1 text-right text-sm" />
              <Input type="number" value={line.rate} min={0} step={100}
                onChange={(e) => updateLine(i, "rate", parseFloat(e.target.value) || 0)}
                className="col-span-2 text-right text-sm" />
              <button onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                disabled={lines.length === 1}
                className="col-span-1 text-arqud-muted hover:text-red-400 disabled:opacity-20 text-center">✕</button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])} className="mt-2">
            + Add line
          </Button>
        </div>

        <div className="border-t border-arqud-line pt-4 text-right">
          <p className="text-sm text-arqud-muted">Total (excl. VAT):</p>
          <p className="font-display text-2xl text-arqud-gold">R {subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-arqud-muted mt-1">VAT (15%) added upon invoice conversion.</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Notes (optional)</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full resize-none" />
        </div>

        <div className="flex gap-4">
          <Button onClick={() => submit(false)} disabled={isPending} className="flex-1 justify-center">
            {isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Quote")}
          </Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={isPending} className="flex-1 justify-center">
            Save as Draft
          </Button>
        </div>
      </Card>
    </div>
  );
}
