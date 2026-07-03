import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/settings/query";
import { forwardPayloadFromLead, sendSignedForward, type LeadRow } from "@/lib/leads/forward";

// Retry/backfill for the speed-to-lead forward. A lead's forward can fail if Duan's
// endpoint is briefly down or slow (>8s) — the lead is safe in the CRM but its SMS was
// missed. This cron re-attempts any recent, textable lead with forwarded_at still NULL,
// so a missed SMS is never silently lost. Idempotent: Duan dedups on lead_id.

// Stable capability token (private repo, matches the iCal-feed pattern). Vercel cron
// calls this path with ?key=. CRON_SECRET header is also accepted if configured.
const BACKFILL_KEY = "arqud_bf_9Fq2Lx7Rj4Vt";

// Only retry leads from the last 24h — avoids re-sending ancient/test leads if the
// forward URL is configured for the first time.
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PER_RUN = 100;

export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");
  const auth = request.headers.get("authorization") ?? "";
  const isVercelCron =
    !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (key !== BACKFILL_KEY && !isVercelCron) {
    return new Response("Forbidden", { status: 403 });
  }

  const [url, secret] = await Promise.all([
    getSetting("lead_forward_url"),
    getSetting("lead_forward_secret"),
  ]);
  if (!url) return NextResponse.json({ ok: true, skipped: "no forward url configured" });

  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data: leads } = await admin
    .from("leads")
    .select("id,full_name,phone,branch,meta_campaign_name,meta_ad_name")
    .is("forwarded_at", null)
    .not("phone", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);

  let forwarded = 0;
  for (const row of (leads ?? []) as LeadRow[]) {
    if (!row.phone) continue; // nothing to text
    const ok = await sendSignedForward(url, secret, forwardPayloadFromLead(row));
    if (ok) {
      await admin
        .from("leads")
        .update({ forwarded_at: new Date().toISOString() })
        .eq("id", row.id);
      forwarded++;
    }
  }

  return NextResponse.json({ ok: true, considered: leads?.length ?? 0, forwarded });
}
