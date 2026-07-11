import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySession } from "@/lib/auth/session";
import { PageHeader, Card, Pill } from "@/components/ui";
import { calcSubtotal } from "@/lib/invoices/calculations";
import { formatSast } from "@/lib/leads/notify";
import { ProposalDetailActions } from "./ProposalDetailActions";
import type { ProposalWithItems } from "@/lib/proposals/types";

// Shared status → Pill tone vocabulary (see QuoteTable STATUS_TONE).
const STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  sent: "contacted",
  accepted: "converted",
  declined: "danger",
};

const money = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await verifySession("admin");
  const { id } = await params;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("proposals")
    .select("*, client:clients(id,name,company,email), line_items:proposal_line_items(*)")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const p = data as ProposalWithItems;
  p.line_items = [...p.line_items].sort((a, b) => a.sort_order - b.sort_order);

  // Recipient display everywhere: client company → client name → prospect company → prospect name.
  const recipient = p.client?.company ?? p.client?.name ?? p.prospect_company ?? p.prospect_name ?? "—";
  const total = calcSubtotal(p.line_items);

  let invoiceNumber: string | null = null;
  if (p.converted_to_invoice_id) {
    const { data: inv } = await admin
      .from("invoices").select("invoice_number").eq("id", p.converted_to_invoice_id).single();
    invoiceNumber = inv?.invoice_number ?? null;
  }

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <PageHeader title={p.proposal_number} count={recipient}>
        <Link href="/admin/proposals" className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">
          ← All proposals
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        {/* Preview — same visual order as the public page */}
        <Card className="space-y-8 p-6 sm:p-8">
          <div>
            <h2 className="font-display text-[26px] sm:text-[32px] text-arqud-bone leading-tight m-0">{p.title}</h2>
            <p className="text-sm text-arqud-muted mt-1.5">Prepared for {recipient}</p>
          </div>

          {p.intro && <p className="text-[15px] text-arqud-bone-dim leading-relaxed">{p.intro}</p>}

          {p.sections.map((s, i) => (
            <div key={i}>
              {s.heading && (
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-arqud-gold mb-3">{s.heading}</h3>
              )}
              <ul className="space-y-2">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex gap-2.5 text-[14px] text-arqud-bone-dim leading-relaxed">
                    <span className="text-arqud-gold shrink-0" aria-hidden="true">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {p.line_items.length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-arqud-gold mb-3">Investment</h3>
              <div className="border border-arqud-line rounded-card overflow-hidden">
                {p.line_items.map((li, i) => (
                  <div key={li.id ?? i} className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-arqud-line/60 text-[13.5px]">
                    <span className="text-arqud-bone-dim min-w-0">
                      {li.description}
                      {li.quantity !== 1 && <span className="text-arqud-muted"> × {li.quantity}</span>}
                    </span>
                    <span className="text-arqud-bone shrink-0">{money(li.amount)}</span>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 px-4 py-3 bg-arqud-gold/5">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-arqud-muted">Total (excl. VAT)</span>
                  <span className="font-display text-xl text-arqud-gold">{money(total)}</span>
                </div>
              </div>
            </div>
          )}

          {p.terms && (
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-arqud-gold mb-2">Terms</h3>
              <p className="text-[13px] text-arqud-muted leading-relaxed whitespace-pre-line">{p.terms}</p>
            </div>
          )}

          {p.valid_until && (
            <p className="text-[12px] text-arqud-muted">Valid until {p.valid_until}</p>
          )}
        </Card>

        {/* Meta panel + actions */}
        <Card className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.15em] text-arqud-muted">Status</span>
            <Pill tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Pill>
          </div>

          <div className="space-y-2.5 text-[12.5px]">
            <div className="flex justify-between gap-3">
              <span className="text-arqud-muted">Created</span>
              <span className="text-arqud-bone-dim text-right">{formatSast(p.created_at)}</span>
            </div>
            {p.first_viewed_at && (
              <div className="flex justify-between gap-3">
                <span className="text-arqud-muted">First viewed</span>
                <span className="text-arqud-bone-dim text-right">{formatSast(p.first_viewed_at)}</span>
              </div>
            )}
            {p.valid_until && (
              <div className="flex justify-between gap-3">
                <span className="text-arqud-muted">Valid until</span>
                <span className="text-arqud-bone-dim text-right">{p.valid_until}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-arqud-muted">Total (excl. VAT)</span>
              <span className="text-arqud-bone text-right">{money(total)}</span>
            </div>
          </div>

          {p.status === "accepted" && p.accepted_by_name && p.accepted_at && (
            <div className="border border-arqud-gold/30 bg-arqud-gold/5 rounded-card p-3.5 text-[12.5px] leading-relaxed">
              <p className="text-arqud-gold font-semibold m-0">Accepted</p>
              <p className="text-arqud-bone-dim m-0 mt-1">
                Accepted by {p.accepted_by_name} on {formatSast(p.accepted_at)}
                {p.accepted_ip ? ` from ${p.accepted_ip}` : ""}
              </p>
            </div>
          )}

          {p.status === "declined" && (
            <div className="border border-red-400/30 bg-red-400/5 rounded-card p-3.5 text-[12.5px] leading-relaxed">
              <p className="text-red-400 font-semibold m-0">Declined</p>
              {p.declined_at && <p className="text-arqud-bone-dim m-0 mt-1">{formatSast(p.declined_at)}</p>}
              {p.decline_reason && <p className="text-arqud-muted m-0 mt-1">&ldquo;{p.decline_reason}&rdquo;</p>}
            </div>
          )}

          <ProposalDetailActions
            proposal={{
              id: p.id,
              proposal_number: p.proposal_number,
              status: p.status,
              share_token: p.share_token,
              client_id: p.client_id,
              converted_to_invoice_id: p.converted_to_invoice_id,
            }}
            invoiceNumber={invoiceNumber}
          />
        </Card>
      </div>
    </main>
  );
}
