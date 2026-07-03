// Builds + signs the real-time lead payload the portal POSTs to Duan's endpoint
// the instant a lead lands. Signature lets his side verify it's genuinely from us.

import { getBrand } from "@/lib/leads/brand";

export type ForwardLead = {
  lead_id: string; // our CRM UUID — Duan's idempotency key (retry can't double-text)
  full_name: string | null;
  phone: string | null; // any format; his side normalises
  brand: string; // "We Wash" | "Sparkling" | "Other"
  branch: string | null;
  service: string | null; // package / campaign name (bonus)
};

export function buildForwardPayload(input: {
  id: string;
  full_name: string | null;
  phone: string | null;
  brand: string;
  branch: string | null;
  service?: string | null;
}): ForwardLead {
  return {
    lead_id: input.id,
    full_name: input.full_name,
    phone: input.phone,
    brand: input.brand,
    branch: input.branch,
    service: input.service ?? null,
  };
}

/** HMAC-SHA256 over the exact JSON body, returned as `sha256=<hex>`. */
export async function signBody(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

// A persisted lead row, enough to rebuild the forward payload for a backfill retry.
export type LeadRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  branch: string | null;
  meta_campaign_name: string | null;
  meta_ad_name: string | null;
};

/**
 * Rebuild the exact same forward payload from a stored lead, so a retry re-sends
 * an identical body (brand derived the same way). lead_id is stable → Duan dedups.
 */
export function forwardPayloadFromLead(row: LeadRow): ForwardLead {
  return buildForwardPayload({
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    brand: getBrand({ meta_campaign_name: row.meta_campaign_name, meta_ad_name: row.meta_ad_name }),
    branch: row.branch,
    service: row.meta_campaign_name,
  });
}

/**
 * POST the signed payload to the partner endpoint. Returns true ONLY on a 2xx —
 * so callers can persist `forwarded_at` on success and leave it null (for the
 * backfill to retry) on any failure. Fully guarded: never throws.
 */
export async function sendSignedForward(
  url: string,
  secret: string | null,
  payloadObj: ForwardLead,
  timeoutMs = 8000,
): Promise<boolean> {
  try {
    const body = JSON.stringify(payloadObj);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-ARQUD-Signature"] = await signBody(body, secret);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: "POST", headers, body, signal: ctrl.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
