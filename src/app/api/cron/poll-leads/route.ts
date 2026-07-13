import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/settings/query";
import {
  resolveCampaignName,
  extractBranch,
  extractPreferredTime,
  mapContact,
  normalizeBranch,
  normalizePreferredTime,
  WE_WASH_PAGE_ID,
  SPARKLING_PAGE_ID,
} from "@/lib/leads/ingest";
import { getBrand } from "@/lib/leads/brand";
import { buildForwardPayload, sendSignedForward } from "@/lib/leads/forward";
import { sendLeadNotification } from "@/lib/leads/notify";

// Portal-native lead poller — the Make.com replacement. A free external scheduler
// (cron-job.org) hits this every ~2 min. It asks the Meta Graph API for recent
// leads on each pilot form (using the client's stored access token), then ingests
// + forwards each NEW one exactly like the webhook does. Zero middleware, zero
// per-lead cost. Idempotent: dedups on meta_lead_id; Duan dedups on lead_id.
//
// Because we poll PER FORM, we know the brand for certain (page_id per form) — more
// reliable than deriving brand from a campaign name.

const POLL_KEY = "arqud_poll_7Hn3Kp9Wx2Qz"; // ?key= guard (private repo, matches backfill pattern)
const GRAPH = "https://graph.facebook.com/v19.0";
const MAX_PER_FORM = 50;

// The pilot lead forms to poll, each tagged with the page it belongs to (page_id is
// the authoritative brand signal). Edit here if the live ad forms ever change.
const POLL_FORMS: { form_id: string; page_id: string; label: string }[] = [
  { form_id: "1445058691003630", page_id: WE_WASH_PAGE_ID, label: "We Wash — Book a Valet" },
  { form_id: "1713965523197151", page_id: SPARKLING_PAGE_ID, label: "Sparkling — Book a Detail" },
];

type MetaLead = {
  id: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
  field_data?: { name: string; values: string[] }[];
};

export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");
  const auth = request.headers.get("authorization") ?? "";
  const isVercelCron = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (key !== POLL_KEY && !isVercelCron) {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  // The single Meta client (Arno). Its stored token reads the leads — same token the
  // webhook already uses for its Graph fallback.
  const { data: client } = await admin
    .from("clients")
    .select("id, meta_access_token")
    .not("meta_ad_account_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (!client?.id) return NextResponse.json({ ok: false, error: "no meta client found" });
  const token = client.meta_access_token as string | null;
  if (!token) return NextResponse.json({ ok: false, error: "no meta_access_token on client" });

  // Forward config (pasted once in Settings). If unset we still ingest — just no SMS.
  const [fwdUrl, fwdSecret] = await Promise.all([
    getSetting("lead_forward_url"),
    getSetting("lead_forward_secret"),
  ]);

  const polled: Record<string, unknown>[] = [];

  for (const form of POLL_FORMS) {
    const out: Record<string, unknown> = { form: form.label, fetched: 0, inserted: 0, forwarded: 0 };
    try {
      const res = await fetch(
        `${GRAPH}/${form.form_id}/leads?fields=id,created_time,ad_id,ad_name,campaign_name,field_data` +
          `&limit=${MAX_PER_FORM}&access_token=${encodeURIComponent(token)}`,
      );
      const json = (await res.json()) as {
        data?: MetaLead[];
        error?: { message?: string; code?: number };
      };

      // A Graph error here is the #1 thing to surface — it means the token can't read
      // this form's leads (expired / missing leads_retrieval / no access to the form).
      if (json.error) {
        out.error = json.error.message ?? "graph error";
        out.error_code = json.error.code ?? null;
        polled.push(out);
        continue;
      }

      const leads = json.data ?? [];
      out.fetched = leads.length;

      for (const lead of leads) {
        const metaLeadId = lead.id;

        const { data: existing } = await admin
          .from("leads")
          .select("id")
          .eq("meta_lead_id", metaLeadId)
          .maybeSingle();
        if (existing) continue; // already ingested on a prior poll

        const leadData: Record<string, string> = {};
        for (const f of lead.field_data ?? []) {
          leadData[f.name] = (f.values?.[0] ?? "").trim();
        }

        const campaignName = resolveCampaignName(lead.campaign_name, form.page_id);
        const branch = normalizeBranch(extractBranch(leadData));
        const preferredTime = normalizePreferredTime(extractPreferredTime(leadData));
        const contact = mapContact(leadData);

        const { data: inserted, error: insertError } = await admin
          .from("leads")
          .insert({
            client_id: client.id,
            meta_lead_id: metaLeadId,
            meta_ad_id: lead.ad_id ?? null,
            meta_ad_name: lead.ad_name ?? null,
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

        if (insertError) {
          // A duplicate (unique meta_lead_id) is an expected race with another poll and
          // is safe to ignore. Any other error we surface — a lead must never vanish.
          if (insertError.code !== "23505") {
            console.error("[cron/poll-leads] insert failed", {
              metaLeadId,
              code: insertError.code,
              message: insertError.message,
            });
          }
          continue;
        }
        out.inserted = (out.inserted as number) + 1;

        // Forward to Duan (speed-to-lead SMS). Only textable leads; stamp forwarded_at
        // on a 2xx so the backfill cron never re-sends a delivered one.
        if (inserted?.id && contact.phone && fwdUrl) {
          const brand = getBrand({
            meta_campaign_name: campaignName,
            meta_ad_name: lead.ad_name ?? null,
          });
          const ok = await sendSignedForward(
            fwdUrl,
            fwdSecret,
            buildForwardPayload({
              id: inserted.id,
              full_name: contact.full_name,
              phone: contact.phone,
              brand,
              branch,
              service: campaignName,
              preferred_time: preferredTime,
            }),
          );
          if (ok) {
            await admin
              .from("leads")
              .update({ forwarded_at: new Date().toISOString() })
              .eq("id", inserted.id);
            out.forwarded = (out.forwarded as number) + 1;
          }
        }

        // Email the client's brand inbox about the new lead — same guarded call as
        // the webhook, AFTER the forward so it never delays the SMS. Only reached
        // on a genuinely NEW insert (duplicates bailed out above), so a re-poll
        // can never email the same lead twice.
        if (inserted?.id) {
          await sendLeadNotification({
            full_name: contact.full_name,
            phone: contact.phone,
            branch,
            service: campaignName,
            preferred_time: preferredTime,
            brand: getBrand({
              meta_campaign_name: campaignName,
              meta_ad_name: lead.ad_name ?? null,
            }),
            created_at: lead.created_time ?? null,
          });
        }
      }
    } catch (e) {
      out.error = e instanceof Error ? e.message : "fetch failed";
    }
    polled.push(out);
  }

  return NextResponse.json({ ok: true, polled });
}
