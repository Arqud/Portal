// Public proposal page — ARQUD's face to prospects; opened from a WhatsApp
// link, almost always on a phone. No auth: the unguessable token is the access
// control (proxy.ts only gates /admin and /client). Root layout already sets
// global noindex.

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calcSubtotal } from "@/lib/invoices/calculations";
import { canAccept } from "@/lib/proposals/rules";
import { formatSast } from "@/lib/leads/notify";
import { AcceptBlock } from "./AcceptBlock";
import type { ProposalWithItems } from "@/lib/proposals/types";

// cache() dedupes the fetch between generateMetadata and the page render.
const getProposal = cache(async (token: string): Promise<ProposalWithItems | null> => {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("proposals")
    .select("*, client:clients(id,name,company,email), line_items:proposal_line_items(*)")
    .eq("share_token", token)
    .single();
  if (!data) return null;
  const p = data as ProposalWithItems;
  p.line_items = [...p.line_items].sort((a, b) => a.sort_order - b.sort_order);
  return p;
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const p = await getProposal(token);
  if (!p) return {};
  return { title: { absolute: p.title } };
}

const money = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg",
  });

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await getProposal(token);
  if (!p) notFound();

  // Stamp first view once, only after the proposal went out — never on Morne's
  // draft previews. Guarded: a failed stamp must not break the page.
  if (p.status === "sent" && !p.first_viewed_at) {
    try {
      const admin = createSupabaseAdminClient();
      await admin
        .from("proposals")
        .update({ first_viewed_at: new Date().toISOString() })
        .eq("id", p.id)
        .is("first_viewed_at", null);
    } catch {
      /* best-effort */
    }
  }

  // Recipient display everywhere: client company → client name → prospect company → prospect name.
  const recipient = p.client?.company ?? p.client?.name ?? p.prospect_company ?? p.prospect_name ?? "—";
  const total = calcSubtotal(p.line_items);
  const gate = canAccept(p);
  const expired = !gate.ok && gate.reason === "expired";

  return (
    <main className="min-h-screen">
      {/* Header — same luxury-minimal identity as /wewash */}
      <header
        className="relative px-5 pt-14 pb-12 text-center sm:pt-20 sm:pb-16"
        style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, var(--color-arqud-bg-2), var(--color-arqud-bg))" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[10%] h-[280px] w-[540px] max-w-[90vw] -translate-x-1/2"
          style={{ background: "radial-gradient(ellipse, rgba(200,169,110,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-2xl animate-fade-up">
          <p className="font-display text-[22px] tracking-[0.3em] text-arqud-gold">ARQUD</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-arqud-muted">Digital Marketing Agency</p>

          <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-arqud-muted">
            Proposal · {p.proposal_number}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-arqud-bone sm:text-5xl">{p.title}</h1>
          <p className="mt-4 text-[15px] text-arqud-bone-dim">
            Prepared for <span className="text-arqud-gold">{recipient}</span>
          </p>
          {p.status === "draft" && (
            <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-arqud-muted/70">Preview — not yet sent</p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-5 pb-16 sm:pb-24">
        {/* Intro */}
        {p.intro && (
          <p className="mt-2 text-[16px] leading-[1.75] text-arqud-bone-dim sm:text-[17px]">{p.intro}</p>
        )}

        {/* Scope sections */}
        {p.sections.map((s, i) => (
          <section key={i} className="mt-12">
            {s.heading && (
              <h2 className="flex items-center gap-3 text-[12px] font-body font-semibold uppercase tracking-[0.22em] text-arqud-gold">
                {s.heading}
                <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-arqud-gold/30 to-transparent" />
              </h2>
            )}
            <ul className="mt-5 space-y-3">
              {s.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-3 text-[15px] leading-relaxed text-arqud-bone-dim">
                  <span className="mt-0.5 text-arqud-gold" aria-hidden>✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Investment */}
        {p.line_items.length > 0 && (
          <section className="mt-12">
            <h2 className="flex items-center gap-3 text-[12px] font-body font-semibold uppercase tracking-[0.22em] text-arqud-gold">
              Investment
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-arqud-gold/30 to-transparent" />
            </h2>
            <div className="relative mt-5 overflow-hidden rounded-card border border-arqud-line panel-gradient gold-topedge">
              {p.line_items.map((li, i) => (
                <div
                  key={li.id ?? i}
                  className="flex items-baseline justify-between gap-4 border-b border-arqud-line/60 px-5 py-4"
                >
                  <span className="min-w-0 text-[14.5px] leading-snug text-arqud-bone-dim">
                    {li.description}
                    {li.quantity !== 1 && <span className="text-arqud-muted"> × {li.quantity}</span>}
                  </span>
                  <span className="shrink-0 text-[14.5px] text-arqud-bone tabular-nums">{money(li.amount)}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 bg-arqud-gold/5 px-5 py-4">
                <span className="text-[11px] uppercase tracking-[0.18em] text-arqud-muted">Total (excl. VAT)</span>
                <span className="stat-number text-2xl tabular-nums sm:text-3xl">{money(total)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Terms */}
        {p.terms && (
          <section className="mt-12">
            <h2 className="flex items-center gap-3 text-[12px] font-body font-semibold uppercase tracking-[0.22em] text-arqud-gold">
              Terms
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-arqud-gold/30 to-transparent" />
            </h2>
            <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-arqud-muted">{p.terms}</p>
          </section>
        )}

        {/* Validity */}
        {p.valid_until && p.status === "sent" && !expired && (
          <p className="mt-10 text-center text-[13px] text-arqud-muted">
            This proposal is valid until <span className="text-arqud-bone-dim">{longDate(p.valid_until)}</span>.
          </p>
        )}

        {/* Outcome / acceptance */}
        <div className="mt-12">
          {p.status === "accepted" && p.accepted_by_name && p.accepted_at ? (
            <div className="relative overflow-hidden rounded-card border border-arqud-gold/40 bg-arqud-gold/5 px-6 py-8 text-center gold-topedge">
              <p className="m-0 font-display text-2xl text-arqud-gold">Accepted</p>
              <p className="m-0 mt-2 text-[15px] text-arqud-bone-dim">
                Accepted by <span className="text-arqud-bone">{p.accepted_by_name}</span> on {formatSast(p.accepted_at)}
              </p>
              <p className="m-0 mt-3 text-[13px] text-arqud-muted">Thank you — we&apos;ll be in touch shortly to get started.</p>
            </div>
          ) : p.status === "declined" ? (
            <div className="rounded-card border border-arqud-line bg-arqud-panel/50 px-6 py-8 text-center">
              <p className="m-0 text-[15px] text-arqud-bone-dim">This proposal has been declined.</p>
              <p className="m-0 mt-2 text-[13px] text-arqud-muted">
                Changed your mind? Email <a href="mailto:Morne@arqud.com" className="text-arqud-gold hover:text-arqud-gold-soft">Morne@arqud.com</a>.
              </p>
            </div>
          ) : expired ? (
            <div className="rounded-card border border-arqud-line bg-arqud-panel/50 px-6 py-8 text-center">
              <p className="m-0 text-[15px] text-arqud-bone-dim">This proposal has expired.</p>
              <p className="m-0 mt-2 text-[13px] text-arqud-muted">
                Still interested? Contact <a href="mailto:Morne@arqud.com" className="text-arqud-gold hover:text-arqud-gold-soft">Morne@arqud.com</a> for an updated proposal.
              </p>
            </div>
          ) : p.status === "sent" ? (
            <AcceptBlock token={p.share_token} />
          ) : null /* draft: preview line in the header, acceptance hidden */}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-arqud-line px-5 py-10 text-center">
        <p className="font-display text-lg tracking-[0.28em] text-arqud-gold">ARQUD</p>
        <p className="mt-3 text-xs text-arqud-muted">
          © {new Date().getFullYear()} ARQUD (PTY) LTD ·{" "}
          <a href="mailto:Morne@arqud.com" className="transition-colors hover:text-arqud-gold">Morne@arqud.com</a>
        </p>
      </footer>
    </main>
  );
}
