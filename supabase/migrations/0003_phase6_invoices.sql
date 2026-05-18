-- Phase 6: Invoice & Quote system
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- =============================================
-- 1. Extend invoices table
-- =============================================
alter table public.invoices
  add column if not exists subtotal    numeric(12,2) not null default 0,
  add column if not exists vat_rate    numeric(5,2)  not null default 15.00,
  add column if not exists vat_amount  numeric(12,2) not null default 0,
  add column if not exists terms       text          not null default '14 Days',
  add column if not exists notes       text,
  add column if not exists paid_at     timestamptz,
  add column if not exists converted_from_quote_id uuid;

-- Allow 'draft' status on invoices
alter table public.invoices
  drop constraint if exists invoices_status_check;

alter table public.invoices
  add constraint invoices_status_check
  check (status in ('draft', 'pending', 'paid', 'overdue'));

-- =============================================
-- 2. Extend clients table
-- =============================================
alter table public.clients
  add column if not exists contact_person text,
  add column if not exists address        text,
  add column if not exists reg_number     text,
  add column if not exists vat_number     text;

-- =============================================
-- 3. Invoice line items
-- =============================================
create table if not exists public.invoice_line_items (
  id          uuid    primary key default gen_random_uuid(),
  invoice_id  uuid    not null references public.invoices(id) on delete cascade,
  description text    not null,
  detail      text,
  rate        numeric(12,2) not null,
  quantity    numeric(8,2)  not null default 1,
  amount      numeric(12,2) not null,
  sort_order  integer not null default 0
);

create index if not exists invoice_line_items_invoice_id_idx
  on public.invoice_line_items(invoice_id);

-- =============================================
-- 4. Quotes
-- =============================================
create table if not exists public.quotes (
  id            uuid    primary key default gen_random_uuid(),
  client_id     uuid    not null references public.clients(id) on delete cascade,
  quote_number  text    not null unique,
  status        text    not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected')),
  issue_date    date    not null,
  notes         text,
  subtotal      numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  converted_to_invoice_id uuid references public.invoices(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists quotes_client_id_idx on public.quotes(client_id);

-- =============================================
-- 5. Quote line items
-- =============================================
create table if not exists public.quote_line_items (
  id          uuid    primary key default gen_random_uuid(),
  quote_id    uuid    not null references public.quotes(id) on delete cascade,
  description text    not null,
  detail      text,
  rate        numeric(12,2) not null,
  quantity    numeric(8,2)  not null default 1,
  amount      numeric(12,2) not null,
  sort_order  integer not null default 0
);

create index if not exists quote_line_items_quote_id_idx
  on public.quote_line_items(quote_id);

-- =============================================
-- 6. Document sequences (auto-numbering)
-- =============================================
create table if not exists public.document_sequences (
  type        text    not null,
  year        integer not null,
  last_number integer not null default 0,
  primary key (type, year)
);

-- Seed: invoices continue from 002, quotes start fresh
insert into public.document_sequences (type, year, last_number)
values ('invoice', 2026, 2), ('quote', 2026, 0)
on conflict (type, year) do nothing;

-- =============================================
-- 7. RLS for new tables
-- =============================================
alter table public.invoice_line_items enable row level security;
alter table public.quotes             enable row level security;
alter table public.quote_line_items   enable row level security;
alter table public.document_sequences enable row level security;

create policy "invoice_line_items: admin full"
  on public.invoice_line_items for all
  using (public.is_admin()) with check (public.is_admin());

create policy "invoice_line_items: client reads own"
  on public.invoice_line_items for select
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and i.client_id = public.current_client_id()
        and i.status != 'draft'
    )
  );

create policy "quotes: admin full"
  on public.quotes for all
  using (public.is_admin()) with check (public.is_admin());

create policy "quote_line_items: admin full"
  on public.quote_line_items for all
  using (public.is_admin()) with check (public.is_admin());

create policy "document_sequences: admin full"
  on public.document_sequences for all
  using (public.is_admin()) with check (public.is_admin());
