-- ARQUD Portal — Phase 1 initial schema
-- Tables: profiles, clients, campaigns, invoices, files, reports
-- A 'profiles' row mirrors each auth.users row with a role and (for clients) client_id.

-- =========================
-- profiles (admin or client)
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'client')),
  client_id uuid,
  full_name text,
  created_at timestamptz not null default now()
);

-- ========
-- clients
-- ========
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  subdomain_slug text not null unique,
  meta_ad_account_id text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

-- ==========
-- campaigns
-- ==========
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  meta_campaign_id text,
  name text not null,
  leads integer not null default 0,
  cpl numeric(12, 2) not null default 0,
  spend numeric(12, 2) not null default 0,
  reach integer not null default 0,
  ctr numeric(6, 4) not null default 0,
  synced_at timestamptz
);

create index campaigns_client_id_idx on public.campaigns(client_id);

-- =========
-- invoices
-- =========
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_number text not null unique,
  description text,
  amount numeric(12, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  issue_date date not null,
  due_date date not null,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index invoices_client_id_idx on public.invoices(client_id);

-- ======
-- files
-- ======
create table public.files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  category text not null check (category in ('brand_assets', 'contracts', 'reports', 'ad_creatives', 'other')),
  storage_path text not null,
  shared_with_client boolean not null default false,
  uploaded_at timestamptz not null default now()
);

create index files_client_id_idx on public.files(client_id);

-- ========
-- reports
-- ========
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  period text not null,
  pdf_url text not null,
  created_at timestamptz not null default now()
);

create index reports_client_id_idx on public.reports(client_id);

-- ========================
-- Row Level Security (RLS)
-- ========================
alter table public.profiles  enable row level security;
alter table public.clients   enable row level security;
alter table public.campaigns enable row level security;
alter table public.invoices  enable row level security;
alter table public.files     enable row level security;
alter table public.reports   enable row level security;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: which client_id does the caller belong to?
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- profiles: a user sees their own profile; admin sees all
create policy "profiles: self or admin can read"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: admin can write"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- clients: admin full access; client reads own row only
create policy "clients: admin full access"
  on public.clients for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "clients: client can read own"
  on public.clients for select
  using (id = public.current_client_id());

-- Per-client RLS for the four data tables
create policy "campaigns: admin or owning client"
  on public.campaigns for select
  using (public.is_admin() or client_id = public.current_client_id());

create policy "campaigns: admin can write"
  on public.campaigns for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "invoices: admin or owning client"
  on public.invoices for select
  using (public.is_admin() or client_id = public.current_client_id());

create policy "invoices: admin can write"
  on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "files: admin or owning client (when shared)"
  on public.files for select
  using (
    public.is_admin()
    or (client_id = public.current_client_id() and shared_with_client = true)
  );

create policy "files: admin can write"
  on public.files for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "reports: admin or owning client"
  on public.reports for select
  using (public.is_admin() or client_id = public.current_client_id());

create policy "reports: admin can write"
  on public.reports for all
  using (public.is_admin())
  with check (public.is_admin());
