# Proposals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Proposals feature per `docs/superpowers/specs/2026-07-11-proposals-design.md` — admin-composed pitch documents shared via public tokenized link with typed-name acceptance, accept-notification email, and convert-to-invoice.

**Architecture:** New standalone module (tables `proposals` + `proposal_line_items`, admin pages under `/admin/proposals`, public page `/p/[token]`) that reuses the portal's proven machinery: invoice calculations/numbering, Finances action patterns (`requireAdmin` + admin client + `revalidatePath`), the guarded Resend email pattern with `getResendApiKey()`, and the existing dark/gold UI kit.

**Tech Stack:** Next.js 16 App Router, Supabase (service-role admin client), TypeScript, vitest, Resend, Tailwind (portal's arqud-* tokens).

## Global Constraints

- Branch: `proposals` (already exists; spec + this plan are committed on it). Commit per task.
- The SPEC IS AUTHORITATIVE for behavior, security, and UX. Read it in full before Task 1: `docs/superpowers/specs/2026-07-11-proposals-design.md`.
- Test baseline 102 must stay green after every task. `npx tsc --noEmit` and `npx eslint <touched files>` clean after every task.
- No new dependencies. No modifications to leads code, `vercel.json`, `proxy.ts` (verify-only), or Finances behavior (reuse only).
- Never log or expose the Resend key; recipient-supplied text is HTML-escaped anywhere interpolated into email HTML (copy `escapeHtml` from `src/lib/leads/notify.ts`).
- All money display: `R {n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` (existing idiom).
- Status vocabulary everywhere: `draft | sent | accepted | declined` — Pill tones: draft=neutral, sent=contacted, accepted=converted, declined=danger (see `QuoteTable.tsx` STATUS_TONE).
- UI identity: portal dark `#0b0b0c` / gold `#c8a96e`, Cormorant Garamond display + Jost body, existing `Table/Tr/Td/Pill/Button/KpiCard` primitives, mobile = `sm:hidden` stacked cards + `hidden sm:block` table.
- **Task 8 (public page) MUST consult the `ui-ux-pro-max` skill for its design pass** (Morne's standing rule); `/wewash/page.tsx` is the in-repo reference for public-page polish.

---

## File Map

| File | Responsibility |
|---|---|
| `supabase/migrations/20260711_proposals.sql` | Tables + indexes (SQL verbatim in spec §Data model) |
| `src/lib/proposals/types.ts` | Shared types (below, verbatim) |
| `src/lib/proposals/token.ts` | `generateShareToken()` |
| `src/lib/proposals/rules.ts` | Pure acceptance rules |
| `src/lib/proposals/notify.ts` | Accepted-email builder + guarded sender |
| `src/lib/proposals/__tests__/*.test.ts` | Unit tests for the three libs |
| `src/app/admin/proposals/actions.ts` | All admin server actions |
| `src/app/admin/proposals/page.tsx` | Admin list (server) |
| `src/app/admin/proposals/ProposalsTable.tsx` | List UI (client): table + mobile cards + row actions |
| `src/app/admin/proposals/ProposalForm.tsx` | Create/edit form (client) |
| `src/app/admin/proposals/new/page.tsx` | New page (server wrapper: loads clients) |
| `src/app/admin/proposals/[id]/edit/page.tsx` | Edit page (server wrapper: loads proposal + clients) |
| `src/app/admin/proposals/[id]/page.tsx` | Admin detail page (preview + actions + acceptance record) |
| `src/app/p/[token]/page.tsx` | Public proposal page (server) |
| `src/app/p/[token]/AcceptBlock.tsx` | Typed-name accept / decline UI (client) |
| `src/app/p/[token]/actions.ts` | `acceptProposal` / `declineProposal` server actions |
| `src/components/ui/Sidebar.tsx` | Remove `soon: true` from Proposals |

## Locked Interfaces (all tasks conform to these EXACTLY)

```ts
// src/lib/proposals/types.ts
export type ProposalStatus = "draft" | "sent" | "accepted" | "declined";

export interface ProposalSection {
  heading: string;
  bullets: string[];
}

export interface ProposalLineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface Proposal {
  id: string;
  proposal_number: string;
  client_id: string | null;
  prospect_name: string | null;
  prospect_company: string | null;
  prospect_email: string | null;
  title: string;
  intro: string | null;
  sections: ProposalSection[];
  terms: string | null;
  valid_until: string | null; // ISO date
  status: ProposalStatus;
  share_token: string;
  first_viewed_at: string | null;
  accepted_by_name: string | null;
  accepted_at: string | null;
  accepted_ip: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  converted_to_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalWithItems extends Proposal {
  line_items: ProposalLineItem[];
  client?: { id: string; name: string; company: string | null; email: string | null } | null;
}

// Recipient display everywhere: client?.company ?? client?.name ?? prospect_company ?? prospect_name ?? "—"
```

```ts
// src/lib/proposals/token.ts
export function generateShareToken(): string; // 32 lowercase hex chars from crypto.getRandomValues(new Uint8Array(16))
```

```ts
// src/lib/proposals/rules.ts  (PURE — no imports beyond types)
export type AcceptBlockReason = "draft" | "accepted" | "declined" | "expired";
export function canAccept(
  p: { status: ProposalStatus; valid_until: string | null },
  today?: Date, // injectable for tests; default new Date()
): { ok: true } | { ok: false; reason: AcceptBlockReason };
// Rules: draft -> {ok:false,"draft"}; accepted -> "accepted"; declined -> "declined";
// sent + valid_until strictly before today's date (date-only compare, SAST) -> "expired"; else ok.
```

```ts
// src/lib/proposals/notify.ts
export function buildProposalAcceptedEmail(p: {
  title: string; proposal_number: string; recipient: string;
  accepted_by_name: string; accepted_at_sast: string; total: number;
}): { subject: string; html: string };
// subject: `Proposal accepted — ${title} — ${recipient}`
export async function sendProposalAcceptedEmail(p: /* same shape */): Promise<void>;
// Guarded like sendLeadNotification: key via getResendApiKey(); recipient from
// getSetting("proposal_notify_email") ?? "Morne@arqud.com"; from "ARQUD Portal <noreply@arqudportal.co.za>";
// every exit logs its reason with prefix [proposals/notify]; NEVER throws.
```

```ts
// src/app/admin/proposals/actions.ts  ("use server", requireAdmin pattern copied from admin/finances/actions.ts)
export async function createProposal(input: ProposalInput): Promise<{ id: string }>;
export async function updateProposal(id: string, input: ProposalInput): Promise<void>; // only while draft|sent
export async function markProposalSent(id: string): Promise<void>;
export async function markProposalDeclined(id: string, reason?: string): Promise<void>;
export async function deleteProposal(id: string): Promise<void>; // delete line items then row; any status; confirm lives in UI
export async function createClientFromProposal(id: string): Promise<{ clientId: string }>; // inserts clients row from prospect_* fields, sets proposals.client_id
export async function convertProposalToInvoice(id: string): Promise<{ invoiceId: string }>; // requires client_id + status accepted; creates DRAFT invoice + items via existing numbering/calculations; stamps converted_to_invoice_id
// ProposalInput = { client_id: string | null; prospect_name/company/email: string | null; title: string;
//   intro/terms: string | null; valid_until: string | null; sections: ProposalSection[]; lineItems: Omit<ProposalLineItem,"id">[] }
// createProposal: proposal_number via nextDocumentNumber pattern with type "proposal" prefix "PRO";
// share_token via generateShareToken(); status "draft".
// Every mutation ends with revalidatePath("/admin/proposals") + revalidatePath("/p/[token]", "page").
```

```ts
// src/app/p/[token]/actions.ts ("use server" — PUBLIC, no auth; validate everything server-side)
export async function acceptProposal(token: string, name: string): Promise<{ ok: boolean; error?: string }>;
// re-fetch by token; canAccept(); already accepted -> { ok: true } (idempotent);
// trim name, require length >= 3, cap 120; IP = first hop of x-forwarded-for via headers();
// update accepted_* + status; sendProposalAcceptedEmail (guarded); revalidatePath("/p/[token]", "page").
export async function declineProposal(token: string, reason?: string): Promise<{ ok: boolean }>;
// only from status "sent"; reason trimmed, cap 300.
```

---

### Task 1: Migration + shared types

**Files:** Create `supabase/migrations/20260711_proposals.sql` (copy SQL **verbatim** from spec §Data model, plus RLS posture copied from migration `0003_phase6_invoices.sql`'s tables) · Create `src/lib/proposals/types.ts` (verbatim from Locked Interfaces).

- [ ] Write both files. Migration must also seed nothing — `document_numbers` rows are created lazily by `nextDocumentNumber` (verify by reading `src/lib/invoices/numbering.ts`; if it requires a seeded row per (type,year), add the `insert ... on conflict do nothing` seed for `('proposal', 2026)` mirroring migration 0003's seeding).
- [ ] `npx tsc --noEmit` clean.
- [ ] Commit: `feat(proposals): schema migration + shared types`

### Task 2: token + rules libs (TDD)

**Files:** Create `src/lib/proposals/token.ts`, `src/lib/proposals/rules.ts`, `src/lib/proposals/__tests__/token.test.ts`, `src/lib/proposals/__tests__/rules.test.ts`.

- [ ] Write failing tests first: token → 32 chars, `/^[0-9a-f]{32}$/`, two calls differ; rules → each status branch, expired boundary (valid_until yesterday → expired; today → ok; null → ok), injectable `today`.
- [ ] Run `npm run test -- proposals` → new tests FAIL (modules missing).
- [ ] Implement both modules per Locked Interfaces.
- [ ] `npm run test` → full suite green (102 + new).
- [ ] Commit: `feat(proposals): share token + acceptance rules`

### Task 3: accepted-email lib (TDD)

**Files:** Create `src/lib/proposals/notify.ts` + `src/lib/proposals/__tests__/notify.test.ts`. Read `src/lib/leads/notify.ts` FIRST and mirror its structure (template style, `[prefix]` reason logging, guarded sender, Resend SDK returned-`error` handling), and `src/lib/settings/resend.ts` for key resolution.

- [ ] Failing tests: subject/html contain title, recipient, accepted_by_name, formatted total; HTML-escaping of a `<script>` name; sender skips (no throw) when no key; recipient falls back to `Morne@arqud.com` when setting unset (mock `getSetting`).
- [ ] Implement; template = dark/gold like the lead email but headline "PROPOSAL ACCEPTED".
- [ ] Full suite green. Commit: `feat(proposals): acceptance notification email`

### Task 4: admin server actions

**Files:** Create `src/app/admin/proposals/actions.ts`. Read `src/app/admin/finances/actions.ts` FIRST (requireAdmin, insert/update/delete idioms, invoice creation + numbering + calculations) and reuse — `convertProposalToInvoice` must produce exactly what `convertQuoteToInvoice` produces (draft invoice + line items), sourced from proposal items.

- [ ] Implement all actions per Locked Interfaces. App-level guard in create/update: reject when `client_id` is null AND `prospect_name` is blank.
- [ ] `npx tsc --noEmit` + eslint clean; full suite green. Commit: `feat(proposals): admin actions (CRUD, status, convert)`

### Task 5: admin list page

**Files:** Create `src/app/admin/proposals/page.tsx` (server: fetch `proposals` with `client:clients(...)` + `line_items:proposal_line_items(*)`, order created desc) + `src/app/admin/proposals/ProposalsTable.tsx` (client). Read `src/app/admin/finances/QuoteTable.tsx` + the mobile-card pattern in `CampaignsBrandView.tsx` first.

- [ ] Columns: Proposal #, Recipient, Title, Total (sum of item amounts, excl-VAT display), Status Pill, Created (`formatDateTime` from `src/lib/leads/format.ts`). Row actions: View → `/admin/proposals/[id]`, Copy link (`navigator.clipboard.writeText`, "✓ Copied" transient), Mark Sent (draft), Delete (confirm; status-aware message for accepted: `Delete ACCEPTED proposal ${number}?`). "+ New Proposal" → `/admin/proposals/new`. Empty state consistent with QuoteTable's.
- [ ] Mobile stacked cards. tsc/eslint/tests green. Commit: `feat(proposals): admin list`

### Task 6: create/edit form

**Files:** Create `src/app/admin/proposals/ProposalForm.tsx` + `new/page.tsx` + `[id]/edit/page.tsx`. Read `src/app/admin/finances/QuoteForm.tsx` first for field styling/line-item rows.

- [ ] Recipient block: radio "Existing client" (dropdown of clients) / "New prospect" (name*, company, email inputs). Title*, intro textarea, **sections builder** (repeatable: heading input + one-bullet-per-line textarea mapped to `bullets[]`; add/remove; order = array order), line items (desc/qty/rate rows, live amount via `calcLineAmount`, running total via `calcSubtotal`), terms textarea, valid-until date input.
- [ ] Submit → `createProposal`/`updateProposal` → `router.push("/admin/proposals/" + id)`. Edit page redirects to detail when status is accepted/declined (locked).
- [ ] tsc/eslint/tests green. Commit: `feat(proposals): create/edit form`

### Task 7: admin detail page

**Files:** Create `src/app/admin/proposals/[id]/page.tsx` (+ small client component for its action buttons).

- [ ] Renders full proposal preview (same visual order as public page) + meta panel: status pill, share-link copy button, timestamps (`first_viewed_at` as "First viewed …", acceptance record "Accepted by {name} on {SAST time} from {ip}"), decline reason when present.
- [ ] Actions by state: draft → Edit, Mark Sent, Delete; sent → Edit, Copy link, Mark Declined (optional reason prompt), Delete; accepted → (prospect w/o client_id) Create client → then Convert to Invoice → after conversion show gold "Invoiced" + link text `INV number`; declined → Delete only + reason display.
- [ ] tsc/eslint/tests green. Commit: `feat(proposals): admin detail + conversion flow`

### Task 8: public page + acceptance (design-critical)

**Files:** Create `src/app/p/[token]/page.tsx`, `AcceptBlock.tsx`, `actions.ts`. **Consult the `ui-ux-pro-max` skill for the design pass** (standing rule). Read `/src/app/wewash/page.tsx` (public polish reference) + spec §Public page.

- [ ] Server page: fetch by token (admin client). Unknown token → `notFound()`. Fire-and-forget `first_viewed_at` update when null & status `sent`. Layout: ARQUD wordmark header → title + recipient → intro → sections (gold headings, ✓ bullets) → pricing table + total → terms → validity line → AcceptBlock. Fully responsive (phone-first); no horizontal scroll; `<title>` = proposal title.
- [ ] Draft: discreet "Preview — not yet sent" line instead of AcceptBlock. Expired (per `canAccept`): friendly "This proposal has expired — contact Morne@arqud.com". Accepted/declined: render outcome state.
- [ ] `AcceptBlock`: typed-name input + ACCEPT button (gold, disabled while pending) → `acceptProposal(token, name)`; success swaps to "Accepted by {name} on {date}" without reload (router.refresh()). Quiet "Decline instead" reveal → optional reason + confirm → `declineProposal`.
- [ ] Verify public reachability: `next build` route output shows `/p/[token]` as dynamic; confirm no auth gate applies (check `src/proxy.ts` read-only).
- [ ] tsc/eslint/tests green. Commit: `feat(proposals): public share page + typed-name acceptance`

### Task 9: sidebar + full verification

**Files:** Modify `src/components/ui/Sidebar.tsx` (remove `soon: true` from Proposals).

- [ ] `npx tsc --noEmit` · `npx eslint` on all new/modified files · `npm run test` (full) · `npm run build` — ALL green.
- [ ] Commit: `feat(proposals): enable sidebar entry`
- [ ] Push branch; open PR against main titled "Proposals: pitch, share link, typed-name acceptance" — body: what it is (4 approved scope decisions), the migration Morne must run (`supabase/migrations/20260711_proposals.sql` — feature is inert until then), smoke-test checklist from spec §Verification, verification results. End PR body with the Claude Code attribution line.

## Self-Review (run before finishing)

1. Spec coverage: every spec section maps to a task (data model→1, libs/security→2-3, actions→4, admin→5-7, public/email→8/3, sidebar/rollout→9).
2. No placeholder steps remain; interfaces used in later tasks match Locked Interfaces verbatim.
3. Status/tone vocabulary and recipient-display rule identical across Tasks 5, 7, 8.
