// Single source of truth: Meta lead form id → { branch, page_id, label }.
//
// WHY THIS EXISTS: We are cutting over from 2 brand-level forms (each asking
// "which branch is most convenient for you?") to FORM-PER-BRANCH — one Meta form
// per physical branch, with the branch question REMOVED from the new forms. On
// those forms the form id IS the branch signal, so ingestion (webhook + poll
// cron) falls back to this map whenever a lead arrives with no branch answer.
// A branch answer from field_data, when present, ALWAYS wins — the two current
// live forms keep working exactly as before.
//
// This map also drives the poll cron's form list (POLL_FORMS below), so adding
// a new form here is the ONLY edit needed to both poll it and branch-tag its
// leads.

import { WE_WASH_PAGE_ID, SPARKLING_PAGE_ID } from "@/lib/leads/ingest";

export type FormBranchEntry = {
  /**
   * Canonical portal branch string — MUST exactly match an entry in
   * `src/lib/leads/branches.ts` (WE_WASH_BRANCHES / SPARKLING_BRANCHES), which
   * is what normalizeBranch canonicalizes answers to and what Duan's exact-match
   * branch filter keys on. `null` for forms that still carry the branch question
   * (branch comes from the lead's answer, the form implies no single branch).
   * A test asserts every non-null branch here is canonical, so a typo'd entry
   * fails the suite instead of silently mis-routing SMS.
   */
  branch: string | null;
  /** FB Page the form belongs to — the authoritative brand signal for the poller. */
  page_id: string;
  /** Human label, surfaced in the poll cron's per-form output. */
  label: string;
};

export const FORM_BRANCHES: Record<string, FormBranchEntry> = {
  // ── Current live brand-level forms — these still ASK the branch question, so
  //    the form implies no single branch (branch: null; answer drives branch). ──
  "1445058691003630": { branch: null, page_id: WE_WASH_PAGE_ID, label: "We Wash — Book a Valet" },
  "1713965523197151": { branch: null, page_id: SPARKLING_PAGE_ID, label: "Sparkling — Book a Detail" },

  // ── TODO(form-per-branch cutover): when the 9 per-branch Meta forms are
  //    created, add one entry per form below — that single edit makes the cron
  //    poll the form AND branch-tags its leads. Template (replace the form id
  //    with the real one from Meta; branch strings below are the canonical
  //    portal strings from branches.ts and must be copied EXACTLY):
  //
  //    "<META_FORM_ID>": { branch: "Eldo Glen (Centurion)", page_id: WE_WASH_PAGE_ID, label: "We Wash — Eldo Glen" },
  //
  //    We Wash branches (page_id: WE_WASH_PAGE_ID):
  //      "Eldo Glen (Centurion)"
  //      "Old Farm Road / Faerie Glen (Pretoria)"
  //      "Sunnyside (Pretoria)"
  //      "Greenhills (Randfontein)"
  //      "Maraisburg (Roodepoort)"
  //      "Sunward (Boksburg)"
  //      "Lagoon / Stamford Hill (Durban)"
  //
  //    Sparkling branches (page_id: SPARKLING_PAGE_ID):
  //      "Menlyn (Pretoria)"
  //      "Glen Village / Faerie Glen (Pretoria)"
  //      "Rustenburg"
  //      "Amanzimtoti (Durban)"
  //      "Somerset West (Cape Town)"
  //
  //    Keep the two brand-level entries above until their ads are fully off —
  //    late submits on the old forms still carry the branch question and keep
  //    resolving from the answer.
};

// The forms the poll cron polls — derived straight from the map, same shape the
// cron has always used, so a new per-branch entry above is polled automatically.
export const POLL_FORMS: { form_id: string; page_id: string; label: string }[] = Object.entries(
  FORM_BRANCHES,
).map(([form_id, { page_id, label }]) => ({ form_id, page_id, label }));

/**
 * Branch implied by a Meta form id, or null when the form is unknown or is a
 * brand-level form that carries the branch question. `map` is injectable for
 * tests only — production callers always use the live FORM_BRANCHES.
 */
export function branchForForm(
  formId: string | null | undefined,
  map: Record<string, FormBranchEntry> = FORM_BRANCHES,
): string | null {
  if (!formId) return null;
  return map[formId]?.branch ?? null;
}

/**
 * The single branch decision used by both ingestion paths: the lead's own
 * (already-normalized) branch answer always wins; only when the answer is
 * null/empty do we fall back to the branch implied by the form id.
 */
export function resolveBranch(
  extractedBranch: string | null,
  formId: string | null | undefined,
  map: Record<string, FormBranchEntry> = FORM_BRANCHES,
): string | null {
  if (extractedBranch && extractedBranch.trim()) return extractedBranch;
  return branchForForm(formId, map);
}
