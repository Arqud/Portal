// Emails the client's brand inbox the moment a NEW lead lands, so Arno's team
// hears about every lead without logging into the portal. Recipients live in
// app_settings (lead_notify_email_we_wash / lead_notify_email_sparkling) — a
// missing/blank key means the feature is off for that brand. Fully guarded:
// a notification failure can NEVER throw into or block ingestion or the
// Duan forward (same contract as sendInvoiceEmail).

import { Resend } from "resend";
import { getSetting } from "@/lib/settings/query";
import { getResendApiKey } from "@/lib/settings/resend";

export type NotifyLead = {
  full_name: string | null;
  phone: string | null;
  branch: string | null;
  service: string | null; // package / campaign name
  preferred_time?: string | null; // form's preferred-time answer (only the pilot form asks)
  brand: string; // "We Wash" | "Sparkling" | "Other" (from getBrand)
  created_at?: string | null; // ISO; defaults to "now" for real-time ingest
};

// app_settings key per brand. Brand "Other" has no inbox — intentionally absent.
export const NOTIFY_SETTING_KEYS: Record<string, string> = {
  "We Wash": "lead_notify_email_we_wash",
  Sparkling: "lead_notify_email_sparkling",
};

// The setting value supports comma-separated addresses ("a@x.co.za, b@x.co.za").
export function parseRecipients(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Brand inbox(es) for this lead, or [] when the feature is off for the brand
// (key missing/blank) or the brand is "Other" (no inbox to notify).
export async function resolveNotifyRecipients(brand: string): Promise<string[]> {
  const key = NOTIFY_SETTING_KEYS[brand];
  if (!key) return [];
  return parseRecipients(await getSetting(key));
}

// From-name matches the brand so the inbox can filter/recognise at a glance.
export function notifyFrom(brand: string): string {
  return brand === "Sparkling"
    ? "Sparkling Leads <noreply@arqudportal.co.za>"
    : "We Wash Cars Leads <noreply@arqudportal.co.za>";
}

// Received time in SAST (Africa/Johannesburg) — the client's timezone.
export function formatSast(iso: string | number | Date): string {
  const formatted = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return `${formatted} SAST`;
}

// Lead values come from a public Meta form — escape before interpolating into HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Pure builder — same dark/gold look as the invoice email so everything the
// portal sends feels like one product. Kept side-effect free for unit tests.
export function buildLeadNotification(lead: NotifyLead): { subject: string; html: string } {
  const name = lead.full_name?.trim() || lead.phone || "Unknown";
  const subject = `New ${lead.brand} lead — ${name}${lead.branch ? ` — ${lead.branch}` : ""}`;

  const telHref = lead.phone ? `tel:${lead.phone.replace(/\s+/g, "")}` : null;
  const receivedAt = formatSast(lead.created_at ?? Date.now());
  const row = (label: string, value: string) =>
    `<tr><td style="color:#6e6e6e;font-size:12px;padding:8px 0;border-bottom:1px solid #1a1f2e">${label}</td><td style="color:#f3ecd9;font-size:13px;text-align:right;padding:8px 0;border-bottom:1px solid #1a1f2e">${value}</td></tr>`;

  const html = `<div style="background:#080808;padding:40px;font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto">
    <h1 style="color:#c8a96e;font-size:22px;letter-spacing:0.25em;margin:0 0 8px">${escapeHtml(lead.brand.toUpperCase())}</h1>
    <p style="color:#6e6e6e;font-size:10px;letter-spacing:0.2em;margin:0 0 32px">NEW LEAD &middot; CLIENT PORTAL</p>
    <p style="color:#f3ecd9;font-size:16px;margin:0 0 24px">A new lead just came in — <strong style="color:#c8a96e">${escapeHtml(name)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 32px">
      ${row("Brand", escapeHtml(lead.brand))}
      ${row("Name", escapeHtml(lead.full_name?.trim() || "—"))}
      ${row("Phone", telHref ? `<a href="${escapeHtml(telHref)}" style="color:#c8a96e;text-decoration:none">${escapeHtml(lead.phone ?? "")}</a>` : "—")}
      ${row("Branch", escapeHtml(lead.branch || "—"))}
      ${row("Package", escapeHtml(lead.service || "—"))}
      ${lead.preferred_time?.trim() ? row("Preferred", escapeHtml(lead.preferred_time.trim())) : ""}
      ${row("Received", escapeHtml(receivedAt))}
    </table>
    <a href="https://arno.arqudportal.co.za/client/leads" style="display:inline-block;background:#c8a96e;color:#080808;text-decoration:none;padding:14px 32px;font-weight:600;font-size:13px;letter-spacing:0.08em;margin-bottom:32px">VIEW IN PORTAL</a>
    <p style="color:#3a3a3a;font-size:10px;margin:0">Sent by ARQUD Portal &middot; lead emails can be changed under Settings &rarr; Integrations.</p>
  </div>`;

  return { subject, html };
}

// Guarded sender — mirrors sendInvoiceEmail exactly: no API key → silent no-op,
// and every failure (settings read, Resend) is swallowed. The lead is already
// safely in the CRM by the time this runs; email is strictly best-effort.
export async function sendLeadNotification(lead: NotifyLead): Promise<void> {
  // Every exit logs its reason — this function fails SILENTLY by contract, so
  // Vercel function logs are the only way to see why an email didn't go out.
  try {
    // Env var first, app_settings fallback — Vercel has silently dropped
    // UI-added env vars before (that's exactly how this key vanished in prod).
    const key = await getResendApiKey();
    if (!key) {
      console.error("[leads/notify] skipped: no Resend API key in runtime env or app_settings");
      return;
    }
    // Log the source (never the value) so prod logs show which store supplied it.
    console.log("[leads/notify] using Resend key from", process.env.RESEND_API_KEY?.trim() ? "env" : "settings");
    const to = await resolveNotifyRecipients(lead.brand);
    if (to.length === 0) {
      console.error("[leads/notify] skipped: no recipients configured for brand", lead.brand);
      return; // feature off for this brand (or brand "Other")
    }
    const { subject, html } = buildLeadNotification(lead);
    const resend = new Resend(key);
    // The Resend SDK reports API failures via the returned `error`, not by throwing.
    const res = await resend.emails.send({ from: notifyFrom(lead.brand), to, subject, html });
    const error = res && "error" in res ? res.error : null;
    if (error) {
      console.error("[leads/notify] Resend rejected send", { brand: lead.brand, name: error.name, message: error.message });
    } else {
      console.log("[leads/notify] sent", { brand: lead.brand, recipients: to.length, id: res?.data?.id ?? null });
    }
  } catch (e) {
    console.error("[leads/notify] send threw", e instanceof Error ? e.message : e);
  }
}
