"use client";

import { useState, useTransition } from "react";
import { createInvoice, updateInvoice } from "./actions";
import { Card, Input, Select, Textarea, Button } from "@/components/ui";
import type { Client, LineItem, InvoiceWithItems } from "@/lib/invoices/types";
import { BUSINESS_OPTIONS, businessKey } from "@/lib/business/persist";
import { calcLineAmount, calcSubtotal, calcVat, calcTotal } from "@/lib/invoices/calculations";

const emptyLine = (): Omit<LineItem, "id"> => ({
  description: "", detail: "", rate: 0, quantity: 1, amount: 0, sort_order: 0,
});

type CreatedInvoice = { id: string; invoiceNumber: string };

export function InvoiceForm({
  clients, onClose, editInvoice,
}: {
  clients: Client[];
  onClose: () => void;
  editInvoice?: InvoiceWithItems;
}) {
  const isEdit = Boolean(editInvoice);
  const today = new Date().toISOString().split("T")[0];
  const due14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const [business, setBusiness] = useState<string>("arqud");
  // Show the switcher only in the finances context (many clients); it filters the
  // client list. On a single client's own page the business is fixed, so no
  // switcher and no filtering. Either way the invoice's business is derived from
  // the chosen client server-side, so the two can never disagree.
  const showBusinessSwitcher = !isEdit && clients.length > 1;
  const visibleClients = showBusinessSwitcher ? clients.filter((c) => businessKey(c.business) === business) : clients;
  const [clientId, setClientId] = useState(
    editInvoice?.client_id
      ?? (clients.length > 1 ? clients.find((c) => businessKey(c.business) === "arqud")?.id : clients[0]?.id)
      ?? clients[0]?.id ?? "",
  );
  function changeBusiness(next: string) {
    setBusiness(next);
    setClientId(clients.find((c) => businessKey(c.business) === next)?.id ?? "");
  }
  const [issueDate, setIssueDate] = useState(editInvoice?.issue_date ?? today);
  const [dueDate, setDueDate] = useState(editInvoice?.due_date ?? due14);
  const [terms, setTerms] = useState(editInvoice?.terms ?? "14 Days");
  const [notes, setNotes] = useState(editInvoice?.notes ?? "");
  const [chargeVat, setChargeVat] = useState((editInvoice?.vat_rate ?? 15) > 0);
  const [vatRate, setVatRate] = useState(editInvoice?.vat_rate && editInvoice.vat_rate > 0 ? editInvoice.vat_rate : 15);
  const [lines, setLines] = useState<Omit<LineItem, "id">[]>(
    editInvoice?.line_items?.length
      ? editInvoice.line_items.map((li) => ({
          description: li.description,
          detail: li.detail ?? "",
          rate: li.rate,
          quantity: li.quantity,
          amount: li.amount,
          sort_order: li.sort_order,
        }))
      : [emptyLine()],
  );
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
        const input = {
          clientId, issueDate, dueDate, terms, notes, vatRate: effectiveVatRate,
          lineItems: valid.map((l, i) => ({ ...l, sort_order: i })),
          isDraft,
        };
        if (isEdit && editInvoice) {
          await updateInvoice(editInvoice.id, input);
          onClose();
        } else {
          const result = await createInvoice(input);
          if (!isDraft && result) {
            setCreated({ id: result.id, invoiceNumber: result.invoiceNumber ?? "" });
          } else {
            onClose();
          }
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  // Success state — show after invoice created
  if (created) {
    const clientEmail = selectedClient?.email ?? "";
    const clientName = selectedClient?.company ?? selectedClient?.name ?? "";
    const pdfUrl = `/api/invoices/${created.id}/pdf`;
    const mailtoUrl = `mailto:${clientEmail}?subject=Invoice ${created.invoiceNumber} from ARQUD (PTY) LTD&body=Dear ${clientName},%0A%0APlease find your invoice ${created.invoiceNumber} attached.%0A%0AAmount due: R ${total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}%0ADue date: ${dueDate}%0A%0AYou can download your invoice here:%0A${pdfUrl}%0A%0AKind regards,%0AMorne Swanepoel%0AARQUD (PTY) LTD`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <Card className="w-full max-w-md space-y-6 text-center">
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
              className="block w-full bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft rounded-control">
              Preview &amp; Download PDF
            </a>
            <a href={mailtoUrl}
              className="block w-full border border-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-gold hover:bg-arqud-gold hover:text-arqud-black rounded-control">
              Send via Email
            </a>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => { setCreated(null); setLines([emptyLine()]); setNotes(""); }} className="justify-center">
                New Invoice
              </Button>
              <Button variant="outline" onClick={onClose} className="justify-center">
                Back to Finances
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-8 pb-8 px-4">
      <Card className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-arqud-gold">{isEdit ? `Edit ${editInvoice?.invoice_number}` : "New Invoice"}</h2>
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Invoice Date</label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Terms</label>
            <Input type="text" value={terms} onChange={(e) => setTerms(e.target.value)} className="w-full" />
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

        {/* VAT toggle + totals */}
        <div className="border-t border-arqud-line pt-4 space-y-2">
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
                  <Input type="number" value={vatRate} min={0} max={100} step={1}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    className="w-14 px-2 py-1 text-xs text-right" />
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
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full resize-none" />
        </div>

        <div className="flex gap-4">
          <Button onClick={() => submit(false)} disabled={isPending} className="flex-1 justify-center">
            {isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Invoice")}
          </Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={isPending} className="flex-1 justify-center">
            Save as Draft
          </Button>
        </div>
      </Card>
    </div>
  );
}
