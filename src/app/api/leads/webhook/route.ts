import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveCampaignName, extractBranch, extractPreferredTime, mapContact, normalizeBranch, normalizePreferredTime } from "@/lib/leads/ingest";
import { resolveBranch } from "@/lib/leads/formBranches";
import { getBrand } from "@/lib/leads/brand";
import { authorizeIngest } from "@/lib/leads/auth";
import { buildForwardPayload, sendSignedForward } from "@/lib/leads/forward";
import { pickAttribution, hasFullInlineAttribution } from "@/lib/leads/attribution";
import { sendLeadNotification } from "@/lib/leads/notify";
import { getSetting } from "@/lib/settings/query";

// Forward the lead to Duan's speed-to-lead endpoint. Returns true ONLY when his
// endpoint accepted it (2xx) so the caller can stamp forwarded_at; any failure
// leaves it unmarked for the backfill cron to retry. Fully guarded — a forward
// failure can NEVER throw into or block CRM ingestion.
async function forwardLead(
  payloadObj: ReturnType<typeof buildForwardPayload>,
): Promise<boolean> {
  try {
    const [url, secret] = await Promise.all([
      getSetting("lead_forward_url"),
      getSetting("lead_forward_secret"),
    ]);
    if (!url) return false;
    return await sendSignedForward(url, secret, payloadObj);
  } catch {
    return false;
  }
}

// Meta sends a GET to verify the webhook endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Require a NON-EMPTY configured verify token. Without this guard a blank/unset
  // env var would equal a blank `hub.verify_token`, opening the handshake to anyone
  // who posts `?hub.mode=subscribe&hub.verify_token=`. The empty case must fail closed.
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "";
  if (verifyToken && mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta sends lead events as POST
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Fail closed. Either a valid Meta signature or a valid forwarder token gets in;
  // anything else — including a request arriving while no secret is configured —
  // is rejected before we parse a byte of it. This endpoint triggers real SMS to
  // real customers, so an unauthenticated caller must never reach ingestion.
  if (!(await authorizeIngest(rawBody, request.headers))) {
    return new Response("Unauthorized", { status: 401 });
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

      // Everything Meta-attribution-shaped that rode inline on the body, alias-tolerant
      // and normalised (trimmed strings, numbers coerced, "" treated as absent). This is
      // the primary source; the Graph API is only a fallback for what is missing.
      const inlineAttr = pickAttribution(value);
      const metaAdId = inlineAttr.ad_id;

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

      // Meta attribution. Inline body wins: whatever the sender mapped onto the webhook
      // is authoritative and costs nothing. The Graph lead node is a FALLBACK, consulted
      // only for the ids the body did not supply — and skipped entirely once the body
      // carried both campaign_id and adset_id, since that call is then a pure round trip
      // on a speed-to-lead path. Mirrors the field_data fallback guard: a missing token or
      // a failed fetch leaves these null and NEVER drops the lead — attribution is a
      // bonus, the SMS is not. form_version is not exposed by Meta, so it is always null.
      let metaFormId: string | null = inlineAttr.form_id;
      let metaCampaignId: string | null = inlineAttr.campaign_id;
      let metaAdsetId: string | null = inlineAttr.adset_id;
      if (!hasFullInlineAttribution(inlineAttr)) {
        try {
          const attrTokenRes = await admin
            .from("clients")
            .select("meta_access_token")
            .eq("id", client.id)
            .single();
          const attrToken = attrTokenRes.data?.meta_access_token;
          if (attrToken) {
            const res = await fetch(
              `https://graph.facebook.com/v19.0/${metaLeadId}?fields=campaign_id,adset_id,form_id&access_token=${attrToken}`,
            );
            const json = await res.json();
            // Same normaliser as the inline read, and strictly gap-filling: a Graph value
            // can never overwrite an id the body already gave us.
            const graphAttr = pickAttribution(json);
            metaCampaignId = metaCampaignId ?? graphAttr.campaign_id;
            metaAdsetId = metaAdsetId ?? graphAttr.adset_id;
            metaFormId = metaFormId ?? graphAttr.form_id;
          }
        } catch {
          // Leave attribution fields null on any error — the lead still ingests + forwards.
        }
      }

      // Reliable brand signal: real campaign name if present, else page_id fallback.
      const pageId = value.page_id ?? null;
      const adName = inlineAttr.ad_name;
      const campaignName = resolveCampaignName((value as { campaign_name?: string }).campaign_name, pageId);
      // Branch: the lead's own answer (normalized) always wins; per-branch forms
      // carry no branch question, so fall back to the branch the form id implies.
      const branch = resolveBranch(normalizeBranch(extractBranch(leadData)), metaFormId);
      const preferredTime = normalizePreferredTime(extractPreferredTime(leadData));
      const contact = mapContact(leadData);

      const { data: inserted, error: insertError } = await admin
        .from("leads")
        .insert({
          client_id: client.id,
          meta_lead_id: metaLeadId,
          meta_ad_id: metaAdId,
          meta_campaign_id: metaCampaignId,
          meta_adset_id: metaAdsetId,
          meta_form_id: metaFormId,
          meta_form_version: null,
          meta_ad_name: adName,
          meta_campaign_name: campaignName,
          full_name: contact.full_name,
          phone: contact.phone,
          email: contact.email,
          branch,
          preferred_time: preferredTime,
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

      // Forward to Duan (speed-to-lead SMS). Only forward textable leads; a phone-less
      // lead still lands in the CRM for visibility but there is nothing to text. On a
      // successful forward we stamp forwarded_at; a failure leaves it null so the
      // backfill cron re-attempts it — a missed SMS is never silently dropped.
      if (inserted?.id && contact.phone) {
        const brand = getBrand({ meta_campaign_name: campaignName, meta_ad_name: adName });
        const forwarded = await forwardLead(
          buildForwardPayload({
            id: inserted.id,
            full_name: contact.full_name,
            phone: contact.phone,
            brand,
            branch,
            service: campaignName,
            preferred_time: preferredTime,
            meta_lead_id: metaLeadId,
            ad_id: metaAdId,
            campaign_id: metaCampaignId,
            adset_id: metaAdsetId,
            form_id: metaFormId,
            form_version: null,
          }),
        );
        if (forwarded) {
          await admin
            .from("leads")
            .update({ forwarded_at: new Date().toISOString() })
            .eq("id", inserted.id);
        }
      }

      // Email the client's brand inbox about the new lead. Runs AFTER the forward
      // so email latency never delays the speed-to-lead SMS, and only on this
      // success path — a duplicate delivery bailed out above, so a lead is never
      // emailed twice. Fully guarded inside sendLeadNotification: a failure can
      // NEVER throw into or block ingestion.
      if (inserted?.id) {
        await sendLeadNotification({
          full_name: contact.full_name,
          phone: contact.phone,
          branch,
          service: campaignName,
          preferred_time: preferredTime,
          brand: getBrand({ meta_campaign_name: campaignName, meta_ad_name: adName }),
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
