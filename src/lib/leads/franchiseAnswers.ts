// Pull the four franchise qualifier answers — capital band, timeline, funds-available
// and area — out of a lead's raw form_answers map (the { [questionName]: value } map
// captured at ingest). This is the whole point of the Sparkling Franchise Leads page:
// a franchise lead row must show "how much capital" at a glance.
//
// The exact Meta field NAMES are not known until the form exists, so we match on
// keyword patterns in the question name (tolerant of slugging like
// "how_much_capital_can_you_invest"). Pure + unit-tested so the matching is verified
// independently of the UI.

export type FranchiseQualifiers = {
  capital: string | null;
  timeline: string | null;
  funds: string | null;
  area: string | null;
  // Any remaining answers (not contact fields, not one of the four above), humanised,
  // so the full form is still visible in detail without ever hiding an answer.
  other: { label: string; value: string }[];
};

// Contact fields are already shown as name/phone/email columns — never surface them as
// "qualifier answers".
const CONTACT_KEY_RE = /^(full[_\s-]?name|first[_\s-]?name|last[_\s-]?name|name|phone[_\s-]?number|phone|mobile|cell|email|e[_\s-]?mail)$/i;

// Ordered so the most specific signal claims a key first (capital before funds, etc.).
const CAPITAL_RE = /capital|invest|budget|afford|how[_\s-]?much/i;
const TIMELINE_RE = /when|timeline|time[_\s-]?frame|timeframe|start|begin|soon|ready|how[_\s-]?long/i;
const FUNDS_RE = /fund|finance|financ|cash|liquid|savings|deposit|access[_\s-]?to/i;
const AREA_RE = /area|region|province|city|town|location|suburb|where|interested[_\s-]?in|which[_\s-]?branch/i;

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractFranchiseQualifiers(
  answers: Record<string, string> | null | undefined,
): FranchiseQualifiers {
  const result: FranchiseQualifiers = { capital: null, timeline: null, funds: null, area: null, other: [] };
  if (!answers || typeof answers !== "object") return result;

  const entries = Object.entries(answers)
    .map(([k, v]) => [k, (v ?? "").toString().trim()] as const)
    .filter(([k, v]) => v !== "" && !CONTACT_KEY_RE.test(k));

  const used = new Set<string>();
  const pick = (re: RegExp): string | null => {
    for (const [k, v] of entries) {
      if (used.has(k)) continue;
      if (re.test(k)) {
        used.add(k);
        return v;
      }
    }
    return null;
  };

  result.capital = pick(CAPITAL_RE);
  result.timeline = pick(TIMELINE_RE);
  result.funds = pick(FUNDS_RE);
  result.area = pick(AREA_RE);

  for (const [k, v] of entries) {
    if (used.has(k)) continue;
    result.other.push({ label: humanize(k), value: v });
  }

  return result;
}

// Ordered, labeled qualifier rows for the franchise lead-notification email. The four
// headline signals lead — Capital FIRST so the capital band is the most prominent row —
// then Timeline, Funds, Area, then any remaining answers (already humanised). Null/blank
// values are dropped so the email never shows an empty qualifier row. Built on top of
// extractFranchiseQualifiers so the field-matching logic lives in exactly one place; the
// two ingestion call sites (webhook + poll cron) both feed this into sendLeadNotification.
export function franchiseQualifierRows(
  answers: Record<string, string> | null | undefined,
): { label: string; value: string }[] {
  const q = extractFranchiseQualifiers(answers);
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null) => {
    const v = value?.trim();
    if (v) rows.push({ label, value: v });
  };
  push("Capital", q.capital);
  push("Timeline", q.timeline);
  push("Funds", q.funds);
  push("Area", q.area);
  for (const o of q.other) push(o.label, o.value);
  return rows;
}
