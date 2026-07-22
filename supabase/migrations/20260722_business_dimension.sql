-- Business dimension — one legal entity (ARQUD (PTY) LTD), two customer-facing
-- businesses (ARQUD marketing agency + SA Equipment machinery dealer) that share
-- ONE ledger. Adds a `business` tag to the document + party tables so each record
-- renders and reports under its business, while invoice/quote numbering stays a
-- single global sequence (no numbering change — just the tag).
--
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- CARRIED, NOT APPLIED by the app. Apply it during the cutover window, and only
-- then merge the switcher PR. It is additive and every column defaults to
-- 'arqud', so existing rows back-fill to ARQUD and any code that does not yet set
-- a business keeps producing ARQUD rows — behaviour is unchanged until the
-- switcher ships.

-- =============================================
-- 1. Businesses lookup (data-driven; a third business is a row, not a type change)
-- =============================================
create table if not exists public.businesses (
  key          text primary key,               -- 'arqud' | 'sa_equipment'
  name         text not null,
  legal_footer text not null,                   -- Companies Act 71 of 2008 s32(4) line
  is_active    boolean not null default true,
  sort_order   integer not null default 0
);

insert into public.businesses (key, name, legal_footer, sort_order) values
  ('arqud',        'ARQUD',        'Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07', 0),
  ('sa_equipment', 'SA Equipment', 'ARQUD (PTY) LTD · Reg. 2025/074398/07 · trading as SA Equipment', 1)
on conflict (key) do nothing;

-- =============================================
-- 2. Tag the document + party tables. default 'arqud' back-fills every existing row.
-- =============================================
alter table public.invoices  add column if not exists business text not null default 'arqud' references public.businesses(key);
alter table public.quotes    add column if not exists business text not null default 'arqud' references public.businesses(key);
alter table public.proposals add column if not exists business text not null default 'arqud' references public.businesses(key);
alter table public.clients   add column if not exists business text not null default 'arqud' references public.businesses(key);

create index if not exists idx_invoices_business  on public.invoices(business);
create index if not exists idx_quotes_business    on public.quotes(business);
create index if not exists idx_proposals_business on public.proposals(business);
create index if not exists idx_clients_business   on public.clients(business);

-- Note: document_sequences and transactions are intentionally NOT touched —
-- numbering is one global sequence, and there is one bank account.

-- =============================================
-- 3. RLS — businesses readable by any authenticated user; admin-only writes.
--    (Reuses the existing public.is_admin() helper from 0001_initial_schema.sql.)
-- =============================================
alter table public.businesses enable row level security;

drop policy if exists businesses_read on public.businesses;
create policy businesses_read on public.businesses
  for select using (true);

drop policy if exists businesses_admin on public.businesses;
create policy businesses_admin on public.businesses
  for all using (public.is_admin()) with check (public.is_admin());
