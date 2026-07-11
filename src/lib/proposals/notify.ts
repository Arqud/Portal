// Emails Morne the moment a proposal is accepted, so a signed deal never sits
// unseen. Recipient lives in app_settings (proposal_notify_email), defaulting
// to Morne@arqud.com when unset. Fully guarded: a notification failure can
// NEVER throw into or block acceptance (same contract as sendLeadNotification).

import { Resend } from "resend";
import { getSetting } from "@/lib/settings/query";
import { getResendApiKey } from "@/lib/settings/resend";

export type ProposalAcceptedEmailInput = {
  title: string;
  proposal_number: string;
  recipient: string; // client company/name or prospect display name
  accepted_by_name: string;
  accepted_at_sast: string; // pre-formatted SAST timestamp
  total: number;
};

// Acceptor name is typed on a public page — escape before interpolating into HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Pure builder — same dark/gold look as the lead + invoice emails so everything
// the portal sends feels like one product. Kept side-effect free for unit tests.
export function buildProposalAcceptedEmail(p: ProposalAcceptedEmailInput): { subject: string; html: string } {
  const subject = `Proposal accepted — ${p.title} — ${p.recipient}`;
  const totalDisplay = `R ${p.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  const row = (label: string, value: string) =>
    `<tr><td style="color:#6e6e6e;font-size:12px;padding:8px 0;border-bottom:1px solid #1a1f2e">${label}</td><td style="color:#f3ecd9;font-size:13px;text-align:right;padding:8px 0;border-bottom:1px solid #1a1f2e">${value}</td></tr>`;

  const html = `<div style="background:#080808;padding:40px;font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto">
    <h1 style="color:#c8a96e;font-size:22px;letter-spacing:0.25em;margin:0 0 8px">ARQUD</h1>
    <p style="color:#6e6e6e;font-size:10px;letter-spacing:0.2em;margin:0 0 32px">PROPOSAL ACCEPTED &middot; CLIENT PORTAL</p>
    <p style="color:#f3ecd9;font-size:16px;margin:0 0 24px"><strong style="color:#c8a96e">${escapeHtml(p.accepted_by_name)}</strong> just accepted <strong style="color:#c8a96e">${escapeHtml(p.title)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 32px">
      ${row("Proposal", escapeHtml(p.proposal_number))}
      ${row("Recipient", escapeHtml(p.recipient))}
      ${row("Accepted by", escapeHtml(p.accepted_by_name))}
      ${row("Accepted at", escapeHtml(p.accepted_at_sast))}
      ${row("Total (excl. VAT)", `<strong style="color:#c8a96e;font-size:16px;font-style:italic">${escapeHtml(totalDisplay)}</strong>`)}
    </table>
    <a href="https://arqudportal.co.za/admin/proposals" style="display:inline-block;background:#c8a96e;color:#080808;text-decoration:none;padding:14px 32px;font-weight:600;font-size:13px;letter-spacing:0.08em;margin-bottom:32px">VIEW IN PORTAL</a>
    <p style="color:#3a3a3a;font-size:10px;margin:0">Sent by ARQUD Portal &middot; the notify address can be changed via the proposal_notify_email setting.</p>
  </div>`;

  return { subject, html };
}

// Guarded sender — mirrors sendLeadNotification exactly: no API key → silent
// no-op, and every failure (settings read, Resend) is swallowed. The proposal
// is already accepted in the DB by the time this runs; email is best-effort.
export async function sendProposalAcceptedEmail(p: ProposalAcceptedEmailInput): Promise<void> {
  // Every exit logs its reason — this function fails SILENTLY by contract, so
  // Vercel function logs are the only way to see why an email didn't go out.
  try {
    // Env var first, app_settings fallback — Vercel has silently dropped
    // UI-added env vars before (that's exactly how this key vanished in prod).
    const key = await getResendApiKey();
    if (!key) {
      console.error("[proposals/notify] skipped: no Resend API key in runtime env or app_settings");
      return;
    }
    // Log the source (never the value) so prod logs show which store supplied it.
    console.log("[proposals/notify] using Resend key from", process.env.RESEND_API_KEY?.trim() ? "env" : "settings");
    const to = (await getSetting("proposal_notify_email"))?.trim() || "Morne@arqud.com";
    const { subject, html } = buildProposalAcceptedEmail(p);
    const resend = new Resend(key);
    // The Resend SDK reports API failures via the returned `error`, not by throwing.
    const res = await resend.emails.send({ from: "ARQUD Portal <noreply@arqudportal.co.za>", to, subject, html });
    const error = res && "error" in res ? res.error : null;
    if (error) {
      console.error("[proposals/notify] Resend rejected send", { proposal: p.proposal_number, name: error.name, message: error.message });
    } else {
      console.log("[proposals/notify] sent", { proposal: p.proposal_number, id: res?.data?.id ?? null });
    }
  } catch (e) {
    console.error("[proposals/notify] send threw", e instanceof Error ? e.message : e);
  }
}
