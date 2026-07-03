import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveCampaignName, extractBranch, mapContact } from "@/lib/leads/ingest";
import { getBrand } from "@/lib/leads/brand";
import { buildForwardPayload, signBody } from "@/lib/leads/forward";
import { getSetting } from "@/lib/settings/query";

// Real-time forward to Duan's speed-to-lead endpoint. Fire-and-forget, fully
// guarded: it can NEVER throw into or delay-fail the CRM ingestion path.
async function forwardLead(payloadObj: ReturnType<typeof buildForwardPayload>) {
  try {
    const [url, secret] = await Promise.all([
      getSetting("lead_forward_url"),
      getSetting("lead_forward_secret"),
    ]);
    if (!url) return;
    const body = JSON.stringify(payloadObj);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-ARQUD-Signature"] = await signBody(body, secret);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    await fetch(url, { method: "POST", headers, body, signal: ctrl.signal }).catch(() => {});
    clearTimeout(timer);
  } catch {
    /* never let the forward affect lead ingestion */
  }
}

const META_APP_SECRET = process.env.META_APP_SECRET ?? "";

// Verify Meta webhook signature
async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!META_APP_SECRET || !signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = `sha256=${hex}`;
  return expected === signature;
}

// Meta sends a GET to verify the webhook endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta sends lead events as POST
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  if (META_APP_SECRET && !(await verifySignature(rawBody, signature))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: { entry?: { changes?: { value?: { leadgen_id?: string; page_id?: string; ad_id?: string; form_id?: string; adgroup_id?: string } }[] }[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.leadgen_id) continue;

      const metaLeadId = value.leadgen_id;
      const metaAdId = value.adgroup_id ?? value.ad_id ?? null;

      // Check if we already have this lead
      const { data: existing } = await admin
        .from("leads")
        .select("id")
        .eq("meta_lead_id", metaLeadId)
        .maybeSingle();

      if (existing) continue;

      // Find which client owns this ad account / page
      const { data: client } = await admin
        .from("clients")
        .select("id")
        .not("meta_ad_account_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (!client) continue;

      // Seed lead data from the payload's own field_data FIRST. Make.com delivers
      // field_data inline, so a valid lead must never hinge on having a Graph token —
      // requiring one here previously dropped every inline lead when the token was unset.
      const payloadFieldData: { name: string; values: string[] }[] =
        (value as { field_data?: { name: string; values: string[] }[] }).field_data ?? [];

      const leadData: Record<string, string> = {};
      for (const f of payloadFieldData) {
        leadData[f.name] = (f.values?.[0] ?? "").trim();
      }

      // Only when the payload carried NO field_data do we fall back to the Graph API,
      // which needs the client's access token. A missing token skips only the fallback,
      // never the lead itself.
      if (Object.keys(leadData).length === 0) {
        const tokenRes = await admin
          .from("clients")
          .select("meta_access_token")
          .eq("id", client.id)
          .single();
        const accessToken = tokenRes.data?.meta_access_token;
        if (accessToken) {
          try {
            const res = await fetch(
              `https://graph.facebook.com/v19.0/${metaLeadId}?fields=field_data&access_token=${accessToken}`,
            );
            const json = await res.json();
            for (const f of json.field_data ?? []) {
              leadData[f.name] = (f.values?.[0] ?? "").trim();
            }
          } catch {
            // Keep whatever we have (at least meta_lead_id) even if the fetch fails.
          }
        }
      }

      // Reliable brand signal: real campaign name if present, else page_id fallback.
      const pageId = value.page_id ?? null;
      const adName = (value as { ad_name?: string }).ad_name ?? null;
      const campaignName = resolveCampaignName((value as { campaign_name?: string }).campaign_name, pageId);
      const branch = extractBranch(leadData);
      const contact = mapContact(leadData);

      const { data: inserted, error: insertError } = await admin
        .from("leads")
        .insert({
          client_id: client.id,
          meta_lead_id: metaLeadId,
          meta_ad_id: metaAdId,
          meta_ad_name: adName,
          meta_campaign_name: campaignName,
          full_name: contact.full_name,
          phone: contact.phone,
          email: contact.email,
          branch,
          status: "new",
        })
        .select("id")
        .single();

      // A duplicate (unique meta_lead_id) is the expected result of a retry/race and is
      // safe to ignore. Any other insert error is a genuine failure we must surface —
      // a lead should never disappear without a trace.
      if (insertError) {
        if (insertError.code !== "23505") {
          console.error("[leads/webhook] lead insert failed", {
            metaLeadId,
            code: insertError.code,
            message: insertError.message,
          });
        }
        continue;
      }

      // Real-time forward to Duan (speed-to-lead SMS). Guarded — never blocks/breaks
      // ingestion. Only forward textable leads; a phone-less lead still lands in the CRM
      // for visibility but there is nothing for the SMS step to act on.
      if (inserted?.id && contact.phone) {
        const brand = getBrand({ meta_campaign_name: campaignName, meta_ad_name: adName });
        await forwardLead(
          buildForwardPayload({
            id: inserted.id,
            full_name: contact.full_name,
            phone: contact.phone,
            brand,
            branch,
            service: campaignName,
          }),
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
