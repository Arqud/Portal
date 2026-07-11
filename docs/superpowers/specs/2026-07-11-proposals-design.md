# Proposals — Design Spec (2026-07-11)

## Purpose

Replace the sidebar "Proposals — Soon" stub with a working Proposals feature: a selling
document Morne composes in the admin, shares as a public link (WhatsApp-friendly), and the
recipient accepts with a typed-name e-sign. Works for **existing clients and brand-new
prospects** (people not yet in `clients`). On acceptance Morne gets an email and converts
the proposal into an invoice with one click.

Approved scope decisions (Morne, 2026-07-11):
1. **Both-in-one** — recipient is a linked client OR a free-typed prospect.
2. **Typed-name e-sign** — full name + Accept; record name, timestamp, IP. No external e-sign service.
3. **Structured sections** — fixed building blocks, not a freeform editor.
4. **On accept** — email Morne + lock proposal + manual Convert buttons. Nothing auto-fires.

## Out of scope (deliberate, YAGNI)

- PDF export of proposals (the link is the document).
- Templates / duplicate-from-last (fast follow if used often).
- Real e-sign services (DocuSign etc.).
- Expiry automation/cron. `valid_until` renders, and the accept action refuses past-date
  acceptance (guard, not automation).
- Client-portal visibility of proposals (`/client/*`) — proposals are Morne↔recipient via link.

## Data model

New migration `supabase/migrations/20260711_proposals.sql` (Morne runs it in the Supabase SQL
editor — no local DB creds on this machine):

```sql
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_number text not null unique,          -- PRO-2026-001 via existing numbering pattern
  client_id uuid references public.clients(id),  -- nullable: prospect proposals have no client yet
  prospect_name text,                            -- required when client_id is null
  prospect_company text,
  prospect_email text,
  title text not null,
  intro text,                                    -- short pitch paragraph
  sections jsonb not null default '[]'::jsonb,   -- [{ "heading": text, "bullets": text[] }]
  terms text,
  valid_until date,
  status text not null default 'draft',          -- draft | sent | accepted | declined
  share_token text not null unique,              -- 32+ hex chars, crypto-random
  first_viewed_at timestamptz,                   -- set on first public GET while status='sent'
  accepted_by_name text,
  accepted_at timestamptz,
  accepted_ip text,
  declined_at timestamptz,
  decline_reason text,
  converted_to_invoice_id uuid references public.invoices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_client_id_idx on public.proposals(client_id);
create index proposals_share_token_idx on public.proposals(share_token);

create table public.proposal_line_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  rate numeric not null default 0,
  amount numeric not null default 0,
  sort_order int not null default 0
);
create index proposal_line_items_proposal_id_idx on public.proposal_line_items(proposal_id);
```

Notes:
- `proposal_number` uses the existing `document_numbers` mechanism from
  `src/lib/invoices/numbering.ts` with a new type `proposal` (table already keys on
  `(type, year)` — `on conflict do nothing` seeding pattern as in migration 0003).
- All access is server-side via the service-role admin client (same as leads/invoices);
  RLS posture mirrors the existing tables in migration 0003 — copy that pattern.
- Constraint in app logic (not DB): a proposal must have `client_id` OR `prospect_name`.

## Admin side (`/admin/proposals`)

- **Sidebar** (`src/components/ui/Sidebar.tsx`): remove `soon: true` from Proposals.
- **List page** — Finances-style: DataTable/Table primitives, columns: Proposal #, Recipient
  (client company OR prospect name+company), Title, Total (excl. VAT display consistent with
  quotes), Status Pill (`draft` neutral / `sent` contacted / `accepted` converted /
  `declined` danger), Created. Mobile: stacked cards (`sm:hidden` card list + `hidden
  sm:block` table — the established pattern).
- **Create/Edit form** — dedicated pages (`/admin/proposals/new`, `/admin/proposals/[id]/edit`),
  NOT a modal (the sections builder is too tall); field/input styling consistent with `QuoteForm.tsx`:
  - Recipient selector: existing client dropdown **or** "New prospect" toggle revealing
    name/company/email inputs.
  - Title, intro (textarea), repeatable **sections** builder (heading + bullet lines,
    add/remove/reorder by sort), line items (description/qty/rate — reuse
    `calcLineAmount`/`calcSubtotal` from `src/lib/invoices/calculations.ts`), terms
    (textarea), valid-until (date input).
  - Editable while `draft` or `sent`; locked (read-only view) once accepted/declined.
