// Franchise-lead gate for the speed-to-lead forward.
//
// WHY THIS EXISTS: a Sparkling FRANCHISE recruitment ad (high-value ~R1.75m
// investor leads) is about to launch. Those leads MUST land in the CRM and be
// emailed like any other lead, but they must NEVER be forwarded to Duan's
// speed-to-lead SMS/booking endpoint — the "wash" pipeline that texts customers
// to book a car wash. Texting a franchise investor a "book your car wash" SMS
// would be a disaster. The forward fires at THREE sites (live webhook, poll cron,
// nightly backfill cron); this predicate is the single gate all three consult so
// a franchise lead is skipped everywhere.

/**
 * Meta lead form ids belonging to a FRANCHISE recruitment ad. A lead whose form
 * id is in this set is ingested + emailed normally but is NEVER forwarded to the
 * wash SMS endpoint.
 *
 * ▶ TO REGISTER THE REAL FRANCHISE FORM once it exists: paste the Meta form id as
 *   a quoted string on its own line inside the Set below, e.g.
 *   `new Set<string>(["1234567890123456"])`. That single edit is all that is
 *   needed — every forward site already consults this set.
 *
 * Left intentionally EMPTY for now (the franchise form does not exist yet). Until
 * a form id is registered, the name safety-net in isFranchiseLead() covers the ad.
 */
export const FRANCHISE_FORM_IDS: ReadonlySet<string> = new Set<string>([
  // "PASTE_META_FRANCHISE_FORM_ID_HERE",
]);

// The name signal for the interim, before the form id is known. A wash campaign /
// ad / form never carries the literal token "franchise", so this can only ever
// ADD a skip — it cannot false-positive a normal wash lead.
const FRANCHISE_NAME_RE = /franchise/i;

/**
 * True when a lead is a franchise-recruitment lead and must therefore SKIP the
 * Duan speed-to-lead forward. Two-layer detection:
 *   1. Allow-list — the lead's Meta form id is in `formIds` (exact, authoritative
 *      once the form exists; cheap).
 *   2. Name safety-net — the campaign name, ad name OR form name contains
 *      "franchise" (case-insensitive). Covers the interim before the form id is
 *      registered, since the launch campaign/ad are named with "Franchise".
 *
 * FAIL-SAFE DIRECTION: this only ever ADDS a reason to skip the forward. A normal
 * wash lead has no franchise form id and no "franchise" in any name, so it returns
 * false and forwards exactly as before. There is no ambiguity that biases toward a
 * false positive — the literal token "franchise" never appears on a wash lead.
 *
 * `formIds` is injectable for tests only (mirrors branchForForm(id, map)); every
 * production caller uses the live FRANCHISE_FORM_IDS default.
 */
export function isFranchiseLead(
  input: {
    form_id?: string | null;
    campaign_name?: string | null;
    ad_name?: string | null;
    form_name?: string | null;
  },
  formIds: ReadonlySet<string> = FRANCHISE_FORM_IDS,
): boolean {
  const formId = input.form_id?.trim();
  if (formId && formIds.has(formId)) return true;
  return (
    FRANCHISE_NAME_RE.test(input.campaign_name ?? "") ||
    FRANCHISE_NAME_RE.test(input.ad_name ?? "") ||
    FRANCHISE_NAME_RE.test(input.form_name ?? "")
  );
}
