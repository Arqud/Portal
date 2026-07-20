import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authorizeOutcomes } from "@/lib/bookings/auth";
import { parseOutcomePayload, shouldApplyDenormalizedUpdate, type OutcomePayload } from "@/lib/bookings/validate";

// Inbound booking outcomes from Duan's side: one POST per lifecycle event
// (booked / showed / no_show / cancelled / rescheduled), keyed on OUR leads.id
// UUID — the `lead_id` we sent him in the forward payload. Every accepted event
// lands in the booking_events ledger; the freshest event also updates the
// denormalized booking_* columns on the lead. Deliberately NEVER touches
// leads.status — that column is the CRM team's manual workflow.

/**
 * Apply the denormalized latest-state to the lead, unless this event is a
 * stale out-of-order delivery (the ledger insert has already happened either
 * way). booking_time only moves when the event carries one — a bare `showed`
 * must not blank out the slot recorded at `booked`. Returns false ONLY on a
 * genuine DB failure so the caller can surface a 500 (the partner retries, and
 * the duplicate path below re-applies — the update converges).
 */
async function applyDenormalizedUpdate(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  existingUpdatedAt: string | null,
  event: OutcomePayload,
): Promise<boolean> {
  if (!shouldApplyDenormalizedUpdate(existingUpdatedAt, event.occurred_at)) return true;

  const update: Record<string, string> = {
    booking_status: event.outcome,
    booking_updated_at: new Date().toISOString(),
  };
  if (event.booking_time) update.booking_time = event.booking_time;

  const { error } = await admin.from("leads").update(update).eq("id", event.lead_id);
  if (error) {
    console.error("[bookings/outcomes] denormalized update failed", {
      lead_id: event.lead_id,
      code: error.code,
      message: error.message,
    });
    return false;
  }
  return true;
}

// Booking outcome events arrive as POST
export async function POST(request: NextRequest) {
  // Fail closed, and auth BEFORE parsing: an unauthenticated caller must never
  // exercise a byte of the body-handling code — including when no token is
  // configured at all.
  if (!(await authorizeOutcomes(request.headers))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseOutcomePayload(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const event = parsed.payload;

  // Everything past validation is guarded: an unexpected failure must surface
  // as a clean 500 (so the partner retries), never as an unhandled throw.
  try {
    const admin = createSupabaseAdminClient();

    // The lead must exist. A 404 here is the signal Duan needs to see a
    // lead_id mismatch on his side instead of us silently swallowing it.
    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("id, booking_updated_at")
      .eq("id", event.lead_id)
      .maybeSingle();
    if (leadError) {
      console.error("[bookings/outcomes] lead lookup failed", {
        lead_id: event.lead_id,
        code: leadError.code,
        message: leadError.message,
      });
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    if (!lead) {
      return NextResponse.json({ ok: false, error: "unknown lead_id" }, { status: 404 });
    }

    const existingUpdatedAt = (lead as { booking_updated_at: string | null }).booking_updated_at;

    const { error: insertError } = await admin.from("booking_events").insert({
      lead_id: event.lead_id,
      outcome: event.outcome,
      occurred_at: event.occurred_at,
      booking_time: event.booking_time,
      booking_id: event.booking_id,
      raw,
    });

    if (insertError) {
      // A unique violation is a duplicate delivery/retry — expected, harmless,
      // and answered as success so the partner stops retrying. The guarded
      // denormalized update still runs: if the FIRST delivery stored the event
      // but failed the lead update (we answered 500), this retry heals it; if
      // the lead is already fresh, the ordering guard makes it a no-op.
      if (insertError.code === "23505") {
        const healed = await applyDenormalizedUpdate(admin, existingUpdatedAt, event);
        if (!healed) return NextResponse.json({ ok: false }, { status: 500 });
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error("[bookings/outcomes] event insert failed", {
        lead_id: event.lead_id,
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const applied = await applyDenormalizedUpdate(admin, existingUpdatedAt, event);
    if (!applied) return NextResponse.json({ ok: false }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bookings/outcomes] unexpected failure", {
      lead_id: event.lead_id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Events only ever arrive as POST; anything probing with GET gets a 405.
export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}