- **Detail view/modal** — full preview + actions:
  - **Copy share link** (`https://arqudportal.co.za/p/<token>`) — always available.
  - Mark Sent (draft→sent), Mark Declined (manual, with optional reason).
  - After accepted: shows acceptance record (name, timestamp) and conversion path:
    - if prospect: **Create client** → inserts `clients` row from prospect fields, sets
      `client_id` (button then disappears);
    - **Convert to Invoice** (enabled once `client_id` set) → creates a draft invoice +
      line items via the existing invoice creation/numbering code, stamps
      `converted_to_invoice_id`, shows "Invoiced" like quotes do.
  - Delete (any status, confirm; nulls nothing else — invoices keep existing).
- **Server actions** — new `src/app/admin/proposals/actions.ts` following
  `admin/finances/actions.ts` exactly: `requireAdmin()` guard, admin client, explicit child
  row handling, `revalidatePath("/admin/proposals")` plus `revalidatePath("/p/[token]", "page")`
  so the public page reflects edits/acceptance immediately.

## Public page (`/p/[token]`)

- Server component; fetches by `share_token` with the admin client. Unknown token → tasteful
  404. Must be reachable **without auth** — verify `src/proxy.ts` / any middleware does not
  gate non-`/admin`,`/client` routes (public precedent: `/wewash`, `/api/leads/webhook`).
- Sets `first_viewed_at` on first load while status is `sent` (fire-and-forget update).
- **This page is ARQUD's face to prospects — design quality is the point.** Per Morne's
  standing rule, the implementer MUST consult the `ui-ux-pro-max` skill for this page's
  design pass. Constraints: the portal's existing identity is authoritative — dark
  `#0b0b0c`/panel gradients, gold `#c8a96e`, Cormorant Garamond display + Jost body, the
  luxury-minimal look of `/wewash`. Structure: ARQUD wordmark header → title + client/
  prospect name → intro → scope sections → pricing table with total → terms → validity →
  acceptance block. Fully responsive; most recipients open it on a phone.
- Root layout metadata already sets global noindex; the page needs no extra SEO handling.
- **Acceptance block** (client component + server action):
  - status `sent` + within `valid_until` (when set): typed full-name input (required,
    min 2 words is NOT required — accept any non-empty trimmed name ≥ 3 chars) + Accept
    button → server action re-validates status/date server-side, records
    `accepted_by_name/accepted_at/accepted_ip` (IP from `x-forwarded-for` first hop),
    flips status, sends the notification email, revalidates. Success state: "Accepted by
    <name> on <date SAST>" replaces the form (also what accepted proposals render).
  - Quiet "Decline" text-link → optional one-line reason → sets declined.
  - status `draft`: page renders a discreet "preview" watermark line for Morne; acceptance
    hidden.
  - past `valid_until`: acceptance disabled with a friendly "this proposal has expired —
    contact Morne@arqud.com" line.
- **Accept notification email** — reuse the guarded Resend pattern +
  `getResendApiKey()` (env → app_settings fallback). Recipient: app_settings key
  `proposal_notify_email`, defaulting to `Morne@arqud.com` when unset. Subject:
  `Proposal accepted — <title> — <recipient>`. Dark/gold template consistent with
  `notify.ts`. Send failure must never break acceptance (same silent-guard + reason
  logging contract as `[leads/notify]`).

## Security

- `share_token`: 32 hex chars from `crypto.getRandomValues` (16 bytes) — unguessable,
  no enumeration route, unique index.
- Accept action: idempotent (second submit on an accepted proposal is a no-op returning
  the accepted state), server-side revalidation of status + date, length-capped inputs
  (`accepted_by_name` ≤ 120 chars, reason ≤ 300), all values trimmed; lead-style HTML
  escaping anywhere recipient-supplied text is interpolated into email HTML.
- No secrets in the page; service-role stays server-side (standard app posture).

## Testing (vitest; baseline 102 must stay green)

- Token generator: length/charset/uniqueness-shape.
- Accept rules (pure helpers): draft → not acceptable; sent+in-date → acceptable;
  past valid_until → not; accepted → idempotent no-op.
- Section/pricing math: totals reuse `calculations.ts` (no reimplementation — test only
  the proposal-side aggregation glue).
- Notification email builder: subject/html contain title + recipient; escaping test.
- Prospect→client mapping: fields carried over correctly.

## Verification & rollout

1. `npx tsc --noEmit`, `npx eslint` on touched files, `npm run test` — all clean/green.
2. `npm run build` must pass (new routes).
3. PR against `main` (branch `proposals`); Morne merges.
4. **Morne runs `20260711_proposals.sql` in Supabase** (feature 404s harmlessly on the
   public page and shows an empty admin list until then; document this in the PR).
5. Smoke: create a test proposal to a fake prospect → copy link → open logged-out
   (incognito) → accept with a test name → email arrives → Create client → Convert to
   Invoice → delete test data.
