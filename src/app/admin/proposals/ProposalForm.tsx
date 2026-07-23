"use client";

// Create/edit form for proposals — dedicated page (not a modal: the sections
// builder is too tall). Field styling follows QuoteForm.tsx.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Select, Textarea, Button } from "@/components/ui";
import { calcLineAmount, calcSubtotal } from "@/lib/invoices/calculations";
import { createProposal, updateProposal, type ProposalInput } from "./actions";
import type { ProposalLineItem, ProposalWithItems } from "@/lib/proposals/types";
import { BUSINESS_OPTIONS } from "@/lib/business/persist";

type ClientOption = { id: string; name: string; company: string | null; email: string | null };

// Sections are edited as heading + one-bullet-per-line textarea; order = array order.
type SectionDraft = { heading: string; bulletsText: string };

const emptyLine = (): Omit<ProposalLineItem, "id"> => ({
  description: "", rate: 0, quantity: 1, amount: 0, sort_order: 0,
});

const label = "block text-xs uppercase tracking-widest text-arqud-muted mb-1";

export function ProposalForm({
  clients, editProposal,
}: {
  clients: ClientOption[];
  editProposal?: ProposalWithItems;
}) {
  const router = useRouter();
  const isEdit = Boolean(editProposal);
  const [business, setBusiness] = useState<string>("arqud");

  const [mode, setMode] = useState<"client" | "prospect">(
    editProposal ? (editProposal.client_id ? "client" : "prospect") : clients.length > 0 ? "client" : "prospect",
  );
  const [clientId, setClientId] = useState(editProposal?.client_id ?? clients[0]?.id ?? "");
  const [prospectName, setProspectName] = useState(editProposal?.prospect_name ?? "");
  const [prospectCompany, setProspectCompany] = useState(editProposal?.prospect_company ?? "");
  const [prospectEmail, setProspectEmail] = useState(editProposal?.prospect_email ?? "");
  const [title, setTitle] = useState(editProposal?.title ?? "");
  const [intro, setIntro] = useState(editProposal?.intro ?? "");
  const [sections, setSections] = useState<SectionDraft[]>(
    editProposal?.sections?.length
      ? editProposal.sections.map((s) => ({ heading: s.heading, bulletsText: s.bullets.join("\n") }))
      : [{ heading: "", bulletsText: "" }],
  );
  const [lines, setLines] = useState<Omit<ProposalLineItem, "id">[]>(
    editProposal?.line_items?.length
      ? editProposal.line_items.map((li) => ({
          description: li.description, rate: li.rate, quantity: li.quantity,
          amount: li.amount, sort_order: li.sort_order,
        }))
      : [emptyLine()],
  );
  const [terms, setTerms] = useState(editProposal?.terms ?? "");
  const [validUntil, setValidUntil] = useState(editProposal?.valid_until ?? "");
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

  function updateLine(i: number, field: "description" | "quantity" | "rate", value: string | number) {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[i], [field]: value };
      line.amount = calcLineAmount(Number(line.rate), Number(line.quantity));
      next[i] = line;
      return next;
    });
  }

  function updateSection(i: number, field: keyof SectionDraft, value: string) {
    setSections((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  const subtotal = calcSubtotal(lines);

  function submit() {
    if (mode === "client" && !clientId) { setErr("Select a client."); return; }
    if (mode === "prospect" && !prospectName.trim()) { setErr("Prospect name is required."); return; }
    if (!title.trim()) { setErr("Title is required."); return; }
    setErr("");
    start(async () => {
      try {
        const input: ProposalInput = {
          client_id: mode === "client" ? clientId : null,
          prospect_name: mode === "prospect" ? prospectName.trim() || null : null,
          prospect_company: mode === "prospect" ? prospectCompany.trim() || null : null,
          prospect_email: mode === "prospect" ? prospectEmail.trim() || null : null,
          title: title.trim(),
          intro: intro.trim() || null,
          terms: terms.trim() || null,
          valid_until: validUntil || null,
          sections: sections.map((s) => ({
            heading: s.heading.trim(),
            bullets: s.bulletsText.split("\n").map((b) => b.trim()).filter(Boolean),
          })),
          lineItems: lines
            .filter((l) => l.description.trim())
            .map((l, i) => ({ ...l, sort_order: i })),
          business,
        };
        if (isEdit && editProposal) {
          await updateProposal(editProposal.id, input);
          router.push(`/admin/proposals/${editProposal.id}`);
        } else {
          const { id } = await createProposal(input);
          router.push(`/admin/proposals/${id}`);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="w-full max-w-2xl space-y-6">
      {err && <p className="text-red-400 text-sm">{err}</p>}

      {!isEdit && (
        <div className="space-y-3">
          <span className={label}>Business</span>
          <div className="flex gap-6">
            {BUSINESS_OPTIONS.map((b) => (
              <label key={b.value} className="flex items-center gap-2 text-sm text-arqud-bone cursor-pointer">
                <input type="radio" name="proposal-business" value={b.value}
                  checked={business === b.value} onChange={() => setBusiness(b.value)}
                  className="accent-arqud-gold" />
                {b.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Recipient: existing client or brand-new prospect */}
      <div className="space-y-3">
        <span className={label}>Recipient</span>
        <div className="flex gap-6">
          {([
            { value: "client", text: "Existing client" },
            { value: "prospect", text: "New prospect" },
          ] as const).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-arqud-bone cursor-pointer">
              <input
                type="radio"
                name="recipient-mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                className="accent-arqud-gold"
              />
              {opt.text}
            </label>
          ))}
        </div>
        {mode === "client" ? (
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
          </Select>
        ) : (
          <div className="grid sm:grid-cols-3 gap-2">
            <Input value={prospectName} onChange={(e) => setProspectName(e.target.value)}
              placeholder="Prospect name *" className="w-full" />
            <Input value={prospectCompany} onChange={(e) => setProspectCompany(e.target.value)}
              placeholder="Company" className="w-full" />
            <Input type="email" value={prospectEmail} onChange={(e) => setProspectEmail(e.target.value)}
              placeholder="Email" className="w-full" />
          </div>
        )}
      </div>

      <div>
        <label className={label}>Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Meta Ads Growth Retainer" className="w-full" />
      </div>

      <div>
        <label className={label}>Intro (optional)</label>
        <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3}
          placeholder="Short pitch paragraph the recipient reads first" className="w-full resize-none" />
      </div>

      {/* Sections builder — order on the public page = order here */}
      <div>
        <span className={label}>Scope sections</span>
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="border border-arqud-line rounded-card p-3 space-y-2">
              <div className="flex gap-2">
                <Input value={s.heading} onChange={(e) => updateSection(i, "heading", e.target.value)}
                  placeholder={`Section heading (e.g. "What you get")`} className="flex-1" />
                <button onClick={() => setSections((p) => p.filter((_, j) => j !== i))}
                  disabled={sections.length === 1}
                  className="text-arqud-muted hover:text-red-400 disabled:opacity-20 px-2" aria-label="Remove section">✕</button>
              </div>
              <Textarea value={s.bulletsText} onChange={(e) => updateSection(i, "bulletsText", e.target.value)}
                rows={3} placeholder="One bullet per line" className="w-full resize-none" />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm"
          onClick={() => setSections((p) => [...p, { heading: "", bulletsText: "" }])} className="mt-3">
          + Add section
        </Button>
      </div>

      {/* Line items — same math as quotes/invoices */}
      <div>
        <div className="grid grid-cols-12 gap-2 mb-2">
          <span className="col-span-6 text-xs uppercase tracking-widest text-arqud-muted">Description</span>
          <span className="col-span-1 text-xs uppercase tracking-widest text-arqud-muted text-right">Qty</span>
          <span className="col-span-2 text-xs uppercase tracking-widest text-arqud-muted text-right">Rate (R)</span>
          <span className="col-span-2 text-xs uppercase tracking-widest text-arqud-muted text-right">Amount</span>
          <span className="col-span-1" />
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <Input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)}
              placeholder="Service description" className="col-span-6 text-sm" />
            <Input type="number" value={line.quantity} min={1} step={0.5}
              onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 1)}
              className="col-span-1 text-right text-sm" />
            <Input type="number" value={line.rate} min={0} step={100}
              onChange={(e) => updateLine(i, "rate", parseFloat(e.target.value) || 0)}
              className="col-span-2 text-right text-sm" />
            <span className="col-span-2 text-right text-sm text-arqud-bone-dim">
              R {line.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </span>
            <button onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
              disabled={lines.length === 1}
              className="col-span-1 text-arqud-muted hover:text-red-400 disabled:opacity-20 text-center" aria-label="Remove line">✕</button>
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
        <label className={label}>Terms (optional)</label>
        <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2}
          placeholder="Payment terms, engagement conditions…" className="w-full resize-none" />
      </div>

      <div>
        <label className={label}>Valid until (optional)</label>
        <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full sm:w-56" />
      </div>

      <div className="flex gap-4">
        <Button onClick={submit} disabled={isPending} className="flex-1 justify-center">
          {isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Proposal")}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={isPending} className="flex-1 justify-center">
          Cancel
        </Button>
      </div>
    </Card>
  );
}
