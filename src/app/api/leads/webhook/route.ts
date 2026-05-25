import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

      // Fetch the actual lead data from Meta
      const accessTokenRes = await admin
        .from("clients")
        .select("meta_access_token, meta_ad_account_id")
        .eq("id", client.id)
        .single();

      const accessToken = accessTokenRes.data?.meta_access_token;
      if (!accessToken) continue;

      let leadData: Record<string, string> = {};
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${metaLeadId}?fields=field_data&access_token=${accessToken}`,
        );
        const json = await res.json();
        for (const f of json.field_data ?? []) {
          leadData[f.name] = f.values?.[0] ?? "";
        }
      } catch {
        // Store what we have even if field fetch fails
      }

      await admin.from("leads").insert({
        client_id: client.id,
        meta_lead_id: metaLeadId,
        meta_ad_id: metaAdId,
        full_name: leadData["full_name"] ?? leadData["name"] ?? null,
        phone: leadData["phone_number"] ?? leadData["phone"] ?? null,
        email: leadData["email"] ?? null,
        branch: leadData["branch"] ?? leadData["location"] ?? null,
        status: "new",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
