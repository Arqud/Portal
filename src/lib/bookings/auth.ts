// Authentication for the inbound booking-outcomes endpoint. Duan's side POSTs
// booking lifecycle events back to us per lead. The endpoint writes to our CRM,
// so it MUST fail closed: a request is processed only when it presents the
// shared token, compared in constant time. There is exactly one legitimate
// caller today — Duan's booking system.

import { safeEqual } from "@/lib/leads/auth";

/** Header the partner presents the shared outcomes token in. */
export const OUTCOMES_TOKEN_HEADER = "x-arqud-outcomes-token";

/**
 * Decide whether an inbound booking-outcomes request is authentic.
 *
 * An empty or unset `BOOKING_OUTCOMES_TOKEN` authorizes NOTHING: without a
 * configured secret there is no proof to check, so every request is rejected.
 * The endpoint simply does not work until the token is provisioned — never the
 * other way round (working-but-open).
 *
 * The token is read per-call rather than captured at module load. This avoids
 * stale module-scope capture WITHIN a running deployment; it does NOT make a
 * newly-added Vercel variable appear on an already-running deployment. On Vercel
 * the environment is fixed at build time, so the rollout requires: set the
 * variable, then deploy.
 */
export async function authorizeOutcomes(headers: Headers): Promise<boolean> {
  const token = process.env.BOOKING_OUTCOMES_TOKEN ?? "";
  const presented = headers.get(OUTCOMES_TOKEN_HEADER) ?? "";
  return Boolean(token && presented && (await safeEqual(presented, token)));
}
