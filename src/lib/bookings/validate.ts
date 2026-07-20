// Pure validation + decision logic for the inbound booking-outcomes endpoint.
// Kept free of Next/Supabase so it is unit-testable without mocks. The route is
// a thin shell around these functions.

/** The outcome vocabulary — mirrors the CHECK constraint on public.booking_events. */
export const BOOKING_OUTCOMES = [
  "booked",
  "showed",
  "no_show",
  "cancelled",
  "rescheduled",
] as const;

export type BookingOutcome = (typeof BOOKING_OUTCOMES)[number];

/** A validated, normalised booking-outcome event ready to persist. */
export type OutcomePayload = {
  lead_id: string;
  outcome: BookingOutcome;
  occurred_at: string; // normalised ISO — defaulted to "now" when the sender omits it
  booking_time: string | null; // normalised ISO, or null when not supplied
  booking_id: string | null;
};

export type ParseResult =
  | { ok: true; payload: OutcomePayload }
  | { ok: false; error: string };

// UUID-shaped: 8-4-4-4-12 hex. Deliberately shape-only (no version/variant
// pinning) — the point is catching garbage before a DB round trip, not
// re-implementing the UUID spec; the leads.id lookup is the real authority.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isOutcome(value: unknown): value is BookingOutcome {
  return typeof value === "string" && (BOOKING_OUTCOMES as readonly string[]).includes(value);
}

/**
 * Normalise one optional timestamp field to canonical ISO, or null when absent.
 * Returns undefined when the value is present but not a parseable date — the
 * caller turns that into a 400 naming the field. Canonicalising (rather than
 * storing the sender's string verbatim) keeps the idempotency key deterministic
 * regardless of how the sender formats the same instant.
 */
function normalizeTimestamp(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return undefined;
  return new Date(ms).toISOString();
}

/**
 * Validate + normalise an inbound booking-outcome body.
 *
 * Strict on the fields we key on (lead_id shape, outcome vocabulary, timestamp
 * parseability), silent on everything else — unknown extra keys are ignored so
 * the sender can add fields later without a coordinated deploy. Errors are
 * terse and name the offending field, so the sender's logs are actionable.
 *
 * Pure + total: never throws. `now` is injectable for tests only.
 */
export function parseOutcomePayload(raw: unknown, now: () => Date = () => new Date()): ParseResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const body = raw as Record<string, unknown>;

  const leadId = body.lead_id;
  if (typeof leadId !== "string" || !UUID_RE.test(leadId)) {
    return { ok: false, error: "invalid lead_id" };
  }

  if (!isOutcome(body.outcome)) {
    return { ok: false, error: "invalid outcome" };
  }

  const occurredAt = normalizeTimestamp(body.occurred_at);
  if (occurredAt === undefined) {
    return { ok: false, error: "invalid occurred_at" };
  }

  const bookingTime = normalizeTimestamp(body.booking_time);
  if (bookingTime === undefined) {
    return { ok: false, error: "invalid booking_time" };
  }

  const rawBookingId = body.booking_id;
  if (rawBookingId !== undefined && rawBookingId !== null && typeof rawBookingId !== "string") {
    return { ok: false, error: "invalid booking_id" };
  }
  const bookingId =
    typeof rawBookingId === "string" && rawBookingId.trim() !== "" ? rawBookingId.trim() : null;

  return {
    ok: true,
    payload: {
      lead_id: leadId,
      outcome: body.outcome,
      occurred_at: occurredAt ?? now().toISOString(),
      booking_time: bookingTime,
      booking_id: bookingId,
    },
  };
}

/**
 * Ordering guard for the denormalized columns on public.leads.
 *
 * The ledger (booking_events) records EVERY delivery, but the denormalized
 * lead fields must only ever move forward: a stale, out-of-order delivery must
 * not overwrite fresher state. Skip the update ONLY when we can prove the
 * stored state is strictly newer than this event — a lead that has never been
 * updated (null) or an unparseable stored value always applies.
 */
export function shouldApplyDenormalizedUpdate(
  existingUpdatedAt: string | null,
  eventOccurredAt: string,
): boolean {
  if (!existingUpdatedAt) return true;
  const existingMs = Date.parse(existingUpdatedAt);
  const eventMs = Date.parse(eventOccurredAt);
  if (Number.isNaN(existingMs) || Number.isNaN(eventMs)) return true;
  return existingMs <= eventMs;
}
