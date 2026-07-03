// Builds + signs the real-time lead payload the portal POSTs to Duan's endpoint
// the instant a lead lands. Signature lets his side verify it's genuinely from us.

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
