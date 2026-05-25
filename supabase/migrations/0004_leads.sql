-- Phase 7: Leads CRM
-- Run in Supabase SQL Editor → Dashboard > SQL Editor > New query

-- =============================================
-- 1. Leads table
-- =============================================
create table if not exists public.leads (
  id               uuid        primary key default gen_random_uuid(),
  client_id        uuid        not null references public.clients(id) on delete cascade,

  -- Meta Ad identifiers (populated by webhook)
  meta_lead_id     text        unique, -- prevents duplicate webhook deliveries
  meta_ad_id       text,
  meta_campaign_id text,
  meta_ad_name     text,
  meta_campaign_name text,

  -- Lead contact data
  full_name        text,
  phone            text,
  email            text,
  branch           text,        -- branch the lead selected in the ad form

  -- CRM status
  status           text        not null default 'new'
    check (status in ('new', 'contacted', 'converted', 'lost')),
  notes            text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists leads_client_id_idx  on public.leads(client_id);
create index if not exists leads_status_idx     on public.leads(status);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

-- =============================================
-- 2. Auto-update updated_at
-- =============================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- =============================================
-- 3. RLS
-- =============================================
alter table public.leads enable row level security;

-- Admin has full access
create policy "leads: admin full"
  on public.leads for all
  using (public.is_admin()) with check (public.is_admin());

-- Client reads + updates their own leads (status & notes only — enforced in app)
create policy "leads: client reads own"
  on public.leads for select
  using (client_id = public.current_client_id());

create policy "leads: client updates own"
  on public.leads for update
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());
