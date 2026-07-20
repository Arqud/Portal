-- Booking outcomes: Duan's side POSTs booking lifecycle events (booked / showed /
-- no_show / cancelled / rescheduled) back to us per lead. This stores the full
-- event ledger plus fast-read denormalized fields on public.leads.
-- Run in Supabase SQL Editor → Dashboard > SQL Editor > New query.
-- MUST be applied to the prod DB BEFORE this code is deployed.

-- =============================================
-- 1. Booking events ledger
-- =============================================
create table if not exists public.booking_events (
  id           uuid        primary key default gen_random_uuid(),
  lead_id      uuid        not null references public.leads(id) on delete cascade,
  outcome      text        not null
    check (outcome in ('booked', 'showed', 'no_show', 'cancelled', 'rescheduled')),
  occurred_at  timestamptz not null,  -- when the outcome happened on Duan's side
  booking_time timestamptz,           -- the appointment slot itself, when known
  booking_id   text,                  -- Duan's/HighLevel's booking reference, when known
  raw          jsonb,                 -- the delivered payload verbatim, for audit/debug
  created_at   timestamptz not null default now()
);

-- Idempotency: Duan retries on failure, so the same event may be delivered more
-- than once. The endpoint treats a violation of this index (23505) as a
-- harmless duplicate, never an error.
create unique index if not exists booking_events_lead_outcome_occurred_key
  on public.booking_events(lead_id, outcome, occurred_at);

-- =============================================
-- 2. Denormalized latest-state on leads
-- =============================================
-- Fast reads for the CRM without joining the ledger. Deliberately SEPARATE from
-- leads.status — that column is managed manually by the CRM workflow and this
-- feature must never touch it.
alter table public.leads add column if not exists booking_status     text;
alter table public.leads add column if not exists booking_time       timestamptz;
alter table public.leads add column if not exists booking_updated_at timestamptz;

-- =============================================
-- 3. RLS
-- =============================================
-- RLS on with NO policies: anon/authenticated roles are locked out entirely.
-- All access is server-side via the service-role admin client (which bypasses
-- RLS). Unlike public.leads there is no client-portal read here — the ledger
-- surfaces in the CRM only through the denormalized columns on leads, which
-- already carry the leads-table policies.
alter table public.booking_events enable row level security;
